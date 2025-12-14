import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { QRCodeDisplay } from "@/components/profile/qr-code-display"

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

  const userInitials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "UR"

  return (
    <div className="container max-w-lg mx-auto py-8 px-4 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
            <AvatarFallback className="text-xl">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <CardTitle className="text-2xl">{profile?.full_name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
            <div className="mt-2 flex gap-2">
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                {profile?.role === "admin" ? "Admin" : "Member"}
              </span>
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                {profile?.member_type === "student" ? "Student" : "Adult"}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <QRCodeDisplay userId={user.id} userName={profile?.full_name || "User"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plan Type</span>
                <span className="font-semibold capitalize">
                  {subscription.type.replace("_", " ")}
                </span>
              </div>
              
              {subscription.type === "monthly" ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Valid Until</span>
                    <span className="font-semibold">
                      {new Date(subscription.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Credits Remaining</span>
                  <span className="font-semibold text-xl text-primary">
                    {subscription.remaining_credits} / {subscription.total_credits}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No active subscription found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

