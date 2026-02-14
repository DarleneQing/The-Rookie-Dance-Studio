import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCachedUser } from "@/lib/supabase/cached"
import { CourseQRScanner } from "@/components/admin/scanner/course-qr-scanner"
import { getTodaysCourses } from "./actions"

export default async function AdminScannerPage() {
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
        <div className="absolute inset-0 z-0 bg-black" />
        <div className="relative z-10 text-center space-y-4 px-4">
          <h1 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-600">
            Access Denied
          </h1>
          <p className="text-white/70 font-outfit">You must be an administrator to view this page.</p>
        </div>
      </main>
    )
  }

  // Fetch today's courses
  const todaysCourses = await getTodaysCourses()

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div className="absolute inset-0 z-0 bg-black" />

      {/* Studio Name Header */}
      <div className="relative z-10 w-full text-center pt-12 pb-8 px-4">
        <h1 className="font-syne font-bold text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-2 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
          The Rookie Dance Studio
        </h1>
      </div>

      {/* Content */}
      <div className="relative z-10 container max-w-md mx-auto py-8 px-4">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-6 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
            
            <h2 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-6 text-center">
              Course Check-in
            </h2>
            <CourseQRScanner todaysCourses={todaysCourses}>
              <button className="w-full h-14 bg-gradient-to-r from-rookie-purple to-rookie-blue hover:opacity-90 border-2 border-white/20 rounded-xl font-syne font-bold text-white text-center flex items-center justify-center transition-all duration-300 transform hover:scale-[1.02] shadow-lg">
                Open Scanner
              </button>
            </CourseQRScanner>
          </div>
        </div>
      </div>
    </main>
  )
}

