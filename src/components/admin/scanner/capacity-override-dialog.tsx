'use client'

import type { CourseWithBookingCount } from '@/types/courses'
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

interface CapacityOverrideDialogProps {
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
}

export function CapacityOverrideDialog({
  open,
  onOpenChange,
  user,
  course,
  currentAttendance,
  onConfirm,
  loading = false,
  subscriptionInfo = null,
}: CapacityOverrideDialogProps) {

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Capacity Exceeded
          </DialogTitle>
          <DialogDescription className="text-white/70">
            This course is at full capacity. Override to allow check-in anyway?
          </DialogDescription>
        </DialogHeader>

        {/* Capacity Warning */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 font-outfit text-sm">Current Capacity:</span>
            <Badge variant="full" className="font-bold">
              {currentAttendance}/{course.capacity} FULL
            </Badge>
          </div>
          <p className="text-xs text-red-300 font-outfit">
            Checking in this user will exceed the course capacity limit.
          </p>
        </div>

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
            disabled={loading}
            className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 hover:opacity-90 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Override & Check-in
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
