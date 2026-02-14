'use client'

import { useState } from 'react'
import type { CourseWithBookingCount } from '@/types/courses'
import { useToggle } from '@/hooks/use-toggle'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, Loader2, ExternalLink, Music, AlertCircle } from 'lucide-react'
import { formatDate, getTimeInterval } from '@/lib/utils/date-formatters'
import { getDisplayDanceStyle } from '@/lib/utils'

interface BookCourseDialogProps {
  course: CourseWithBookingCount
  hasActiveSubscription: boolean
  subscriptionType?: string | null
  children: React.ReactNode
  onConfirm: () => Promise<void>
  onClose?: () => void
}

export function BookCourseDialog({
  course,
  hasActiveSubscription,
  subscriptionType,
  children,
  onConfirm,
  onClose,
}: BookCourseDialogProps) {
  const [open, setOpen] = useToggle(true)
  const [loading, setLoading] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen && onClose) onClose()
  }


  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (error) {
      console.error('Booking error:', error)
    } finally {
      setLoading(false)
    }
  }

  const bookingTypeLabel = hasActiveSubscription
    ? subscriptionType?.replace('_', '-') || 'subscription'
    : 'single class'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-syne text-xl">Book Course</DialogTitle>
          <DialogDescription>
            Confirm your booking for this dance course.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 pr-2">
        {/* Course Summary */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
          <div>
            <h4 className="font-syne font-bold text-lg text-white mb-1">
              {course.song || getDisplayDanceStyle(course.dance_style)}
            </h4>
            {course.singer && (
              <p className="text-sm text-white/70 font-outfit mb-1">
                {course.singer}
              </p>
            )}
            {!course.song && (
              <p className="text-xs text-white/50 font-outfit mb-1">
                {getDisplayDanceStyle(course.dance_style)}
              </p>
            )}
            {course.instructor && (
              <p className="text-sm text-white/70 font-outfit">
                with {course.instructor.full_name}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm text-white/80 font-outfit">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-white/60" />
              <span>{formatDate(course.scheduled_date, { includeWeekday: true, includeYear: true, weekdayStyle: 'long', monthStyle: 'long' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/60" />
              <span>{getTimeInterval(course.start_time, course.duration_minutes)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/60" />
              <span>{course.booking_count}/{course.capacity} spots booked</span>
            </div>
            {course.video_link && (
              <div className="pt-1">
                <a
                  href={course.video_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-rookie-cyan hover:text-rookie-cyan/80 transition-colors"
                >
                  <Music className="h-4 w-4" />
                  <span>Check Video</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Important Rules */}
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <h4 className="font-syne font-semibold text-white">Important Information</h4>
          </div>
          <ol className="space-y-2 text-sm text-white/90 font-outfit list-decimal list-inside">
            <li>Please bring a pair of clean training shoes (make sure that the sole is also clean) as required by the venue.</li>
            <li>No eating is allowed inside the venue.</li>
            <li>Cancellation is only free 24 hours before the class scheduled time. Late cancellation results in full contribution fees.</li>
          </ol>
        </div>

        {/* Booking Type */}
        <div className="bg-rookie-purple/10 rounded-xl p-3 border border-rookie-purple/30">
          <p className="text-sm text-white/90 font-outfit mb-2">
            {hasActiveSubscription ? (
              <>You will book with your <span className="font-semibold capitalize">{bookingTypeLabel}</span> subscription.</>
            ) : (
              <>You will book as a <span className="font-semibold">single class</span>.</>
            )}
          </p>
          {hasActiveSubscription ? (
            <Badge variant="subscription" className="text-xs">Subscription Booking</Badge>
          ) : (
            <Badge variant="single" className="text-xs">Single Class Booking</Badge>
          )}
        </div>

        {/* Agreement Section */}
        <div className="bg-rookie-cyan/10 rounded-xl p-4 border border-rookie-cyan/30">
          <p className="text-sm text-white/90 font-outfit leading-relaxed mb-2">
            By clicking &quot;Confirm Booking&quot;, I agree to the following:
          </p>
          <ul className="space-y-1 text-sm text-white/80 font-outfit list-disc list-inside ml-1">
            <li>I have read and understood the rules above.</li>
            <li>I agree to contribute fees so as to cover the cost of running (CHF 10.- for students and CHF 15.- for general public).</li>
          </ul>
        </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full sm:w-auto bg-gradient-to-r from-rookie-purple to-rookie-pink hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              'Confirm Booking'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
