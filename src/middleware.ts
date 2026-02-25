import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_ROUTES = [
  '/',
  '/courses',
  '/login',
  '/register',
  '/faq',
  '/terms',
  '/privacy',
  '/verify-email',
  '/reset-password',
  '/auth/callback', // Code exchange for OAuth, email confirmation, password reset
  '/auth/auth-code-error', // Error page for failed verification
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  if (isPublicRoute) {
    return NextResponse.next({ request: { headers: request.headers } })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

