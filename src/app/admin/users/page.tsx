import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCachedUser } from "@/lib/supabase/cached"
import { UsersTable } from "@/components/admin/users-table"
import { FloatingElementsLazy } from "@/components/auth/floating-elements-lazy"

export default async function UserManagementPage() {
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
    return redirect("/")
  }

  // Fetch all users and their active subscription
  // We need to join manually or use separate queries if foreign key logic is complex.
  // Profiles has 1:Many subs. We want the active one.
  
  // Fetch profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (!profiles) return <div>No users found</div>

  // Fetch active subscriptions for all users
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("status", "active")

  // Merge data using Map for O(n) lookup instead of O(n²) find inside map
  const subscriptionMap = new Map(
    (subscriptions || []).map((sub) => [sub.user_id, sub])
  )
  const users = profiles.map((p) => ({
    ...p,
    subscription: subscriptionMap.get(p.id) || null,
  }))

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-black" />

      {/* Floating decorative elements */}
      <FloatingElementsLazy />

      {/* Content */}
      <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-8 pb-8 px-4">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-4 md:p-6 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
            
            <div className="mb-4">
              <Link
                href="/admin"
                aria-label="Back to Admin"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>
            <h2 className="font-syne font-bold text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-4 md:mb-6 px-2">
              User Management
            </h2>
            <UsersTable users={users} />
          </div>
        </div>
      </div>
    </main>
  )
}

