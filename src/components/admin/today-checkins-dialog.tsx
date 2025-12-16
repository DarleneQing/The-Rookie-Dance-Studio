"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type TodayCheckinItem = {
  id: string
  full_name: string | null
  created_at: string
}

interface TodayCheckinsDialogProps {
  children: React.ReactNode
  checkins: TodayCheckinItem[]
}

export function TodayCheckinsDialog({
  children,
  checkins,
}: TodayCheckinsDialogProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[520px] max-h-[80vh] overflow-y-auto bg-black/90 border-white/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-syne text-white">
            Today&apos;s Check-ins
          </DialogTitle>
        </DialogHeader>

        {checkins.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-white/70 font-outfit">No check-ins today.</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {checkins.map((checkin) => (
              <div
                key={checkin.id}
                className="rounded-2xl border border-white/15 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-syne font-semibold text-white truncate">
                      {checkin.full_name || "Unknown User"}
                    </div>
                    <div className="mt-1 text-sm text-white/70 font-outfit">
                      {checkin.created_at
                        ? new Date(checkin.created_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
