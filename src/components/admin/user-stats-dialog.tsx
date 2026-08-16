"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface UserStatsDialogProps {
  children: React.ReactNode
  adultCount: number
  studentCount: number
}

export function UserStatsDialog({
  children,
  adultCount,
  studentCount,
}: UserStatsDialogProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[520px] max-h-[80vh] overflow-y-auto bg-popover border-border/60 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-syne text-white">
            User Statistics
          </DialogTitle>
          <DialogDescription className="sr-only">
            Member counts by membership type
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-2xl border border-border/50 bg-white/5 p-6">
            <div className="font-syne font-semibold text-white text-lg mb-4">
              Adult Members
            </div>
            <div className="font-syne font-bold text-4xl text-white">
              {adultCount}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-white/5 p-6">
            <div className="font-syne font-semibold text-white text-lg mb-4">
              Student Members
            </div>
            <div className="font-syne font-bold text-4xl text-white">
              {studentCount}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-white/5 p-6">
            <div className="font-syne font-semibold text-white text-lg mb-4">
              Total Members
            </div>
            <div className="font-syne font-bold text-4xl text-white">
              {adultCount + studentCount}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
