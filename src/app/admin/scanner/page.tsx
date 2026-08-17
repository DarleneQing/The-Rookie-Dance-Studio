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

  // Fetch today's courses
  const todaysCourses = await getTodaysCourses()

  return (
    <main id="main-content" className="relative min-h-screen overflow-x-hidden">
      <div className="absolute inset-0 z-0 bg-background" />

      {/* Studio Name Header */}
      <div className="relative z-10 w-full text-center pt-12 pb-8 px-4">
        <p className="font-syne font-bold text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-blue mb-2">
          The Rookie Dance Studio
        </p>
      </div>

      {/* Content */}
      <div className="relative z-10 container max-w-md mx-auto py-8 px-4">
        <div className="relative">
          <div className="relative bg-card border border-border/60 rounded-3xl p-6 shadow-2xl overflow-hidden">
            
            <h1 className="font-syne font-bold text-3xl text-foreground mb-6 text-center">
              Course Check-in
            </h1>
            <CourseQRScanner todaysCourses={todaysCourses}>
              <button className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-syne font-bold text-center flex items-center justify-center transition-colors duration-300 shadow-lg">
                Open Scanner
              </button>
            </CourseQRScanner>
          </div>
        </div>
      </div>
    </main>
  )
}

