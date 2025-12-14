"use client"

import { useState } from "react"
import QRCode from "react-qr-code"
import { QrCode } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface QRCodeDisplayProps {
  userId: string
  userName: string
}

export function QRCodeDisplay({ userId, userName }: QRCodeDisplayProps) {
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
        <Button className="w-full gap-2" size="lg">
          <QrCode className="h-5 w-5" />
          Show Check-in QR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{userName}</DialogTitle>
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
          <p className="text-sm text-muted-foreground text-center">
            Show this code to the instructor for check-in
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

