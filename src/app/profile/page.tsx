import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { QRCodeDisplay } from "@/components/profile/qr-code-display"
import { LogoutButton } from "@/components/profile/logout-button"
import { FloatingElements } from "@/components/auth/floating-elements"
import { QrCode, Monitor, Clock, Heart, Calendar, ArrowRight, Pencil, Zap } from "lucide-react"

export default async function ProfilePage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
  }

  // Fetch Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Fetch Active Subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  // Fetch checkins for statistics
  const { data: checkins } = await supabase
    .from("checkins")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Calculate statistics
  const totalClasses = checkins?.length || 0
  
  // Calculate streak days (consecutive days with check-ins)
  let streakDays = 0
  if (checkins && checkins.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let currentStreak = 0
    const checkDate = new Date(today)
    
    for (const checkin of checkins) {
      const checkinDate = new Date(checkin.created_at)
      checkinDate.setHours(0, 0, 0, 0)
      
      if (checkinDate.getTime() === checkDate.getTime()) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (checkinDate.getTime() < checkDate.getTime()) {
        break
      }
    }
    streakDays = currentStreak
  }

  const userInitials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "UR"

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/k-pop-dance-open-class.webp"
          alt="K-Pop Dance Open Class"
          fill
          className="object-cover"
          quality={90}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Floating decorative elements */}
      <FloatingElements />

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
            {/* Edit Icon */}
            <button className="absolute bottom-0 right-0 bg-rookie-pink rounded-lg p-2 border-2 border-white/20 shadow-lg hover:scale-110 transition-transform">
              <Pencil className="h-4 w-4 text-white" />
            </button>
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
          
          {subscription ? (
            <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-green-500/80 text-white text-xs font-bold px-2.5 py-1 rounded-full font-outfit">
                      ACTIVE
                    </span>
                  </div>
                  <h4 className="font-syne font-bold text-xl text-white mb-1">
                    {subscription.type === "monthly" 
                      ? "Monthly Pass" 
                      : subscription.type === "5_times" 
                      ? "5-Class Pass" 
                      : "10-Class Pass"}
                  </h4>
                  {subscription.type === "monthly" ? (
                    <p className="text-white/60 font-outfit text-sm">
                      Valid until {new Date(subscription.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  ) : (
                    <p className="text-white/60 font-outfit text-sm">
                      Valid until Dec 31, 2024
                    </p>
                  )}
                </div>
                <div className="bg-gradient-to-br from-rookie-purple to-rookie-blue rounded-full p-3">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
              
              {subscription.type !== "monthly" && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/70 font-outfit text-sm">Sessions Left</span>
                    <span className="font-syne font-bold text-rookie-purple">
                      {subscription.remaining_credits} / {subscription.total_credits}
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-rookie-purple to-rookie-pink rounded-full transition-all duration-300"
                      style={{ width: `${(subscription.remaining_credits / subscription.total_credits) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-lg text-center">
              <p className="text-white/70 font-outfit">No active subscription found.</p>
            </div>
          )}
        </div>

        {/* 4. Activity Statistics Section */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Classes Card */}
          <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-lg text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-orange-500/80 rounded-full p-3">
                <Clock className="h-6 w-6 text-orange-300" />
              </div>
            </div>
            <div className="font-syne font-bold text-3xl text-white mb-1">{totalClasses}</div>
            <div className="font-outfit text-xs text-white/70 uppercase tracking-wide">Total Classes</div>
          </div>

          {/* Streak Days Card */}
          <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-lg text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-rookie-pink/80 rounded-full p-3">
                <Heart className="h-6 w-6 text-rookie-pink-200" />
              </div>
            </div>
            <div className="font-syne font-bold text-3xl text-white mb-1">{streakDays}</div>
            <div className="font-outfit text-xs text-white/60 uppercase tracking-wide">Streak</div>
          </div>
        </div>

        {/* 5. Subscription History Section */}
        <button className="w-full bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/20 shadow-lg flex items-center justify-between hover:bg-white/15 transition-colors">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-white/60" />
            <span className="font-outfit text-white/90 font-medium">Subscription History</span>
          </div>
          <ArrowRight className="h-5 w-5 text-white/60" />
        </button>

        {/* 6. Logout Button */}
        <div className="pt-2">
          <LogoutButton />
        </div>
      </div>
    </main>
  )
}

