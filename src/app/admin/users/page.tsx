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
        .select("id, full_name, avatar_url, role, member_type, verification_status, dob")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("subscriptions")
        .select("type, status, start_date, end_date, total_credits, remaining_credits, user_id")
        .eq("status", "active"),
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
    <main id="main-content" className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_75%_0%,rgba(176,175,221,0.10),transparent_48%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-10 pt-6 sm:pt-8">
        <Link
          href="/admin"
          aria-label="Back to Admin"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card text-foreground transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>

        <header className="mb-6 mt-5">
          <h1 className="font-syne text-2xl font-bold text-foreground sm:text-3xl">
            User Management
          </h1>
          <p className="mt-1 font-outfit text-sm text-foreground/55">
            Review member details and manage plans.
          </p>
        </header>

        <UsersTable users={users} />
      </div>
    </main>
  )
}

