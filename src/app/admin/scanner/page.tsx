import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QRScannerComponent } from "@/components/admin/qr-scanner"
import { Toaster } from "sonner"

export default async function AdminScannerPage() {
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p>You must be an administrator to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Check-in Scanner</h1>
      <QRScannerComponent />
      <Toaster position="top-center" />
    </div>
  )
}

