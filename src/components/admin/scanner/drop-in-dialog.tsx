'use client'

import { useEffect } from 'react'
import type { CourseWithBookingCount, PaymentMethod } from '@/types/courses'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Loader2, Calendar, Music } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCourseDateTime } from '@/lib/utils/date-formatters'
import { formatSubscriptionType } from '@/lib/utils/subscription-helpers'

interface DropInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    full_name: string
    avatar_url: string | null
    dob: string | null
    member_type: 'adult' | 'student'
  }
  course: CourseWithBookingCount
  currentAttendance: number
  onConfirm: () => Promise<void>
  loading?: boolean
  subscriptionInfo?: {
    hasSubscription: boolean
    subscriptionDetails?: {
      type: string
      remainingCredits?: number
      endDate?: string
    }
  } | null
  paymentMethod: PaymentMethod | null
  onPaymentMethodChange: (method: PaymentMethod | null) => void
}

export function DropInDialog({
  open,
  onOpenChange,
  user,
  course,
  currentAttendance,
  onConfirm,
  loading = false,
  subscriptionInfo = null,
  paymentMethod,
  onPaymentMethodChange,
}: DropInDialogProps) {

  // Auto-select 'abo' if user has subscription
  useEffect(() => {
    if (subscriptionInfo?.hasSubscription) {
      onPaymentMethodChange('abo')
    }
  }, [subscriptionInfo?.hasSubscription, onPaymentMethodChange])

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl flex items-center gap-2 text-orange-400">
            <AlertTriangle className="h-5 w-5" />
            Drop-in Check-in
          </DialogTitle>
          <DialogDescription className="text-white/70">
            No booking found for this course. Confirm to create drop-in booking and check-in.
          </DialogDescription>
        </DialogHeader>

        {/* User Info (match main scanner confirm layout) */}
        <div className="w-full flex flex-col items-center space-y-4">
          <Avatar className="h-24 w-24 border-4 border-white/20">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
              {user.full_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold font-syne text-white">
              {user.full_name}
            </h3>
            <div className="flex items-center justify-center gap-2">
              {user.dob && (
                <span className="text-sm text-white/70 font-outfit">
                  {new Date(user.dob).toLocaleDateString('en-US', {
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
                  user.member_type === 'student' 
                    ? "border-pink-500/40 bg-pink-500/20 text-pink-300" 
                    : "border-white/30 bg-white/10 text-white"
                )}
              >
                {user.member_type === 'student' ? 'Student' : 'Adult'}
              </Badge>
            </div>
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
              {course.song || course.dance_style}
            </div>
            {course.singer && (
              <div className="text-sm text-white/70 font-outfit mt-0.5">
                {course.singer}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-white/70 font-outfit">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formatCourseDateTime(course.scheduled_date, course.start_time).dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatCourseDateTime(course.scheduled_date, course.start_time).timeStr}</span>
            </div>
          </div>

          {/* Attendance Count */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-white/70 font-outfit text-sm">Current Attendance:</span>
              <span className="font-syne font-bold text-white text-lg">
                {currentAttendance}/{course.capacity}
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
            {subscriptionInfo?.hasSubscription ? (
              <Badge variant="subscription" className="font-semibold">Subscription</Badge>
            ) : (
              <Badge variant="single" className="font-semibold">Single Class</Badge>
            )}
          </div>

          {/* Subscription Details */}
          {subscriptionInfo?.hasSubscription && subscriptionInfo.subscriptionDetails && (
            <>
              <div className="border-t border-white/10" />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 font-outfit">Plan:</span>
                  <span className="text-white font-outfit font-semibold">
                    {formatSubscriptionType(subscriptionInfo.subscriptionDetails.type)}
                  </span>
                </div>
                
                {subscriptionInfo.subscriptionDetails.remainingCredits !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70 font-outfit">Remaining:</span>
                    <span className="text-white font-syne font-bold text-lg">
                      {subscriptionInfo.subscriptionDetails.remainingCredits}
                    </span>
                  </div>
                )}
                
                {subscriptionInfo.subscriptionDetails.endDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70 font-outfit">Valid Until:</span>
                    <span className="text-white font-outfit">
                      {new Date(subscriptionInfo.subscriptionDetails.endDate).toLocaleDateString('en-US', {
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

        {/* Warning Message */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-300 font-outfit">
            {subscriptionInfo?.hasSubscription 
              ? 'Subscription will be used and credits will be deducted if applicable.'
              : 'This will create a drop-in booking and check in the user immediately.'}
          </p>
        </div>

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
                onClick={() => onPaymentMethodChange(method)}
                className={cn(
                  'px-4 py-2 rounded-lg border transition-all font-outfit text-sm font-semibold',
                  paymentMethod === method
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-transparent'
                    : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
                )}
              >
                {method === 'cash' ? 'Cash' : method === 'twint' ? 'TWINT' : 'Abo'}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !paymentMethod}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm & Check-in'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
