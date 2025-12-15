import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { FloatingElements } from "@/components/auth/floating-elements"
import { LogoutButton } from "@/components/profile/logout-button"
import { QRScannerComponent } from "@/components/admin/qr-scanner"
import { QrCode, Users, CreditCard, Clock } from "lucide-react"

export default async function AdminDashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
  }

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
        <FloatingElements />
        <div className="relative z-10 text-center space-y-4 px-4">
          <h1 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-600">
            Access Denied
          </h1>
          <p className="text-white/70 font-outfit">You must be an administrator to view this page.</p>
        </div>
      </main>
    )
  }

  // Fetch statistics
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  const { count: activeSubscriptions } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")

  // Get today's date in ISO format (YYYY-MM-DD)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)
  const todayEndISO = todayEnd.toISOString()

  const { count: todayCheckins } = await supabase
    .from("checkins")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart)
    .lte("created_at", todayEndISO)

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-black" />

      {/* Floating decorative elements */}
      <FloatingElements />

      {/* Content */}
      <div className="relative z-10 container max-w-md mx-auto pt-8 pb-8 px-4 space-y-6">
        {/* Statistics Section */}
        <div className="space-y-2">
          <h2 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-4 px-2">
            Overview
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Total Users Stat */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-lg text-center">
              <div className="flex justify-center mb-3">
                <div className="bg-orange-500/80 rounded-full p-3">
                  <Users className="h-6 w-6 text-orange-300" />
                </div>
              </div>
              <div className="font-syne font-bold text-3xl text-white mb-1">{totalUsers || 0}</div>
              <div className="font-outfit text-xs text-white/70 uppercase tracking-wide">Users</div>
            </div>

            {/* Active Subscriptions Stat */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-lg text-center">
              <div className="flex justify-center mb-3">
                <div className="bg-rookie-blue/80 rounded-full p-3">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="font-syne font-bold text-3xl text-white mb-1">{activeSubscriptions || 0}</div>
              <div className="font-outfit text-xs text-white/70 uppercase tracking-wide">Active</div>
            </div>

            {/* Today's Check-ins Stat */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-lg text-center">
              <div className="flex justify-center mb-3">
                <div className="bg-rookie-pink/80 rounded-full p-3">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="font-syne font-bold text-3xl text-white mb-1">{todayCheckins || 0}</div>
              <div className="font-outfit text-xs text-white/70 uppercase tracking-wide">Today</div>
            </div>
          </div>
        </div>

        {/* Navigation Cards Section */}
        <div className="space-y-2">
          <h2 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-4 px-2">
            Admin Tools
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {/* Check-in Scanner Card */}
            <QRScannerComponent>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
                <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-6 shadow-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-gradient-to-br from-rookie-purple to-rookie-blue rounded-full p-4">
                      <QrCode className="h-8 w-8 text-white" />
                    </div>
                    <div className="w-full font-syne font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple">
                      Check-in Scanner
                    </div>
                    <p className="text-white/80 font-outfit text-sm">Scan QR codes for class check-ins</p>
                  </div>
                </div>
              </div>
            </QRScannerComponent>

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
