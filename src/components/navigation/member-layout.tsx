import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MemberBottomNav } from './member-bottom-nav'

interface MemberLayoutProps {
  children: React.ReactNode
}

// Helper function for className
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export async function MemberLayout({ children }: MemberLayoutProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Check user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

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
