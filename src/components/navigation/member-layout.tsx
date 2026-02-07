import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/cached'
import { getCachedProfile } from '@/lib/supabase/cached'
import { MemberBottomNav } from './member-bottom-nav'

interface MemberLayoutProps {
  children: React.ReactNode
}

// Helper function for className
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export async function MemberLayout({ children }: MemberLayoutProps) {
  const user = await getCachedUser()

  if (!user) {
    return redirect('/login')
  }

  const profile = await getCachedProfile(user.id)

  // Only show bottom nav for non-admin users
  const showBottomNav = profile?.role !== 'admin'

  return (
    <div className="min-h-screen flex flex-col">
      <div className={cn('flex-1', showBottomNav && 'pb-20')}>
        {children}
      </div>
      {showBottomNav && <MemberBottomNav />}
    </div>
  )
}
