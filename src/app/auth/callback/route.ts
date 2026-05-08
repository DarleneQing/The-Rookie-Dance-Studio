import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

function isSafeNext(next: string | null): next is string {
  return !!next && next.startsWith('/') && !next.startsWith('//')
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextParam = searchParams.get('next')
  const next = isSafeNext(nextParam) ? nextParam : '/profile'

  const errorUrl = `${origin}/auth/auth-code-error`
  const verifiedLoginUrl = `${origin}/login?verified=1`

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

  // Preferred path: token_hash + type. Works cross-device (no PKCE verifier required).
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return successResponse

    // Token already consumed (replay or email-scanner pre-fetch). If the browser
    // already has a session from a prior successful click, send to app; else login.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return successResponse
    return NextResponse.redirect(verifiedLoginUrl)
  }

  // Legacy / OAuth path: PKCE code exchange.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return successResponse

    const { data: { user } } = await supabase.auth.getUser()
    if (user) return successResponse
    // Cross-device or pre-fetched: email is verified server-side but we cannot
    // mint a session here. Send to login with a "verified" hint instead of the
    // scary error page.
    return NextResponse.redirect(verifiedLoginUrl)
  }

  return NextResponse.redirect(errorUrl)
}
