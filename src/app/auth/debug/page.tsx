import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function AuthDebugPage() {
  const supabase = createClient()
  const cookieStore = cookies()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  
  const allCookies = cookieStore.getAll()
  const authCookies = allCookies.filter(c => c.name.startsWith('sb-'))

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-rookie-pink">Auth Debug Info</h1>
        
        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-rookie-blue">User Info</h2>
            {error ? (
              <div className="text-red-400">Error: {error.message}</div>
            ) : user ? (
              <pre className="text-sm overflow-auto">
                {JSON.stringify({
                  id: user.id,
                  email: user.email,
                  email_confirmed_at: user.email_confirmed_at,
                  created_at: user.created_at,
                  last_sign_in_at: user.last_sign_in_at,
                  role: user.role,
                  user_metadata: user.user_metadata,
                }, null, 2)}
              </pre>
            ) : (
              <div className="text-white/60">No user logged in</div>
            )}
          </div>

          {/* Session Info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-rookie-blue">Session Info</h2>
            {session ? (
              <pre className="text-sm overflow-auto">
                {JSON.stringify({
                  access_token: session.access_token.substring(0, 20) + '...',
                  refresh_token: session.refresh_token.substring(0, 20) + '...',
                  expires_at: session.expires_at,
                  expires_in: session.expires_in,
                  user_id: session.user?.id,
                }, null, 2)}
              </pre>
            ) : (
              <div className="text-white/60">No active session</div>
            )}
          </div>

          {/* Cookies Info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-rookie-blue">Auth Cookies</h2>
            {authCookies.length > 0 ? (
              <div className="space-y-2">
                {authCookies.map((cookie) => (
                  <div key={cookie.name} className="text-sm">
                    <span className="text-rookie-cyan">{cookie.name}:</span>{' '}
                    <span className="text-white/60">
                      {cookie.value.substring(0, 30)}...
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/60">No auth cookies found</div>
            )}
          </div>

          {/* Environment Info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-rookie-blue">Environment</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-rookie-cyan">NEXT_PUBLIC_SUPABASE_URL:</span>{' '}
                <span className="text-white/60">{process.env.NEXT_PUBLIC_SUPABASE_URL}</span>
              </div>
              <div>
                <span className="text-rookie-cyan">NEXT_PUBLIC_SITE_URL:</span>{' '}
                <span className="text-white/60">
                  {process.env.NEXT_PUBLIC_SITE_URL || 'Not set (will default to http://localhost:3000)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a 
            href="/login" 
            className="inline-block px-6 py-3 bg-rookie-purple text-white rounded-lg hover:bg-rookie-purple/80 transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    </main>
  )
}
