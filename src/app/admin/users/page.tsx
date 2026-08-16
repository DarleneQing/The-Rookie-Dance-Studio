import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCachedUser } from "@/lib/supabase/cached"
import { UsersTable } from "@/components/admin/users-table"

export default async function UserManagementPage() {
  const user = await getCachedUser()

  if (!user) {
    return redirect("/login")
  }

  const supabase = createClient()

  // Load a bounded initial page (most recent 100 profiles). Full search is
  // server-side via searchAdminUsers() — we never ship the whole profiles
  // table to the client.
  const [{ data: profile }, { data: profiles }, { data: subscriptions }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role, member_type, verification_status")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("subscriptions").select("type, status, remaining_credits, end_date, user_id").eq("status", "active"),
    ])

  if (profile?.role !== "admin") {
    return redirect("/")
  }

  if (!profiles) return <div>No users found</div>

  // Merge data using Map for O(n) lookup instead of O(n²) find inside map
  const subscriptionMap = new Map(
    (subscriptions || []).map((sub) => [sub.user_id, sub])
  )
  const users = profiles.map((p) => ({
    ...p,
    subscription: subscriptionMap.get(p.id) || null,
  }))

  return (
    <main id="main-content" className="relative min-h-screen overflow-x-hidden">
      <div className="absolute inset-0 z-0 bg-background" />

      {/* Content */}
      <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-8 pb-8 px-4">
        <div className="relative">
          <div className="relative bg-card border border-border/60 rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden">
            
            <div className="mb-4">
              <Link
                href="/admin"
                aria-label="Back to Admin"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-black/40 text-foreground backdrop-blur transition hover:bg-black/60"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>
            <h1 className="font-syne font-bold text-2xl md:text-3xl text-foreground mb-4 md:mb-6 px-2">
              User Management
            </h1>
            <UsersTable users={users} />
          </div>
        </div>
      </div>
    </main>
  )
}

