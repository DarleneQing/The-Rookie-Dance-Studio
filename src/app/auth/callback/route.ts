import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  const supabase = createClient()

  // Password reset and magic link use token_hash + type (no PKCE code verifier in browser)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    // Token already used (e.g. link opened twice) — user is already verified, send to app
    const msg = error?.message?.toLowerCase() ?? ''
    if (msg.includes('already') || msg.includes('used')) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  // OAuth and email confirmation use code (PKCE)
  else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    // Code already exchanged (e.g. link opened twice or on another device) but user is verified
    if (error?.message?.toLowerCase().includes('already') || error?.message?.toLowerCase().includes('used')) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
