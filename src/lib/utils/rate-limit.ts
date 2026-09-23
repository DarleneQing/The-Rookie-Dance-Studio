import { createHash } from 'crypto'
import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'

/**
 * Rate limits for auth Server Actions, enforced by the hit_rate_limit() RPC
 * (docs/migrations/2026-09-23_3_auth-rate-limits.sql).
 *
 * Needed because these actions call Supabase Auth from the server, so
 * Supabase's own per-IP limits see Vercel's IPs, not the visitor's.
 * Per-IP limits are generous because members at the studio share its Wi-Fi.
 */
export const AUTH_RATE_LIMITS = {
  login: {
    perEmail: { limit: 10, windowSeconds: 15 * 60 },
    perIp: { limit: 50, windowSeconds: 15 * 60 },
  },
  signup: {
    perEmail: { limit: 3, windowSeconds: 60 * 60 },
    perIp: { limit: 10, windowSeconds: 60 * 60 },
  },
} as const

export type RateLimitedAction = keyof typeof AUTH_RATE_LIMITS

export const RATE_LIMITED_MESSAGE = 'Too many attempts. Please wait a few minutes and try again.'

/**
 * Visitor IP. Trusts x-real-ip / x-forwarded-for because Vercel sets them
 * from the real connection; on another host these could be spoofed.
 */
function clientIp(): string {
  const h = headers()
  return h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

/** Keys hold hashes, so no raw email or IP is stored in rate_limit_buckets. */
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/**
 * Counts one attempt against both the email and the IP bucket and returns
 * true if either is exhausted.
 *
 * Fails OPEN: if the limiter errors (e.g. the migration is not applied yet)
 * the attempt is allowed and the error is logged — a broken limiter must not
 * lock every member out. Supabase Auth's own limits still apply.
 */
export async function isRateLimited(action: RateLimitedAction, email: string): Promise<boolean> {
  const supabase = createClient()
  const rules = AUTH_RATE_LIMITS[action]
  const buckets = [
    { key: `${action}:email:${sha256(email.trim().toLowerCase())}`, ...rules.perEmail },
    { key: `${action}:ip:${sha256(clientIp())}`, ...rules.perIp },
  ]

  const results = await Promise.all(
    buckets.map((bucket) =>
      supabase.rpc('hit_rate_limit', {
        p_key: bucket.key,
        p_limit: bucket.limit,
        p_window_seconds: bucket.windowSeconds,
      })
    )
  )

  // An exhausted bucket blocks even if the other bucket errored; fail-open
  // only ever covers a bucket that could not be checked.
  if (results.some((result) => result.data === false)) return true

  const failed = results.find((result) => result.error)
  if (failed) console.error('Rate limiter unavailable; allowing request:', failed.error)
  return false
}
