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

  if (!code && !token_hash) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  // Create redirect response
  const redirectUrl = `${origin}${next}`
  const errorUrl = `${origin}/auth/auth-code-error`
  
  const response = NextResponse.redirect(redirectUrl)
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
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    
    if (error) {
      return NextResponse.redirect(errorUrl)
    }
    
    return response
  }

  // Handle code (PKCE flow - default email verification)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      return NextResponse.redirect(errorUrl)
    }
    
    return response
  }

  return NextResponse.redirect(errorUrl)
}

