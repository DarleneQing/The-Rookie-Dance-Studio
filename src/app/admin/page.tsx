import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/server"
import { getCachedUser } from "@/lib/supabase/cached"
import Link from "next/link"
import { LogoutButton } from "@/components/profile/logout-button"
import { CourseQRScanner } from "@/components/admin/scanner/course-qr-scanner"
import { getTodaysCourses } from "./scanner/actions"
import { UserStatsDialog } from "@/components/admin/user-stats-dialog"
import { ActiveSubscriptionsDialog } from "@/components/admin/active-subscriptions-dialog"
import { TodayCheckinsDialog } from "@/components/admin/today-checkins-dialog"
import { QrCode, Users, CreditCard, Clock, GraduationCap, Calendar } from "lucide-react"

const CheckinsFinanceCard = dynamic(
  () =>
    import("@/components/admin/checkins-finance-card").then((mod) => ({
      default: mod.CheckinsFinanceCard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="relative">
        <div className="relative bg-card border border-border/60 rounded-3xl p-6 shadow-2xl overflow-hidden min-h-[200px] flex items-center justify-center">
          <div className="h-8 w-32 bg-white/20 rounded animate-pulse" />
        </div>
      </div>
    ),
  }
)

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
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden">
        <div className="absolute inset-0 z-0 bg-background" />
        <div className="relative z-10 text-center space-y-4 px-4">
          <h1 className="font-syne font-bold text-3xl text-destructive">
            Access Denied
          </h1>
          <p className="text-foreground/70 font-outfit">You must be an administrator to view this page.</p>
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

  // Fetch statistics and today's data in parallel.
  // The nine counts come from one aggregate RPC (get_admin_stats); we keep
  // the today's check-ins list query (feeds the dialog) and courses query.
  const [statsResult, todayCheckinsResult, todaysCourses] = await Promise.all([
    supabase.rpc('get_admin_stats'),
    supabase
      .from("checkins")
      .select("id, created_at, profiles!user_id(full_name)")
      .gte("created_at", todayStart)
      .lte("created_at", todayEndISO)
      .order("created_at", { ascending: false }),
    getTodaysCourses(),
  ])

  const stats = (statsResult.data ?? {}) as {
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

  const totalUsers = stats.total_users ?? 0
  const activeSubscriptions = stats.active_subscriptions ?? 0
  const todayCheckins = stats.today_checkins ?? 0
  const pendingVerifications = stats.pending_verifications ?? 0
  const adultMembers = stats.adult_members ?? 0
  const studentMembers = stats.student_members ?? 0
  const monthlySubscriptions = stats.monthly_subscriptions ?? 0
  const fiveTimesSubscriptions = stats.five_times_subscriptions ?? 0
  const tenTimesSubscriptions = stats.ten_times_subscriptions ?? 0

  const todayCheckinsData = todayCheckinsResult.data

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
    <main id="main-content" className="relative min-h-screen overflow-x-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-background" />

      {/* Content */}
      <div className="relative z-10 container max-w-md mx-auto pt-8 pb-8 px-4 space-y-6">
        {/* Statistics Section */}
        <div className="space-y-2">
          <h1 className="font-syne font-bold text-3xl text-foreground mb-4 px-2">
            Overview
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Users Stat */}
            <UserStatsDialog
              adultCount={adultMembers || 0}
              studentCount={studentMembers || 0}
            >
              <div className="relative">
                <button
                  type="button"
                  className="relative w-full bg-card border border-border/60 rounded-3xl p-5 shadow-2xl overflow-hidden text-center cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  <div className="flex justify-center mb-3">
                    <div className="bg-orange-500/80 rounded-full p-3">
                      <Users className="h-6 w-6 text-warning" />
                    </div>
                  </div>
                  <div className="font-syne font-bold text-3xl text-white mb-1">{totalUsers || 0}</div>
                  <div className="font-outfit text-xs text-foreground/70 uppercase tracking-wide">Users</div>
                </button>
              </div>
            </UserStatsDialog>

            {/* Active Subscriptions Stat */}
            <ActiveSubscriptionsDialog
              monthlyCount={monthlySubscriptions || 0}
              fiveTimesCount={fiveTimesSubscriptions || 0}
              tenTimesCount={tenTimesSubscriptions || 0}
            >
              <div className="relative">
                <button
                  type="button"
                  className="relative w-full bg-card border border-border/60 rounded-3xl p-5 shadow-2xl overflow-hidden text-center cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  <div className="flex justify-center mb-3">
                    <div className="bg-rookie-blue/80 rounded-full p-3">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="font-syne font-bold text-3xl text-white mb-1">{activeSubscriptions || 0}</div>
                  <div className="font-outfit text-xs text-foreground/70 uppercase tracking-wide">Active</div>
                </button>
              </div>
            </ActiveSubscriptionsDialog>

            {/* Today's Check-ins Stat */}
            <TodayCheckinsDialog checkins={todayCheckinsList}>
              <div className="relative">
                <button
                  type="button"
                  className="relative w-full bg-card border border-border/60 rounded-3xl p-5 shadow-2xl overflow-hidden text-center cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  <div className="flex justify-center mb-3">
                    <div className="bg-rookie-pink/80 rounded-full p-3">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="font-syne font-bold text-3xl text-white mb-1">{todayCheckins || 0}</div>
                  <div className="font-outfit text-xs text-foreground/70 uppercase tracking-wide">Today</div>
                </button>
              </div>
            </TodayCheckinsDialog>
          </div>
        </div>

        {/* Navigation Cards Section */}
        <div className="space-y-2">
          <h2 className="font-syne font-bold text-3xl text-foreground mb-4 px-2">
            Admin Tools
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {/* Check-in Scanner Card */}
            <CourseQRScanner todaysCourses={todaysCourses}>
              <div className="relative">
                <button
                  type="button"
                  className="relative w-full bg-card border border-border/60 rounded-3xl p-6 shadow-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-gradient-to-br from-rookie-purple to-rookie-blue rounded-full p-4">
                      <QrCode className="h-8 w-8 text-white" />
                    </div>
                    <div className="w-full font-syne font-bold text-2xl text-foreground">
                      Course Check-in Scanner
                    </div>
                    <p className="text-foreground/80 font-outfit text-sm">Scan QR codes for course check-ins</p>
                  </div>
                </button>
              </div>
            </CourseQRScanner>

            {/* Course Management Card */}
            <Link href="/admin/courses" className="block">
              <div className="relative">
                <div className="relative bg-card border border-border/60 rounded-3xl p-6 shadow-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-gradient-to-br from-rookie-cyan to-blue-400 rounded-full p-4">
                      <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <div className="w-full font-syne font-bold text-2xl text-foreground">
                      Course Management
                    </div>
                    <p className="text-foreground/80 font-outfit text-sm">Create and manage dance courses</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* User Management Card */}
            <Link href="/admin/users" className="block">
              <div className="relative">
                <div className="relative bg-card border border-border/60 rounded-3xl p-6 shadow-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-gradient-to-br from-rookie-pink to-rookie-purple rounded-full p-4">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <div className="w-full font-syne font-bold text-2xl text-foreground">
                      User Management
                    </div>
                    <p className="text-foreground/80 font-outfit text-sm">Manage members and subscriptions</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Student Verifications Card */}
            <Link href="/admin/verifications" className="block">
              <div className="relative">
                <div className="relative bg-card border border-border/60 rounded-3xl p-6 shadow-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full p-4 relative">
                      <GraduationCap className="h-8 w-8 text-white" />
                      {pendingVerifications && pendingVerifications > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{pendingVerifications}</span>
                        </div>
                      )}
                    </div>
                    <div className="w-full font-syne font-bold text-2xl text-foreground">
                      Student Verifications
                    </div>
                    <p className="text-foreground/80 font-outfit text-sm">
                      Review and approve student status requests
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Check-ins & Finance Card */}
            <CheckinsFinanceCard />
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
