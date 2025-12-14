import Image from "next/image"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UsersTable } from "@/components/admin/users-table"
import { Toaster } from "sonner"
import { FloatingElements } from "@/components/auth/floating-elements"

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

      {/* Studio Name Header */}
      <div className="relative z-10 w-full text-center pt-12 pb-8 px-4">
        <h1 className="font-syne font-bold text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-2 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
          The Rookie Dance Studio
        </h1>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto py-8 px-4">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-6 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
            
            <h2 className="font-syne font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-6">
              User Management
            </h2>
            <UsersTable users={users} />
          </div>
        </div>
        <Toaster position="top-center" />
      </div>
    </main>
  )
}

