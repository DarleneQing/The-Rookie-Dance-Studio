"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ActiveSubscriptionsDialogProps {
  children: React.ReactNode
  monthlyCount: number
  fiveTimesCount: number
  tenTimesCount: number
}

function formatSubscriptionType(type: string) {
  if (type === "monthly") return "Monthly Card"
  if (type === "5_times") return "5-Times Card"
  if (type === "10_times") return "10-Times Card"
  return type
}

export function ActiveSubscriptionsDialog({
  children,
  monthlyCount,
  fiveTimesCount,
  tenTimesCount,
}: ActiveSubscriptionsDialogProps) {
  const [open, setOpen] = React.useState(false)

  const total = monthlyCount + fiveTimesCount + tenTimesCount

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[520px] max-h-[80vh] overflow-y-auto bg-black/90 border-white/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-syne text-white">
            Active Subscriptions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <div className="font-syne font-semibold text-white text-lg mb-4">
              {formatSubscriptionType("monthly")}
            </div>
            <div className="font-syne font-bold text-4xl text-white">
              {monthlyCount}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <div className="font-syne font-semibold text-white text-lg mb-4">
              {formatSubscriptionType("5_times")}
            </div>
            <div className="font-syne font-bold text-4xl text-white">
              {fiveTimesCount}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <div className="font-syne font-semibold text-white text-lg mb-4">
              {formatSubscriptionType("10_times")}
            </div>
            <div className="font-syne font-bold text-4xl text-white">
              {tenTimesCount}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <div className="font-syne font-semibold text-white text-lg mb-4">
              Total Active
            </div>
            <div className="font-syne font-bold text-4xl text-white">
              {total}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
