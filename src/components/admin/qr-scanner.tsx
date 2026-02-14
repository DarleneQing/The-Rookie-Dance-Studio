'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Defer loading until user opens scanner - reduces initial bundle and INP
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => ({ default: mod.Scanner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    ),
  }
)
import { toast } from 'sonner'
import { checkInUser, getMemberProfile } from '@/app/admin/actions'
import { getUserActiveSubscription } from '@/app/admin/scanner/actions'
import type { PaymentMethod } from '@/types/courses'
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
import { CheckCircle2, XCircle, RefreshCcw, Camera, Loader2, SwitchCamera } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    member_type?: 'adult' | 'student'
    already_checked_in_today: boolean
  } | null>(null)
  const [showSameDayConfirmation, setShowSameDayConfirmation] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [hasSubscription, setHasSubscription] = useState(false)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setScanning(true)
      setCameraError(null)
      setLastResult(null)
    } else {
      setScanning(false)
      // Reset confirmation state when dialog closes
      setLastResult(null)
      setShowConfirmation(false)
      setShowSameDayConfirmation(false)
      setScannedMember(null)
      setPendingUserId(null)
      setLoadingProfile(false)
      setPaymentMethod(null)
      setHasSubscription(false)
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
        
        // Check if user has active subscription
        const subscriptionCheck = await getUserActiveSubscription(userId)
        setHasSubscription(subscriptionCheck.hasSubscription)
        
        // Auto-select 'abo' if user has subscription
        if (subscriptionCheck.hasSubscription) {
          setPaymentMethod('abo')
        } else {
          setPaymentMethod(null)
        }
        
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
    setShowSameDayConfirmation(false)
    setScannedMember(null)
    setPendingUserId(null)
    setLoadingProfile(false)
    setPaymentMethod(null)
    setHasSubscription(false)
  }

  const handleConfirmCheckIn = async (forceSameDay?: boolean) => {
    if (!pendingUserId || !paymentMethod) return
    if (scannedMember?.already_checked_in_today && !forceSameDay) {
      setShowSameDayConfirmation(true)
      return
    }

    setLoadingProfile(true)
    try {
      const response = await checkInUser(pendingUserId, paymentMethod)

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
      setShowSameDayConfirmation(false)
      setScannedMember(null)
      setPendingUserId(null)
    }
  }

  const handleCancelConfirmation = () => {
    setShowConfirmation(false)
    setShowSameDayConfirmation(false)
    setScannedMember(null)
    setPendingUserId(null)
    resetScanner()
  }

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
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
      <DialogContent className="sm:max-w-md bg-black/90 border-white/20 backdrop-blur-xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-center font-syne text-white">
            {showConfirmation ? 'Confirm Check-in' : 'Check-in Scanner'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          {showConfirmation && scannedMember ? (
            <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-4">
              <Avatar className="h-40 w-40 border-4 border-white/20">
                <AvatarImage src={scannedMember.avatar_url || undefined} alt={scannedMember.full_name || 'User'} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                  {scannedMember.full_name ? scannedMember.full_name.charAt(0).toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold font-syne text-white">
                  {scannedMember.full_name || 'Unknown User'}
                </h3>
                {scannedMember.member_type && (
                  <p className="text-xs font-outfit uppercase tracking-wide text-white/70">
                    {scannedMember.member_type === 'student' ? 'Student' : 'Adult'}
                  </p>
                )}
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

              {showSameDayConfirmation && (
                <div className="w-full rounded-xl border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-center">
                  <p className="text-sm font-outfit text-amber-100">
                    This user already checked in today (Zurich time). Confirm another check-in?
                  </p>
                </div>
              )}

              {/* Payment Method Selection */}
              <div className="w-full bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 font-outfit text-sm font-semibold">
                    Payment Method
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'twint', 'abo'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={cn(
                        'px-4 py-2 rounded-lg border transition-all font-outfit text-sm font-semibold',
                        paymentMethod === method
                          ? 'bg-gradient-to-r from-rookie-purple to-rookie-pink text-white border-transparent'
                          : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {method === 'cash' ? 'Cash' : method === 'twint' ? 'TWINT' : 'Abo'}
                    </button>
                  ))}
                </div>
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
                  onClick={() => handleConfirmCheckIn(showSameDayConfirmation)}
                  className="w-full sm:w-auto bg-gradient-to-r from-rookie-purple to-rookie-pink hover:opacity-90 text-white"
                  disabled={loadingProfile || !paymentMethod}
                >
                  {loadingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    showSameDayConfirmation ? 'Confirm Check-in Again' : 'Confirm Check-in'
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
                constraints={{ facingMode: facingMode }}
              />
              <button
                onClick={handleFlipCamera}
                className="absolute top-4 right-4 z-20 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full border border-white/20 transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label="Flip camera"
              >
                <SwitchCamera className="h-6 w-6 text-white transition-transform duration-300" />
              </button>
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

