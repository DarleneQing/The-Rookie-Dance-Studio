"use client"

import React, { useState } from "react"
import QRCode from "react-qr-code"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface QRCodeDisplayProps {
  userId: string
  userName: string
  children?: React.ReactNode
}

export function QRCodeDisplay({ userId, userName, children }: QRCodeDisplayProps) {
  const [open, setOpen] = useState(false)
  const [timestamp, setTimestamp] = useState<string>("")

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setTimestamp(new Date().toISOString())
    }
  }

  const qrData = JSON.stringify({
    userId,
    timestamp,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <button className="w-full font-syne font-bold text-xl text-white uppercase tracking-wide hover:opacity-90 transition-opacity">
            SHOW MEMBER QR
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-popover border-border/60 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-center font-syne text-white">{userName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCode
              value={qrData}
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
            />
          </div>
          <DialogDescription className="text-sm text-foreground/70 font-outfit text-center">
            Show this code to the instructor for check-in
          </DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  )
}

