'use client'

import { useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { toast } from 'sonner'
import { checkInUser, getMemberProfile } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircle2, XCircle, RefreshCcw, Camera, Loader2 } from 'lucide-react'

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
  const [scannedMember, setScannedMember] = useState<{
    id: string
    full_name: string | null
    avatar_url: string | null
    dob: string | null
  } | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setScanning(true)
      setCameraError(null)
      setLastResult(null)
    } else {
      setScanning(false)
      // Reset confirmation state when dialog closes
      setShowConfirmation(false)
      setScannedMember(null)
      setPendingUserId(null)
      setLoadingProfile(false)
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

      setLoadingProfile(true)
      setPendingUserId(userId)

      const profileResponse = await getMemberProfile(userId)
      setLoadingProfile(false)

      if (profileResponse.success && profileResponse.profile) {
        setScannedMember(profileResponse.profile)
        setShowConfirmation(true)
      } else {
        toast.error(profileResponse.message || 'Failed to load member profile')
        resetScanner()
      }
    } catch {
      toast.error('Invalid QR Code')
      setLoadingProfile(false)
      resetScanner()
    }
  }

  const resetScanner = () => {
    setLastResult(null)
    setCameraError(null)
    setScanning(true)
    setShowConfirmation(false)
    setScannedMember(null)
    setPendingUserId(null)
    setLoadingProfile(false)
  }

  const handleConfirmCheckIn = async () => {
    if (!pendingUserId) return

    setLoadingProfile(true)
    try {
      const response = await checkInUser(pendingUserId)

      if (response.success) {
        toast.success(response.message)
        setLastResult({
          success: true,
          message: response.message,
          remaining: response.remaining,
        })
      } else {
        toast.error(response.message)
        setLastResult({ success: false, message: response.message })
      }
    } catch {
      toast.error('Failed to process check-in')
      setLastResult({ success: false, message: 'Failed to process check-in' })
    } finally {
      setLoadingProfile(false)
      setShowConfirmation(false)
      setScannedMember(null)
      setPendingUserId(null)
    }
  }

  const handleCancelConfirmation = () => {
    setShowConfirmation(false)
    setScannedMember(null)
    setPendingUserId(null)
    resetScanner()
  }

  const handleScanNext = () => {
    resetScanner()
  }

  const handleCameraError = (error: unknown) => {
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
            {showConfirmation ? 'Confirm Check-in' : 'Check-in Scanner'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          {showConfirmation && scannedMember ? (
            <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-4">
              <Avatar className="h-24 w-24 border-4 border-white/20">
                <AvatarImage src={scannedMember.avatar_url || undefined} alt={scannedMember.full_name || 'Member'} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                  {scannedMember.full_name ? scannedMember.full_name.charAt(0).toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center">
                <h3 className="text-xl font-bold font-syne text-white">
                  {scannedMember.full_name || 'Unknown Member'}
                </h3>
              </div>
              
              <div className="text-center">
                <p className="text-white/70 font-outfit text-sm">
                  Date of Birth: {scannedMember.dob
                    ? new Date(scannedMember.dob).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Not provided'}
                </p>
              </div>
              
              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 w-full pt-4">
                <Button
                  onClick={handleCancelConfirmation}
                  variant="outline"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/20"
                  disabled={loadingProfile}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmCheckIn}
                  className="w-full sm:w-auto bg-gradient-to-r from-rookie-purple to-rookie-pink hover:opacity-90 text-white"
                  disabled={loadingProfile}
                >
                  {loadingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Check-in'
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : loadingProfile ? (
            <div className="w-full max-w-sm aspect-square flex flex-col items-center justify-center bg-white/10 rounded-lg space-y-4 p-6 text-center">
              <Loader2 className="h-20 w-20 text-white animate-spin" />
              <div>
                <h3 className="text-xl font-bold font-syne text-white">Loading Member Profile</h3>
                <p className="text-white/70 font-outfit mt-2">Please wait...</p>
              </div>
            </div>
          ) : scanning && !cameraError ? (
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

