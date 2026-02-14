import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCachedUser } from "@/lib/supabase/cached"
import Link from "next/link"
import { FloatingElementsLazy } from "@/components/auth/floating-elements-lazy"
import { LogoutButton } from "@/components/profile/logout-button"
import { CourseQRScanner } from "@/components/admin/scanner/course-qr-scanner"
import { getTodaysCourses } from "./scanner/actions"
import { UserStatsDialog } from "@/components/admin/user-stats-dialog"
import { ActiveSubscriptionsDialog } from "@/components/admin/active-subscriptions-dialog"
import { TodayCheckinsDialog } from "@/components/admin/today-checkins-dialog"
import { CheckinHistoryCard } from "@/components/admin/checkin-history-card"
import { QrCode, Users, CreditCard, Clock, GraduationCap, Calendar } from "lucide-react"

export default async function AdminDashboardPage() {
  const user = await getCachedUser()

  if (!user) {
    return redirect("/login")
  }

  const supabase = createClient()

  // Check if admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-black" />
        <FloatingElementsLazy />
        <div className="relative z-10 text-center space-y-4 px-4">
          <h1 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-600">
            Access Denied
          </h1>
          <p className="text-white/70 font-outfit">You must be an administrator to view this page.</p>
        </div>
      </main>
    )
  }

  // Get today's date in ISO format (YYYY-MM-DD)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)
  const todayEndISO = todayEnd.toISOString()

  // Fetch statistics and today's data in parallel
  const [
    { count: totalUsers },
    { count: activeSubscriptions },
    { count: todayCheckins },
    { count: pendingVerifications },
    { count: adultMembers },
    { count: studentMembers },
    { count: monthlySubscriptions },
    { count: fiveTimesSubscriptions },
    { count: tenTimesSubscriptions },
    { data: todayCheckinsData },
    todaysCourses,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("checkins")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart)
      .lte("created_at", todayEndISO),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("member_type", "adult"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("member_type", "student"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("type", "monthly"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("type", "5_times"),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("type", "10_times"),
    supabase
      .from("checkins")
      .select("id, created_at, profiles!user_id(full_name)")
      .gte("created_at", todayStart)
      .lte("created_at", todayEndISO)
      .order("created_at", { ascending: false }),
    getTodaysCourses(),
  ])

  // Transform today's check-ins data
  type CheckinWithProfile = {
    id: string
    created_at: string
    profiles: { full_name: string | null } | { full_name: string | null }[] | null
  }

  const todayCheckinsList =
    todayCheckinsData?.map((item: CheckinWithProfile) => {
      const profile = item.profiles
      return {
        id: item.id,
        full_name:
          profile && !Array.isArray(profile)
            ? profile.full_name
            : Array.isArray(profile) && profile[0]
            ? profile[0].full_name
            : null,
        created_at: item.created_at,
      }
    }) || []

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-black" />

      {/* Floating decorative elements */}
      <FloatingElementsLazy />

      {/* Content */}
      <div className="relative z-10 container max-w-md mx-auto pt-8 pb-8 px-4 space-y-6">
        {/* Statistics Section */}
        <div className="space-y-2">
          <h2 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-4 px-2">
            Overview
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Total Users Stat */}
            <UserStatsDialog
              adultCount={adultMembers || 0}
              studentCount={studentMembers || 0}
            >
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 to-orange-600 opacity-20 blur-xl rounded-3xl" />
                <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-2xl overflow-hidden text-center cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                  <div className="flex justify-center mb-3">
                    <div className="bg-orange-500/80 rounded-full p-3">
                      <Users className="h-6 w-6 text-orange-300" />
                    </div>
                  </div>
                  <div className="font-syne font-bold text-3xl text-white mb-1">{totalUsers || 0}</div>
                  <div className="font-outfit text-xs text-white/70 uppercase tracking-wide">Users</div>
                </div>
              </div>
            </UserStatsDialog>

            {/* Active Subscriptions Stat */}
            <ActiveSubscriptionsDialog
              monthlyCount={monthlySubscriptions || 0}
              fiveTimesCount={fiveTimesSubscriptions || 0}
              tenTimesCount={tenTimesSubscriptions || 0}
            >
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-rookie-blue to-blue-500 opacity-20 blur-xl rounded-3xl" />
                <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-2xl overflow-hidden text-center cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                  <div className="flex justify-center mb-3">
                    <div className="bg-rookie-blue/80 rounded-full p-3">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="font-syne font-bold text-3xl text-white mb-1">{activeSubscriptions || 0}</div>
                  <div className="font-outfit text-xs text-white/70 uppercase tracking-wide">Active</div>
                </div>
              </div>
            </ActiveSubscriptionsDialog>

            {/* Today's Check-ins Stat */}
            <TodayCheckinsDialog checkins={todayCheckinsList}>
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-rookie-pink to-pink-500 opacity-20 blur-xl rounded-3xl" />
                <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-2xl overflow-hidden text-center cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                  <div className="flex justify-center mb-3">
                    <div className="bg-rookie-pink/80 rounded-full p-3">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="font-syne font-bold text-3xl text-white mb-1">{todayCheckins || 0}</div>
                  <div className="font-outfit text-xs text-white/70 uppercase tracking-wide">Today</div>
                </div>
              </div>
            </TodayCheckinsDialog>
          </div>
        </div>

        {/* Navigation Cards Section */}
        <div className="space-y-2">
          <h2 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-4 px-2">
            Admin Tools
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {/* Check-in Scanner Card */}
            <CourseQRScanner todaysCourses={todaysCourses}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
                <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-6 shadow-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-gradient-to-br from-rookie-purple to-rookie-blue rounded-full p-4">
                      <QrCode className="h-8 w-8 text-white" />
                    </div>
                    <div className="w-full font-syne font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple">
                      Course Check-in Scanner
                    </div>
                    <p className="text-white/80 font-outfit text-sm">Scan QR codes for course check-ins</p>
                  </div>
                </div>
              </div>
            </CourseQRScanner>

            {/* Course Management Card */}
            <Link href="/admin/courses" className="block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-rookie-cyan to-blue-400 opacity-20 blur-2xl rounded-[30px]" />
                <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-6 shadow-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-gradient-to-br from-rookie-cyan to-blue-400 rounded-full p-4">
                      <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <div className="w-full font-syne font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-cyan to-blue-300">
                      Course Management
                    </div>
                    <p className="text-white/80 font-outfit text-sm">Create and manage dance courses</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* User Management Card */}
            <Link href="/admin/users" className="block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-rookie-pink to-rookie-purple opacity-20 blur-2xl rounded-[30px]" />
                <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-6 shadow-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-gradient-to-br from-rookie-pink to-rookie-purple rounded-full p-4">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <div className="w-full font-syne font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple">
                      User Management
                    </div>
                    <p className="text-white/80 font-outfit text-sm">Manage members and subscriptions</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Student Verifications Card */}
            <Link href="/admin/verifications" className="block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-yellow-500 to-orange-500 opacity-20 blur-2xl rounded-[30px]" />
                <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-6 shadow-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full p-4 relative">
                      <GraduationCap className="h-8 w-8 text-white" />
                      {pendingVerifications && pendingVerifications > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{pendingVerifications}</span>
                        </div>
                      )}
                    </div>
                    <div className="w-full font-syne font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-300 to-orange-300">
                      Student Verifications
                    </div>
                    <p className="text-white/80 font-outfit text-sm">
                      Review and approve student status requests
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Check-in History Card */}
            <CheckinHistoryCard />
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-4">
          <LogoutButton />
        </div>
      </div>
    </main>
  )
}
