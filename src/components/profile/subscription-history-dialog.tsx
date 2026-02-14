"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type SubscriptionHistoryItem = {
  id: string
  type: "monthly" | "5_times" | "10_times" | string
  status: "active" | "expired" | "depleted" | "archived" | string
  start_date: string | null
  end_date: string | null
  total_credits: number | null
  remaining_credits: number | null
  created_at: string
  checkin_count?: number
}

interface SubscriptionHistoryDialogProps {
  children: React.ReactNode
  subscriptions: SubscriptionHistoryItem[]
}

function formatPlanType(type: SubscriptionHistoryItem["type"]) {
  if (type === "monthly") return "Monthly Card"
  if (type === "5_times") return "5-Times Card"
  if (type === "10_times") return "10-Times Card"
  return type
}

function formatStatus(status: SubscriptionHistoryItem["status"]) {
  return (status || "").toString().toUpperCase()
}

function statusBadgeClass(status: SubscriptionHistoryItem["status"]) {
  switch (status) {
    case "active":
      return "bg-green-500/20 text-green-300 border-green-500/30"
    case "archived":
      return "bg-white/10 text-white/70 border-white/20"
    case "depleted":
      return "bg-orange-500/20 text-orange-300 border-orange-500/30"
    case "expired":
      return "bg-red-500/20 text-red-300 border-red-500/30"
    default:
      return "bg-white/10 text-white/70 border-white/20"
  }
}

export function SubscriptionHistoryDialog({
  children,
  subscriptions,
}: SubscriptionHistoryDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[520px] max-h-[80vh] overflow-y-auto bg-black/90 border-white/20 backdrop-blur-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-syne text-white">
            Subscription History
          </DialogTitle>
        </DialogHeader>

        {subscriptions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-white/70 font-outfit">No subscriptions yet.</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {subscriptions.map((sub) => {
              const isMonthly = sub.type === "monthly"
              const checkins = sub.checkin_count ?? 0

              return (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-white/15 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-syne font-semibold text-white truncate">
                          {formatPlanType(sub.type)}
                        </h4>
                        <span
                          className={[
                            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-outfit font-semibold",
                            statusBadgeClass(sub.status),
                          ].join(" ")}
                        >
                          {formatStatus(sub.status)}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-white/70 font-outfit space-y-1">
                        <div>
                          Assigned on{" "}
                          {sub.created_at
                            ? new Date(sub.created_at).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-sm font-outfit text-white/70">
                      {isMonthly ? (
                        <div>
                          <div className="text-white/90 font-medium">
                            {sub.start_date
                              ? new Date(sub.start_date).toLocaleDateString()
                              : "—"}{" "}
                            →{" "}
                            {sub.end_date
                              ? new Date(sub.end_date).toLocaleDateString()
                              : "—"}
                          </div>
                          <div className="text-xs text-white/60 mt-1">
                            Check-ins: {checkins}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-white/90 font-medium">
                            {sub.remaining_credits ?? 0} /{" "}
                            {sub.total_credits ?? 0}
                          </div>
                          <div className="text-xs text-white/60 mt-1">
                            Check-ins: {checkins}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

