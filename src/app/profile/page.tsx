import { redirect } from 'next/navigation'

import { MemberLayout } from '@/components/navigation/member-layout'
import { PrefetchRoutes } from '@/components/navigation/prefetch-routes'
import { ProfileDashboard } from '@/components/profile/profile-dashboard'
import type { CheckinHistoryItem } from '@/components/profile/checkin-history-dialog'
import type { SubscriptionHistoryItem } from '@/components/profile/subscription-history-dialog'
import { getCachedProfile, getCachedUser } from '@/lib/supabase/cached'
import { createClient } from '@/lib/supabase/server'
import { calculateStreakWeeks } from '@/lib/utils/streak-calculator'
import { getZurichToday } from '@/lib/utils/date-helpers'
import { usableSubscriptionFilter } from '@/lib/utils/subscription-helpers'

export default async function ProfilePage() {
  const user = await getCachedUser()

  if (!user) {
    return redirect('/login')
  }

  const supabase = createClient()
  const today = getZurichToday()

  const [
    profile,
    { data: subscription },
    { data: checkins },
    { data: checkinHistoryData },
    { data: subscriptionsData },
    { data: checkinsBySubData },
  ] = await Promise.all([
    getCachedProfile(user.id),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .or(usableSubscriptionFilter(today))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('checkins')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('checkins')
      .select(`
        id,
        created_at,
        subscription_id,
        booking_type,
        subscription:subscriptions(type),
        course:courses(
          id,
          dance_style,
          scheduled_date,
          start_time,
          song,
          singer,
          instructor:profiles!courses_instructor_id_fkey(id, full_name, avatar_url)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('subscriptions')
      .select(
        `
        id,
        type,
        status,
        start_date,
        end_date,
        total_credits,
        remaining_credits,
        created_at
      `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('checkins')
      .select('subscription_id')
      .eq('user_id', user.id),
  ])

  if (!profile) {
    return redirect('/login')
  }

  type CheckinSubscriptionRow = { subscription_id: string }

  const checkinCountBySubscriptionId = (checkinsBySubData || []).reduce<
    Record<string, number>
  >((counts, row) => {
    const id = (row as CheckinSubscriptionRow).subscription_id
    counts[id] = (counts[id] || 0) + 1
    return counts
  }, {})

  const subscriptionHistory: SubscriptionHistoryItem[] = (subscriptionsData || []).map(
    (historyItem) => ({
      ...historyItem,
      checkin_count: checkinCountBySubscriptionId[historyItem.id] || 0,
    }),
  )

  return (
    <MemberLayout>
      <PrefetchRoutes routes={['/courses', '/settings']} />
      <ProfileDashboard
        userId={user.id}
        profile={{
          fullName: profile.full_name || 'User',
          avatarUrl: profile.avatar_url,
          memberType: profile.member_type,
          role: profile.role,
          verificationStatus: profile.verification_status,
        }}
        subscription={subscription}
        totalClasses={checkins?.length || 0}
        streakWeeks={calculateStreakWeeks(checkins || [])}
        checkins={(checkinHistoryData || []) as CheckinHistoryItem[]}
        subscriptionHistory={subscriptionHistory}
      />
    </MemberLayout>
  )
}
