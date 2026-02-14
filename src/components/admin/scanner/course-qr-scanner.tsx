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
import { getMemberProfile } from '@/app/admin/actions'
import { 
  performCourseCheckin, 
  getUserBookingForCourse,
  getCourseCheckins,
  checkUserAlreadyCheckedIn,
  getUserActiveSubscription,
} from '@/app/admin/scanner/actions'
import type { CourseWithBookingCount } from '@/types/courses'
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
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, RefreshCcw, Camera, Loader2, SwitchCamera, Calendar, Clock, Music, AlertTriangle } from 'lucide-react'
import { DropInDialog } from './drop-in-dialog'
import { CapacityOverrideDialog } from './capacity-override-dialog'
import { cn, getDisplayDanceStyle } from '@/lib/utils'
import { formatCourseDateTime } from '@/lib/utils/date-formatters'
import { formatSubscriptionType } from '@/lib/utils/subscription-helpers'
import { BookingTypeBadge } from '@/components/ui/booking-type-badge'
import type { PaymentMethod } from '@/types/courses'

interface CourseQRScannerProps {
  todaysCourses: CourseWithBookingCount[]
  children?: React.ReactNode
}

export function CourseQRScanner({ todaysCourses, children }: CourseQRScannerProps) {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{
    success: boolean
    message: string
    bookingType?: string
    attendance?: string
  } | null>(null)
  const [scannedMember, setScannedMember] = useState<{
    id: string
    full_name: string
    avatar_url: string | null
    dob: string | null
    member_type: 'adult' | 'student'
  } | null>(null)
  const [bookingInfo, setBookingInfo] = useState<{
    bookingType: 'subscription' | 'single' | 'drop_in'
    subscriptionDetails?: {
      type: string
      remainingCredits?: number
      endDate?: string
    }
  } | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showDropInDialog, setShowDropInDialog] = useState(false)
  const [showCapacityOverride, setShowCapacityOverride] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [attendanceCount, setAttendanceCount] = useState(0)
  const [isRepeatCheckin, setIsRepeatCheckin] = useState(false)
  const [dropInSubscriptionInfo, setDropInSubscriptionInfo] = useState<{
    hasSubscription: boolean
    subscriptionDetails?: {
      type: string
      remainingCredits?: number
      endDate?: string
    }
  } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

  // Auto-select course if only one
  useEffect(() => {
    if (todaysCourses.length === 1 && !selectedCourseId) {
      setSelectedCourseId(todaysCourses[0].id)
    }
  }, [todaysCourses, selectedCourseId])

  // Load attendance count when course is selected
  useEffect(() => {
    if (selectedCourseId) {
      loadAttendanceCount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId])


  const loadAttendanceCount = async () => {
    if (!selectedCourseId) return
    const data = await getCourseCheckins(selectedCourseId)
    setAttendanceCount(data.length)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setScanning(true)
      setCameraError(null)
      setLastResult(null)
    } else {
      setScanning(false)
      resetState()
    }
  }

  const resetState = () => {
    setLastResult(null)
    setShowConfirmation(false)
    setShowDropInDialog(false)
    setShowCapacityOverride(false)
    setScannedMember(null)
    setBookingInfo(null)
    setPendingUserId(null)
    setLoadingProfile(false)
    setIsRepeatCheckin(false)
    setDropInSubscriptionInfo(null)
    setPaymentMethod(null)
  }

  const handleDecode = async (result: string) => {
    if (!result || !scanning) return
    if (!selectedCourseId) {
      toast.error('Please select a course first')
      return
    }

    setScanning(false)
    try {
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
        setScannedMember({
          id: profileResponse.profile.id,
          full_name: profileResponse.profile.full_name || 'Unknown',
          avatar_url: profileResponse.profile.avatar_url,
          dob: profileResponse.profile.dob,
          member_type: profileResponse.profile.member_type,
        })

        // Check if user already checked in for this course (for notification purposes)
        const alreadyCheckedIn = await checkUserAlreadyCheckedIn(userId, selectedCourseId)
        setIsRepeatCheckin(alreadyCheckedIn)

        // Check if user has booking for this course
        const bookingCheck = await getUserBookingForCourse(userId, selectedCourseId)
        const selectedCourse = todaysCourses.find(c => c.id === selectedCourseId)

        if (bookingCheck.hasBooking) {
          // Has booking - store booking info and proceed with normal check-in
          setBookingInfo({
            bookingType: bookingCheck.bookingType as 'subscription' | 'single' | 'drop_in',
            subscriptionDetails: bookingCheck.subscriptionDetails
          })
          setShowConfirmation(true)
        } else {
          // No booking - check for active subscription
          const subscriptionCheck = await getUserActiveSubscription(userId)
          setDropInSubscriptionInfo(subscriptionCheck)
          
          if (selectedCourse && attendanceCount >= selectedCourse.capacity) {
            // No booking and capacity full - show override dialog
            setShowCapacityOverride(true)
          } else {
            // No booking but capacity available - show drop-in dialog
            setShowDropInDialog(true)
          }
        }
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
    resetState()
    setScanning(true)
  }

  const handleNormalCheckin = async () => {
    if (!pendingUserId || !selectedCourseId || !paymentMethod) return

    setLoadingProfile(true)
    try {
      const response = await performCourseCheckin(pendingUserId, selectedCourseId, false, paymentMethod)

      if (response.success) {
        const bookingTypeLabel = response.booking_type === 'subscription' ? 'Subscription' 
          : response.booking_type === 'single' ? 'Single Class' : 'Drop-in'
        
        const repeatLabel = isRepeatCheckin ? ' - REPEAT CHECK-IN' : ''
        const message = `${scannedMember?.full_name} checked in (${bookingTypeLabel})${repeatLabel}`
        const attendance = response.current_attendance && response.max_capacity 
          ? `${response.current_attendance}/${response.max_capacity} attended`
          : ''
        
        toast.success(message + (attendance ? ` - ${attendance}` : ''))
        
        setLastResult({
          success: true,
          message: message,
          bookingType: bookingTypeLabel,
          attendance: attendance,
        })
        
        // Reload attendance count
        await loadAttendanceCount()
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

  const handleDropInCheckin = async () => {
    if (!pendingUserId || !selectedCourseId) {
      toast.error('Missing user ID or course ID');
      return;
    }
    
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setLoadingProfile(true)
    try {
      const response = await performCourseCheckin(pendingUserId, selectedCourseId, true, paymentMethod)

      if (response.success) {
        const message = `${scannedMember?.full_name} checked in (Drop-in)`
        const attendance = response.current_attendance && response.max_capacity 
          ? `${response.current_attendance}/${response.max_capacity} attended`
          : ''
        
        toast.success(message + (attendance ? ` - ${attendance}` : ''))
        
        setLastResult({
          success: true,
          message: message,
          bookingType: 'Drop-in',
          attendance: attendance,
        })
        
        // Reload attendance count
        await loadAttendanceCount()
      } else {
        toast.error(response.message)
        setLastResult({ success: false, message: response.message })
      }
    } catch (error) {
      console.error('Drop-in check-in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process drop-in';
      toast.error(errorMessage);
      setLastResult({ success: false, message: errorMessage })
    } finally {
      setLoadingProfile(false)
      setShowDropInDialog(false)
      setScannedMember(null)
      setPendingUserId(null)
    }
  }

  const handleCapacityOverrideCheckin = async () => {
    if (!pendingUserId || !selectedCourseId || !paymentMethod) return

    setLoadingProfile(true)
    try {
      const response = await performCourseCheckin(pendingUserId, selectedCourseId, true, paymentMethod)

      if (response.success) {
        const message = `${scannedMember?.full_name} checked in (Drop-in - Capacity Override)`
        const attendance = response.current_attendance && response.max_capacity 
          ? `${response.current_attendance}/${response.max_capacity} attended`
          : ''
        
        toast.success(message + (attendance ? ` - ${attendance}` : ''))
        
        setLastResult({
          success: true,
          message: message,
          bookingType: 'Drop-in',
          attendance: attendance,
        })
        
        // Reload attendance count
        await loadAttendanceCount()
      } else {
        toast.error(response.message)
        setLastResult({ success: false, message: response.message })
      }
    } catch {
      toast.error('Failed to process override check-in')
      setLastResult({ success: false, message: 'Failed to process override check-in' })
    } finally {
      setLoadingProfile(false)
      setShowCapacityOverride(false)
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

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  const handleScanNext = () => {
    resetScanner()
  }

  const handleCameraError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Failed to access camera'
    setCameraError(message)
    setScanning(false)
    toast.error('Camera access failed. Please grant camera permissions.')
  }

  const selectedCourse = todaysCourses.find(c => c.id === selectedCourseId)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button className="w-full">
            Open Scanner
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-black/90 border-white/20 backdrop-blur-xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-center font-syne text-white text-xl">
            Course Check-in Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner or Results */}
          <div className="flex flex-col items-center justify-center space-y-4">
            {showConfirmation && scannedMember && selectedCourse && bookingInfo ? (
              <div className="w-full flex flex-col items-center space-y-4">
                {/* User Avatar and Name */}
                <Avatar className="h-24 w-24 border-4 border-white/20">
                  <AvatarImage src={scannedMember.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                    {scannedMember.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold font-syne text-white">
                    {scannedMember.full_name}
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    {scannedMember.dob && (
                      <span className="text-sm text-white/70 font-outfit">
                        {new Date(scannedMember.dob).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                    <Badge 
                      variant="default" 
                      className={cn(
                        "font-outfit text-xs",
                        scannedMember.member_type === 'student' 
                          ? "border-pink-500/40 bg-pink-500/20 text-pink-300" 
                          : "border-white/30 bg-white/10 text-white"
                      )}
                    >
                      {scannedMember.member_type === 'student' ? 'Student' : 'Adult'}
                    </Badge>
                  </div>
                </div>

                {/* Course Information Card */}
                <div className="w-full bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-white/80 font-outfit text-sm font-semibold">
                    <Music className="h-4 w-4" />
                    <span>Course Information</span>
                  </div>
                  
                  <div className="border-t border-white/10" />
                  
                  <div>
                    <div className="font-syne font-bold text-white text-lg">
                      {selectedCourse.song || getDisplayDanceStyle(selectedCourse.dance_style)}
                    </div>
                    {selectedCourse.singer && (
                      <div className="text-sm text-white/70 font-outfit mt-0.5">
                        {selectedCourse.singer}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-white/70 font-outfit">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{formatCourseDateTime(selectedCourse.scheduled_date, selectedCourse.start_time).dateStr}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{formatCourseDateTime(selectedCourse.scheduled_date, selectedCourse.start_time).timeStr}</span>
                    </div>
                  </div>

                  {/* Attendance Count */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 font-outfit text-sm">Current Attendance:</span>
                      <span className="font-syne font-bold text-white text-lg">
                        {attendanceCount}/{selectedCourse.capacity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Booking Type Card */}
                <div className="w-full bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 font-outfit text-sm font-semibold">
                      Booking Type
                    </span>
                    <BookingTypeBadge type={bookingInfo.bookingType} />
                  </div>

                  {/* Subscription Details */}
                  {bookingInfo.bookingType === 'subscription' && bookingInfo.subscriptionDetails && (
                    <>
                      <div className="border-t border-white/10" />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/70 font-outfit">Plan:</span>
                          <span className="text-white font-outfit font-semibold">
                            {formatSubscriptionType(bookingInfo.subscriptionDetails.type)}
                          </span>
                        </div>
                        
                        {bookingInfo.subscriptionDetails.remainingCredits !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/70 font-outfit">Remaining:</span>
                            <span className="text-white font-syne font-bold text-lg">
                              {bookingInfo.subscriptionDetails.remainingCredits}
                            </span>
                          </div>
                        )}
                        
                        {bookingInfo.subscriptionDetails.endDate && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/70 font-outfit">Valid Until:</span>
                            <span className="text-white font-outfit">
                              {new Date(bookingInfo.subscriptionDetails.endDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Repeat Check-in Warning */}
                {isRepeatCheckin && (
                  <div className="w-full bg-orange-500/20 border border-orange-500/50 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-orange-300 font-outfit text-sm font-semibold">
                        ⚠️ REPEAT CHECK-IN
                      </p>
                      <p className="text-orange-200 font-outfit text-xs mt-1">
                        This user has already checked in for this course earlier today.
                      </p>
                    </div>
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
                
                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 w-full pt-2">
                  <Button
                    onClick={handleCancelConfirmation}
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={loadingProfile}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleNormalCheckin}
                    className="w-full sm:w-auto bg-gradient-to-r from-rookie-purple to-rookie-pink hover:opacity-90"
                    disabled={loadingProfile || !paymentMethod}
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
              <div className="w-full aspect-square max-w-sm flex flex-col items-center justify-center bg-white/10 rounded-lg space-y-4 p-6">
                <Loader2 className="h-20 w-20 text-white animate-spin" />
                <div className="text-center">
                  <h3 className="text-xl font-bold font-syne text-white">Loading...</h3>
                  <p className="text-white/70 font-outfit mt-2">Please wait</p>
                </div>
              </div>
            ) : scanning && !cameraError && selectedCourseId ? (
              <div className="w-full aspect-square max-w-sm overflow-hidden rounded-lg border-2 border-white/30 relative">
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
                  className="absolute top-4 right-4 z-20 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full border border-white/20 transition-all"
                  aria-label="Flip camera"
                >
                  <SwitchCamera className="h-6 w-6 text-white" />
                </button>
                <div className="absolute inset-0 border-2 border-white/50 m-12 rounded-lg pointer-events-none animate-pulse" />
              </div>
            ) : cameraError ? (
              <div className="w-full aspect-square max-w-sm flex flex-col items-center justify-center bg-white/10 rounded-lg space-y-4 p-6 text-center">
                <Camera className="h-20 w-20 text-red-500" />
                <div>
                  <h3 className="text-xl font-bold text-red-500 font-syne">Camera Error</h3>
                  <p className="text-white/70 font-outfit mt-2">{cameraError}</p>
                </div>
                <Button onClick={resetScanner} className="bg-white/10 hover:bg-white/20 text-white">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Retry
                </Button>
              </div>
            ) : lastResult ? (
              <div className="w-full aspect-square max-w-sm flex flex-col items-center justify-center bg-white/10 rounded-lg space-y-4 p-6 text-center">
                {lastResult.success ? (
                  <CheckCircle2 className="h-20 w-20 text-green-500" />
                ) : (
                  <XCircle className="h-20 w-20 text-red-500" />
                )}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold font-syne text-white">
                    {lastResult.success ? 'Check-in Successful' : 'Check-in Failed'}
                  </h3>
                  
                  <p className="text-white/70 font-outfit mt-2">{lastResult.message}</p>
                  
                  <div className="flex flex-wrap gap-2 justify-center items-center">
                    {lastResult.bookingType && (
                      <Badge variant="scheduled">
                        {lastResult.bookingType}
                      </Badge>
                    )}
                  </div>
                  
                  {lastResult.attendance && (
                    <p className="font-semibold mt-2 font-outfit text-white">
                      {lastResult.attendance}
                    </p>
                  )}
                </div>
                <Button onClick={handleScanNext} className="bg-white/10 hover:bg-white/20 text-white">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Scan Next
                </Button>
              </div>
            ) : !selectedCourseId ? (
              <div className="w-full aspect-square max-w-sm flex flex-col items-center justify-center bg-white/10 rounded-lg space-y-4 p-6 text-center">
                <Camera className="h-20 w-20 text-white/40" />
                <p className="text-white/70 font-outfit">
                  Select a course to start scanning
                </p>
              </div>
            ) : null}
          </div>

        </div>
      </DialogContent>

      {/* Drop-in Dialog */}
      {showDropInDialog && scannedMember && selectedCourse && (
        <DropInDialog
          open={showDropInDialog}
          onOpenChange={setShowDropInDialog}
          user={scannedMember}
          course={selectedCourse}
          currentAttendance={attendanceCount}
          onConfirm={handleDropInCheckin}
          loading={loadingProfile}
          subscriptionInfo={dropInSubscriptionInfo}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
        />
      )}

      {/* Capacity Override Dialog */}
      {showCapacityOverride && scannedMember && selectedCourse && (
        <CapacityOverrideDialog
          open={showCapacityOverride}
          onOpenChange={setShowCapacityOverride}
          user={scannedMember}
          course={selectedCourse}
          currentAttendance={attendanceCount}
          onConfirm={handleCapacityOverrideCheckin}
          loading={loadingProfile}
          subscriptionInfo={dropInSubscriptionInfo}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
        />
      )}
    </Dialog>
  )
}
