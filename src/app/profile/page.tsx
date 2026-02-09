import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCachedUser } from "@/lib/supabase/cached"
import { getCachedProfile } from "@/lib/supabase/cached"
import { FloatingElementsLazy } from "@/components/auth/floating-elements-lazy"
import { PrefetchRoutes } from "@/components/navigation/prefetch-routes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { QRCodeDisplay } from "@/components/profile/qr-code-display"
import { SubscriptionHistoryDialog, type SubscriptionHistoryItem } from "@/components/profile/subscription-history-dialog"
import { CheckinHistoryDialog } from "@/components/profile/checkin-history-dialog"
import { MemberLayout } from "@/components/navigation/member-layout"
import { QrCode, Monitor, Clock, Heart, Calendar, ArrowRight, Zap, Clock as ClockIcon } from "lucide-react"
import { calculateStreakWeeks } from "@/lib/utils/streak-calculator"

export default async function ProfilePage() {
  const user = await getCachedUser()

  if (!user) {
    return redirect("/login")
  }

  const supabase = createClient()

  // Parallelize all database queries (profile uses cache - deduped with MemberLayout)
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
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("checkins")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("checkins")
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
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("subscriptions")
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
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("checkins")
      .select("subscription_id")
      .eq("user_id", user.id),
  ])

  // Handle critical errors (profile is essential)
  if (!profile) {
    return redirect("/login")
  }

  // Non-critical errors are handled gracefully with fallback values

  type CheckinSubscriptionRow = { subscription_id: string }

  const checkinCountBySubscriptionId = (checkinsBySubData || []).reduce<
    Record<string, number>
  >((acc, row) => {
    const id = (row as CheckinSubscriptionRow).subscription_id
    acc[id] = (acc[id] || 0) + 1
    return acc
  }, {})

  const subscriptionHistory: SubscriptionHistoryItem[] = (subscriptionsData || []).map((sub) => ({
    ...sub,
    checkin_count: checkinCountBySubscriptionId[sub.id] || 0,
  }))

  // Calculate statistics
  const totalClasses = checkins?.length || 0
  const streakWeeks = calculateStreakWeeks(checkins || [])

  const userInitials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "UR"

  return (
    <MemberLayout>
      <PrefetchRoutes routes={['/courses', '/settings']} />
      <main className="relative min-h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0 bg-black" />
        <FloatingElementsLazy />

        {/* Content */}
        <div className="relative z-10 container max-w-lg mx-auto pt-8 pb-8 px-4 space-y-4">

        {/* 1. User Profile Section - Centered Avatar with Gradient Ring */}
        <div className="flex flex-col items-center pt-4 pb-6">
          <div className="relative">
            {/* Gradient Ring */}
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-rookie-purple via-rookie-pink to-rookie-blue opacity-60 blur-sm" />
            <Avatar className="relative h-24 w-24 border-4 border-transparent">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Name with Gradient */}
          <h2 className="mt-4 font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-rookie-blue via-rookie-purple to-rookie-pink">
            {profile?.full_name || "User"}
          </h2>
          
          {/* Membership Info */}
          <p className="mt-1 text-white/60 font-outfit text-sm">
            {profile?.member_type === "student" ? "Student" : "Adult"} • {profile?.role === "admin" ? "Admin" : "Member"}
          </p>
        </div>

        {/* 2. Member QR Code Section - Dark Purple Card */}
        <QRCodeDisplay userId={user.id} userName={profile?.full_name || "User"}>
          <div className="relative bg-gradient-to-br from-rookie-purple/90 to-rookie-violet/90 rounded-3xl p-6 shadow-2xl border border-white/10 cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white/20 rounded-full p-4">
                <QrCode className="h-8 w-8 text-white" />
              </div>
              <div className="w-full font-syne font-bold text-xl text-white uppercase tracking-wide">
                SHOW MEMBER QR
              </div>
              <p className="text-white/80 font-outfit text-sm">Tap for class check-in</p>
            </div>
          </div>
        </QRCodeDisplay>

        {/* 3. Current Plan Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Monitor className="h-5 w-5 text-rookie-pink" />
            <h3 className="font-syne font-semibold text-white/90">Current Plan</h3>
          </div>
          
          <div className="bg-white/80 rounded-3xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full font-outfit">
                    {subscription ? subscription.status?.toUpperCase() || "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <h4 className="font-syne font-bold text-xl text-gray-900 mb-1">
                  {subscription
                    ? subscription.type === "monthly"
                      ? "Monthly Card"
                      : subscription.type === "5_times"
                        ? "5-Times Card"
                        : subscription.type === "10_times"
                          ? "10-Times Card"
                          : subscription.type
                    : "No active plan"}
                </h4>
              </div>
              <div className="bg-gradient-to-br from-rookie-blue to-rookie-purple rounded-full p-3">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-outfit text-sm">
                  {subscription?.type === "monthly" ? "Valid Until" : "Sessions Left"}
                </span>
                <span className="font-syne font-bold text-rookie-purple">
                  {subscription
                    ? subscription.type === "monthly"
                      ? (subscription.end_date
                          ? new Date(subscription.end_date).toLocaleDateString()
                          : "N/A")
                      : (() => {
                          const remaining = subscription.remaining_credits ?? 0
                          const total =
                            subscription.type === "5_times"
                              ? 5
                              : subscription.type === "10_times"
                                ? 10
                                : subscription.remaining_credits ?? 0
                          return `${remaining} / ${total}`
                        })()
                    : "—"}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-rookie-blue to-rookie-purple rounded-full transition-all duration-300"
                  style={{
                    width: !subscription
                      ? "0%"
                      : subscription.type === "monthly"
                        ? "100%"
                        : (() => {
                            const remaining = subscription.remaining_credits ?? 0
                            const total =
                              subscription.type === "5_times"
                                ? 5
                                : subscription.type === "10_times"
                                  ? 10
                                  : subscription.remaining_credits ?? 0
                            return total > 0 ? `${(remaining / total) * 100}%` : "0%"
                          })(),
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Activity Statistics Section */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Classes Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-lg text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-orange-500/80 rounded-full p-3">
                <Clock className="h-6 w-6 text-orange-100" />
              </div>
            </div>
            <div className="font-syne font-bold text-3xl text-black mb-1">{totalClasses}</div>
            <div className="font-outfit text-xs text-black uppercase tracking-wide">Total Classes</div>
          </div>

          {/* Streak Weeks Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-lg text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-rookie-pink rounded-full p-3">
                <Heart className="h-6 w-6 text-rookie-pink-200" />
              </div>
            </div>
            <div className="font-syne font-bold text-3xl text-black mb-1">{streakWeeks}</div>
            <div className="font-outfit text-xs text-black uppercase tracking-wide">Streak</div>
          </div>
        </div>

        {/* 5. Check-in History Section */}
        <CheckinHistoryDialog checkins={checkinHistoryData || []}>
          <button className="w-full bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/20 shadow-lg flex items-center justify-between hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-5 w-5 text-white/60" />
              <span className="font-outfit text-white/90 font-medium">Course History</span>
            </div>
            <ArrowRight className="h-5 w-5 text-white/60" />
          </button>
        </CheckinHistoryDialog>

        {/* 6. Subscription History Section */}
        <SubscriptionHistoryDialog subscriptions={subscriptionHistory}>
          <button className="w-full bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/20 shadow-lg flex items-center justify-between hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-white/60" />
              <span className="font-outfit text-white/90 font-medium">Subscription History</span>
            </div>
            <ArrowRight className="h-5 w-5 text-white/60" />
          </button>
        </SubscriptionHistoryDialog>
      </div>
    </main>
    </MemberLayout>
  )
}

