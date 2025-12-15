"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type CheckinHistoryItem = {
  id: string
  created_at: string
  subscription_id: string
  subscription?: { type: string | null } | { type: string | null }[] | null
}

interface CheckinHistoryDialogProps {
  children: React.ReactNode
  checkins: CheckinHistoryItem[]
}

function formatPlanType(type: string | null | undefined) {
  if (type === "monthly") return "Monthly Card"
  if (type === "5_times") return "5-Times Card"
  if (type === "10_times") return "10-Times Card"
  return type || "—"
}

export function CheckinHistoryDialog({
  children,
  checkins,
}: CheckinHistoryDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[520px] max-h-[80vh] overflow-y-auto bg-black/90 border-white/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-syne text-white">
            Check-in History
          </DialogTitle>
        </DialogHeader>

        {checkins.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-white/70 font-outfit">No check-ins yet.</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {checkins.map((c) => {
              const subscription =
                Array.isArray(c.subscription) ? c.subscription[0] : c.subscription
              const planType = formatPlanType(subscription?.type ?? null)

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-white/15 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-syne font-semibold text-white truncate">
                        {planType}
                      </div>
                      <div className="mt-1 text-sm text-white/70 font-outfit">
                        {c.created_at
                          ? new Date(c.created_at).toLocaleString()
                          : "—"}
                      </div>
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

