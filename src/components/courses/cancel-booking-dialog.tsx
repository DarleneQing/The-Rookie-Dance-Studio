'use client'

import { useState } from 'react'
import type { BookingWithCourse } from '@/types/courses'
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
import { Calendar, Clock, AlertTriangle, Loader2, Info, ExternalLink, Music } from 'lucide-react'

interface CancelBookingDialogProps {
  booking: BookingWithCourse
  canCancel: boolean
  children: React.ReactNode
  onConfirm: () => Promise<void>
  onClose?: () => void
}

export function CancelBookingDialog({
  booking,
  canCancel,
  children,
  onConfirm,
  onClose,
}: CancelBookingDialogProps) {
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen && onClose) {
      onClose()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getTimeInterval = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':')
    const startDate = new Date()
    startDate.setHours(parseInt(hours), parseInt(minutes), 0)
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    
    const formatTimeShort = (date: Date) => {
      const hour = date.getHours()
      const minute = date.getMinutes()
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      const displayMinute = minute.toString().padStart(2, '0')
      return `${displayHour}:${displayMinute} ${ampm}`
    }
    
    return `${formatTimeShort(startDate)} - ${formatTimeShort(endDate)}`
  }

  const getTimeUntilCourse = () => {
    const courseDateTime = new Date(`${booking.course.scheduled_date}T${booking.course.start_time}`)
    const now = new Date()
    const diffMs = courseDateTime.getTime() - now.getTime()
    
    if (diffMs < 0) return 'Course has started'
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    const parts = []
    if (diffDays > 0) parts.push(`${diffDays} day${diffDays !== 1 ? 's' : ''}`)
    if (diffHours > 0) parts.push(`${diffHours} hour${diffHours !== 1 ? 's' : ''}`)
    if (diffMinutes > 0 || parts.length === 0) parts.push(`${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`)
    
    return parts.join(' ')
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (error) {
      console.error('Cancellation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBookingTypeBadge = (type: string) => {
    switch (type) {
      case 'subscription':
        return <Badge variant="subscription">Subscription</Badge>
      case 'single':
        return <Badge variant="single">Single</Badge>
      case 'drop_in':
        return <Badge variant="drop_in">Drop-in</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl flex items-center gap-2">
            {!canCancel && <AlertTriangle className="h-5 w-5 text-orange-400" />}
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            {canCancel
              ? 'Are you sure you want to cancel this booking?'
              : 'This booking cannot be cancelled.'}
          </DialogDescription>
        </DialogHeader>

        {/* Course Summary */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-syne font-bold text-lg text-white mb-1">
                {booking.course.song || booking.course.dance_style}
              </h4>
              {booking.course.singer && (
                <p className="text-sm text-white/70 font-outfit mb-1">
                  {booking.course.singer}
                </p>
              )}
              {!booking.course.song && (
                <p className="text-xs text-white/50 font-outfit mb-1">
                  {booking.course.dance_style}
                </p>
              )}
              {booking.course.instructor && (
                <p className="text-sm text-white/70 font-outfit">
                  with {booking.course.instructor.full_name}
                </p>
              )}
            </div>
            {getBookingTypeBadge(booking.booking_type)}
          </div>

          <div className="space-y-2 text-sm text-white/80 font-outfit">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-white/60" />
              <span>{formatDate(booking.course.scheduled_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/60" />
              <span>{getTimeInterval(booking.course.start_time, booking.course.duration_minutes)}</span>
            </div>
            {booking.course.video_link && (
              <div className="pt-1">
                <a
                  href={booking.course.video_link}
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

        {/* Time Until Course */}
        <div className={`rounded-xl p-3 border ${canCancel ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
          <div className="flex items-start gap-2">
            {canCancel ? (
              <Info className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-outfit mb-1 ${canCancel ? 'text-green-300' : 'text-orange-300'}`}>
                Course starts in: <span className="font-semibold">{getTimeUntilCourse()}</span>
              </p>
              <p className={`text-xs font-outfit ${canCancel ? 'text-green-400/80' : 'text-orange-400/80'}`}>
                {canCancel
                  ? 'You can cancel this booking. The spot will be freed for other members.'
                  : 'Cancellations must be made at least 3 hours before the course start time.'}
              </p>
            </div>
          </div>
        </div>

        {/* Cancellation Policy */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <p className="text-xs text-white/60 font-outfit">
            <span className="font-semibold text-white/80">Cancellation Policy:</span> Bookings can be cancelled up to 3 hours before the course start time. Late cancellations are not permitted.
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Keep Booking
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canCancel || loading}
            className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Booking'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
