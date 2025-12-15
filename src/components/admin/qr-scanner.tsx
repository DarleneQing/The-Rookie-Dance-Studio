'use client'

import { useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { toast } from 'sonner'
import { checkInUser } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CheckCircle2, XCircle, RefreshCcw, Camera } from 'lucide-react'

interface QRScannerComponentProps {
  children?: React.ReactNode
}

export function QRScannerComponent({ children }: QRScannerComponentProps) {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{
    success: boolean
    message: string
    remaining?: number
  } | null>(null)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setScanning(true)
      setCameraError(null)
      setLastResult(null)
    } else {
      setScanning(false)
    }
  }

  const handleDecode = async (result: string) => {
    if (!result || !scanning) return

    setScanning(false)
    try {
      // Parse JSON if possible, otherwise treat as ID string
      let userId = result
      try {
        const json = JSON.parse(result)
        if (json.userId) userId = json.userId
      } catch {
        // Not JSON, assume direct ID
      }

      toast.loading('Processing check-in...')
      const response = await checkInUser(userId)
      toast.dismiss()

      if (response.success) {
        toast.success(response.message)
        setLastResult({ 
          success: true, 
          message: response.message, 
          remaining: response.remaining 
        })
      } else {
        toast.error(response.message)
        setLastResult({ success: false, message: response.message })
      }
    } catch {
      toast.error('Invalid QR Code')
      setLastResult({ success: false, message: 'Invalid QR Code' })
    }
  }

  const resetScanner = () => {
    setLastResult(null)
    setCameraError(null)
    setScanning(true)
  }

  const handleScanNext = () => {
    resetScanner()
  }

  const handleCameraError = (error: unknown) => {
    console.error('Scanner error:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to access camera'
    setCameraError(message)
    setScanning(false)
    toast.error('Camera access failed. Please grant camera permissions.')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button className="w-full">
            Open Scanner
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-black/90 border-white/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-center font-syne text-white">
            Check-in Scanner
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          {scanning && !cameraError ? (
            <div className="w-full max-w-sm aspect-square overflow-hidden rounded-lg border-2 border-white/30 relative">
              <Scanner
                onScan={(results) => {
                  if (results && results.length > 0) {
                    handleDecode(results[0].rawValue || '')
                  }
                }}
                onError={handleCameraError}
                constraints={{ facingMode: 'user' }}
              />
              <div className="absolute inset-0 border-2 border-white/50 m-12 rounded-lg pointer-events-none animate-pulse" />
            </div>
          ) : cameraError ? (
            <div className="w-full max-w-sm aspect-square flex flex-col items-center justify-center bg-white/10 rounded-lg space-y-4 p-6 text-center">
              <Camera className="h-20 w-20 text-red-500" />
              <div>
                <h3 className="text-xl font-bold text-red-500 font-syne">Camera Error</h3>
                <p className="text-white/70 font-outfit mt-2">{cameraError}</p>
                <p className="text-sm text-white/50 font-outfit mt-2">
                  Please grant camera permissions and try again.
                </p>
              </div>
              <Button onClick={resetScanner} size="lg" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <RefreshCcw className="mr-2 h-4 w-4" /> Retry Camera
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-sm aspect-square flex flex-col items-center justify-center bg-white/10 rounded-lg space-y-4 p-6 text-center">
              {lastResult?.success ? (
                <CheckCircle2 className="h-20 w-20 text-green-500" />
              ) : (
                <XCircle className="h-20 w-20 text-red-500" />
              )}
              <div>
                <h3 className="text-xl font-bold font-syne text-white">
                  {lastResult?.success ? 'Check-in Successful' : 'Check-in Failed'}
                </h3>
                <p className="text-white/70 font-outfit mt-2">{lastResult?.message}</p>
                {lastResult?.remaining !== undefined && (
                  <p className="font-semibold mt-2 font-syne text-white">
                    Remaining: {lastResult.remaining}
                  </p>
                )}
              </div>
              <Button onClick={handleScanNext} size="lg" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <RefreshCcw className="mr-2 h-4 w-4" /> Scan Next
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

