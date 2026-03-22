import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  // Build the success redirect response upfront so Supabase can write session
  // cookies directly onto it. Route Handlers cannot write cookies via
  // `cookies()` from next/headers (it is read-only there), so we must pass the
  // response object into the Supabase client's setAll handler instead.
  const successResponse = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            successResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Password reset and magic link use token_hash + type (no PKCE code verifier in browser)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return successResponse

    // Token already used (e.g. link opened twice) — user is already verified
    const msg = error.message.toLowerCase()
    if (msg.includes('already') || msg.includes('used')) return successResponse
  }
  // OAuth and email confirmation use code (PKCE)
  else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return successResponse

    // Code already exchanged (e.g. link opened twice or on another device)
    const msg = error.message.toLowerCase()
    if (msg.includes('already') || msg.includes('used')) return successResponse
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
