import { cache } from 'react'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/cached'

/**
 * Server-side admin gate for server actions.
 *
 * Call at the top of every admin-only action and PII read. Do NOT rely on RLS
 * alone for authorization — the SQL layer is the backstop, but the TS layer
 * must fail closed on its own so a future RLS change cannot silently open an
 * action (see docs/audit-findings-by-severity.md P1 "defense-in-depth").
 *
 * Returns the admin's user id when the current session belongs to an admin,
 * otherwise null. Each caller maps null to its own error shape. Fails closed:
 * no user, no profile row, or a failed profile query all return null.
 *
 * Request-scoped via React cache(): a page and the actions it renders share
 * one Auth call and one profile lookup. cache() never shares results across
 * requests (outside a request it simply re-runs), so one user's answer cannot
 * leak into another's.
 */
export const requireAdmin = cache(async (): Promise<{ id: string } | null> => {
  const user = await getCachedUser()
  if (!user) return null

  const profile = await getCachedProfile(user.id)
  if (profile?.role !== 'admin') return null

  return { id: user.id }
})
