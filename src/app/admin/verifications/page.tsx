import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, GraduationCap } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { VerificationsTable } from "@/components/admin/verifications-table"
import { Toaster } from "sonner"
import { FloatingElementsLazy } from "@/components/auth/floating-elements-lazy"

export default async function VerificationsPage() {
  const supabase = await createClient()

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
    return redirect("/")
  }

  // Fetch profiles with pending verification status
  const { data: verifications } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, student_card_url, verification_status, created_at, dob")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false })

  const pendingCount = verifications?.length || 0

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-black" />
      
      {/* Floating decorative elements */}
      <FloatingElementsLazy />

      {/* Content */}
      <div className="relative z-10 container max-w-6xl mx-auto pt-8 pb-8 px-4">
        <div className="space-y-6">
          <div>
            <Link
              href="/admin"
              aria-label="Back to Admin"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </div>
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-rookie-purple to-rookie-pink rounded-full p-3">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-rookie-blue via-rookie-purple to-rookie-pink">
                Student Verification Requests
              </h1>
              <p className="font-outfit text-white/60 text-sm mt-1">
                {pendingCount} {pendingCount === 1 ? 'request' : 'requests'} pending review
              </p>
            </div>
          </div>

          {/* Verifications Table */}
          {verifications && verifications.length > 0 ? (
            <VerificationsTable verifications={verifications} />
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 border border-white/20 shadow-lg text-center">
              <GraduationCap className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <h3 className="font-syne font-semibold text-xl text-white/90 mb-2">
                No Pending Verifications
              </h3>
              <p className="font-outfit text-white/60 text-sm">
                All student verification requests have been processed.
              </p>
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </main>
  )
}

