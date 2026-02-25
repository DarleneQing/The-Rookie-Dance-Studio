import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  console.log('[auth/callback] Received params:', { 
    hasCode: !!code, 
    hasTokenHash: !!token_hash, 
    type,
    next 
  })

  if (!code && !token_hash) {
    console.error('[auth/callback] Missing code and token_hash in URL')
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  // Create redirect response
  const redirectUrl = `${origin}${next}`
  const errorUrl = `${origin}/auth/auth-code-error`
  
  let response = NextResponse.redirect(redirectUrl)
  const cookieStore = cookies()

  // Create supabase client with response cookie handler
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Handle token_hash + type (custom email template or magic link)
  if (token_hash && type) {
    console.log('[auth/callback] Attempting verifyOtp with token_hash and type:', type)
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
    
    if (error) {
      console.error('[auth/callback] verifyOtp failed:', {
        message: error?.message,
        status: error?.status,
        name: error?.name
      })
      return NextResponse.redirect(errorUrl)
    }
    
    console.log('[auth/callback] verifyOtp succeeded for user:', data.user?.id)
    return response
  }

  // Handle code (PKCE flow - default email verification)
  if (code) {
    console.log('[auth/callback] Attempting exchangeCodeForSession with code')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession failed:', {
        message: error?.message,
        status: error?.status,
        name: error?.name
      })
      return NextResponse.redirect(errorUrl)
    }
    
    console.log('[auth/callback] exchangeCodeForSession succeeded for user:', data.user?.id)
    return response
  }

  console.log('[auth/callback] No valid auth method found, redirecting to error page')
  return NextResponse.redirect(errorUrl)
}

