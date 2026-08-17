"use client"

import React from "react"
import { ArrowLeft, ChevronRight, CreditCard, Loader2, UserRound } from "lucide-react"

import {
  getAdminSubscriptionMembers,
  type AdminSubscriptionMember,
} from "@/app/admin/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatSubscriptionType } from "@/lib/utils/subscription-helpers"

type SubscriptionType = AdminSubscriptionMember["type"]

interface ActiveSubscriptionsDialogProps {
  children: React.ReactNode
  monthlyCount: number
  fiveTimesCount: number
  tenTimesCount: number
}

const planTypes: SubscriptionType[] = ["monthly", "5_times", "10_times"]

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getEffectiveStatus(subscription: AdminSubscriptionMember) {
  const today = new Date().toISOString().split("T")[0]
  if (subscription.type === "monthly" && subscription.end_date && subscription.end_date < today) {
    return "Expired"
  }
  if (subscription.type !== "monthly" && (subscription.remaining_credits ?? 0) <= 0) {
    return "Depleted"
  }
  return subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
}

function SubscriptionMemberRow({ subscription }: { subscription: AdminSubscriptionMember }) {
  const profile = subscription.profile
  const status = getEffectiveStatus(subscription)
  const isActive = status === "Active"

  return (
    <article className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
      <Avatar className="h-10 w-10 shrink-0 border border-border/60">
        <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
        <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink font-syne text-xs font-semibold text-white">
          {profile?.full_name?.slice(0, 2).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-syne text-sm font-semibold text-card-foreground">
            {profile?.full_name || "Unknown member"}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 font-outfit text-[9px] font-semibold uppercase tracking-wide",
              isActive
                ? "border-success/25 bg-success/10 text-success"
                : "border-warning/25 bg-warning/10 text-warning",
            )}
          >
            {status}
          </span>
        </div>
        <p className="mt-0.5 truncate font-outfit text-xs text-card-foreground/45">
          {profile?.member_type === "student" ? "Student" : "Adult"}
          {subscription.type === "monthly"
            ? ` · Valid until ${formatDate(subscription.end_date)}`
            : ` · ${subscription.remaining_credits ?? 0}/${subscription.total_credits ?? 0} sessions left`}
        </p>
      </div>
    </article>
  )
}

export function ActiveSubscriptionsDialog({
  children,
  monthlyCount,
  fiveTimesCount,
  tenTimesCount,
}: ActiveSubscriptionsDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedType, setSelectedType] = React.useState<SubscriptionType | null>(null)
  const [members, setMembers] = React.useState<AdminSubscriptionMember[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const counts: Record<SubscriptionType, number> = {
    monthly: monthlyCount,
    "5_times": fiveTimesCount,
    "10_times": tenTimesCount,
  }
  const total = monthlyCount + fiveTimesCount + tenTimesCount
  const selectedMembers = selectedType
    ? members.filter((subscription) => subscription.type === selectedType)
    : []

  const loadMembers = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const result = await getAdminSubscriptionMembers()
      if (!result.success) {
        setErrorMessage(result.message ?? "Failed to load subscription members")
        return
      }
      setMembers(result.items ?? [])
      setLoaded(true)
    } catch {
      setErrorMessage("Failed to load subscription members")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen && !loaded && !loading) void loadMembers()
    if (!nextOpen) setSelectedType(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100vw-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-popover p-0">
        <DialogHeader className="shrink-0 border-b border-border/50 px-5 pb-4 pt-6 text-left sm:px-6">
          <DialogTitle className="px-0 text-left font-syne text-xl font-bold sm:pr-12">
            {selectedType ? formatSubscriptionType(selectedType) : "Active Plans"}
          </DialogTitle>
          <DialogDescription className="text-left font-outfit">
            {selectedType
              ? `${selectedMembers.length} member${selectedMembers.length === 1 ? "" : "s"} with this plan`
              : `${total} active subscription${total === 1 ? "" : "s"} across the studio`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {selectedType ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="inline-flex h-11 items-center gap-2 rounded-xl px-3 font-outfit text-sm text-foreground/65 transition hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All plan types
              </button>

              {loading ? (
                <div className="flex min-h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-rookie-blue" aria-label="Loading members" />
                </div>
              ) : errorMessage ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center">
                  <p className="font-outfit text-sm text-destructive">{errorMessage}</p>
                  <button type="button" onClick={() => void loadMembers()} className="mt-3 h-11 rounded-xl px-4 font-outfit text-sm text-foreground underline underline-offset-4">
                    Try again
                  </button>
                </div>
              ) : selectedMembers.length > 0 ? (
                <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card">
                  {selectedMembers.map((subscription) => (
                    <SubscriptionMemberRow key={subscription.id} subscription={subscription} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 px-5 py-10 text-center">
                  <UserRound className="mx-auto h-6 w-6 text-card-foreground/35" aria-hidden="true" />
                  <p className="mt-2 font-outfit text-sm text-card-foreground/60">No members currently use this plan.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-5 flex items-end justify-between border-b border-border/50 pb-4">
                <div>
                  <p className="font-outfit text-xs uppercase tracking-[0.16em] text-foreground/40">Total active</p>
                  <p className="mt-1 font-syne text-3xl font-bold text-foreground">{total}</p>
                </div>
                <CreditCard className="h-7 w-7 text-rookie-blue" aria-hidden="true" />
              </div>

              {planTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className="group flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 text-left transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rookie-purple/15 font-syne text-base font-bold text-rookie-blue">
                    {counts[type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-syne text-sm font-semibold text-card-foreground">
                      {formatSubscriptionType(type)}
                    </span>
                    <span className="mt-0.5 block font-outfit text-xs text-card-foreground/45">
                      View members and status
                    </span>
                  </span>
                  {loading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-card-foreground/35" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-card-foreground/35 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  )}
                </button>
              ))}

              {errorMessage && (
                <p className="pt-2 text-center font-outfit text-sm text-destructive">{errorMessage}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
