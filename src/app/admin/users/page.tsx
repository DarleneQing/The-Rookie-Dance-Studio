import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UsersTable } from "@/components/admin/users-table"
import { Toaster } from "sonner"

export default async function UserManagementPage() {
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

  // Fetch active subscriptions for all users (or we could do this via a View/Function for performance)
  // For MVP, client-side join or second query is fine.
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("status", "active")

  // Merge data
  const users = profiles.map((p) => {
    const sub = subscriptions?.find((s) => s.user_id === p.id)
    return {
      ...p,
      subscription: sub,
    }
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <UsersTable users={users} />
      <Toaster position="top-center" />
    </div>
  )
}

