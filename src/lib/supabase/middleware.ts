import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    await supabase.auth.getUser()
  } catch {
    // Invalid refresh token (e.g. after password reset, expired, or revoked).
    // Clear auth cookies and redirect to login so the user can sign in again.
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    response = NextResponse.redirect(redirectUrl)
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith('sb-')) {
        response.cookies.set(name, '', { maxAge: 0, path: '/' })
      }
    })
  }

  return response
}

