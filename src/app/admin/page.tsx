import { redirect } from 'next/navigation'

import { AdminDashboard } from '@/components/admin/admin-dashboard'
import type { TodayCheckinItem } from '@/components/admin/today-checkins-dialog'
import { getCachedUser } from '@/lib/supabase/cached'
import { createClient } from '@/lib/supabase/server'
import { getTodaysCourses } from './scanner/actions'

export default async function AdminDashboardPage() {
  const user = await getCachedUser()

  if (!user) {
    return redirect('/login')
  }

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background">
        <div className="relative z-10 space-y-4 px-4 text-center">
          <h1 className="font-syne text-3xl font-bold text-destructive">Access Denied</h1>
          <p className="font-outfit text-foreground/70">
            You must be an administrator to view this page.
          </p>
        </div>
      </main>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  const [statsResult, todayCheckinsResult, todaysCourses] = await Promise.all([
    supabase.rpc('get_admin_stats'),
    supabase
      .from('checkins')
      .select('id, created_at, profiles!user_id(full_name)')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false }),
    getTodaysCourses(),
  ])

  const rawStats = (statsResult.data ?? {}) as {
    total_users?: number
    active_subscriptions?: number
    today_checkins?: number
    pending_verifications?: number
    adult_members?: number
    student_members?: number
    monthly_subscriptions?: number
    five_times_subscriptions?: number
    ten_times_subscriptions?: number
  }

  type CheckinWithProfile = {
    id: string
    created_at: string
    profiles: { full_name: string | null } | { full_name: string | null }[] | null
  }

  const todayCheckins: TodayCheckinItem[] = (todayCheckinsResult.data || []).map(
    (checkin: CheckinWithProfile) => {
      const relatedProfile = checkin.profiles
      return {
        id: checkin.id,
        full_name: Array.isArray(relatedProfile)
          ? relatedProfile[0]?.full_name || null
          : relatedProfile?.full_name || null,
        created_at: checkin.created_at,
      }
    },
  )

  return (
    <AdminDashboard
      stats={{
        totalUsers: rawStats.total_users ?? 0,
        activeSubscriptions: rawStats.active_subscriptions ?? 0,
        todayCheckins: rawStats.today_checkins ?? 0,
        pendingVerifications: rawStats.pending_verifications ?? 0,
        adultMembers: rawStats.adult_members ?? 0,
        studentMembers: rawStats.student_members ?? 0,
        monthlySubscriptions: rawStats.monthly_subscriptions ?? 0,
        fiveTimesSubscriptions: rawStats.five_times_subscriptions ?? 0,
        tenTimesSubscriptions: rawStats.ten_times_subscriptions ?? 0,
      }}
      todayCheckins={todayCheckins}
      todaysCourses={todaysCourses}
    />
  )
}
