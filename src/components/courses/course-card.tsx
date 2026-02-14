'use client'

import React from 'react'
import type { CourseWithBookingCount, Booking } from '@/types/courses'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar, Clock, Users, CheckCircle2, ExternalLink, Music } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, getTimeInterval } from '@/lib/utils/date-formatters'

interface CourseCardProps {
  course: CourseWithBookingCount
  userBooking: Booking | null
  canCancelBooking: boolean
  onBook: () => void
  onCancel: () => void
  bookingLoading?: boolean
  cancelLoading?: boolean
}

function CourseCardComponent({
  course,
  userBooking,
  canCancelBooking,
  onBook,
  onCancel,
  bookingLoading = false,
  cancelLoading = false,
}: CourseCardProps) {
  const getCapacityColor = (current: number, max: number) => {
    const percentage = (current / max) * 100
    if (percentage >= 100) return 'text-red-400'
    if (percentage >= 80) return 'text-orange-400'
    return 'text-green-400'
  }

  const isFull = course.booking_count >= course.capacity
  const isBooked = !!userBooking

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg space-y-3 hover:bg-white/15 transition-all duration-200">
      {/* Header with Song Name or Dance Style and Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-syne font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple">
            {course.song || course.dance_style}
          </h3>
          {course.singer && (
            <p className="text-sm text-white/70 font-outfit mt-1">
              {course.singer}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 items-end">
          <Badge 
            variant={course.dance_style === 'Kpop' ? 'subscription' : 'single'}
            className="font-outfit font-semibold"
          >
            {course.dance_style}
          </Badge>
          {isFull && <Badge variant="full">FULL</Badge>}
          {isBooked && (
            <Badge variant="subscription" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Booked
            </Badge>
          )}
        </div>
      </div>

      {/* Date and Time */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-sm text-white/80 font-outfit">
          <Calendar className="h-4 w-4 text-white/60" />
          <span>{formatDate(course.scheduled_date, { includeWeekday: true })}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-white/80 font-outfit">
          <Clock className="h-4 w-4 text-white/60" />
          <span>{getTimeInterval(course.start_time, course.duration_minutes)}</span>
        </div>
      </div>

      {/* Instructor */}
      <div className="flex items-center gap-2">
        {course.instructor ? (
          <>
            <Avatar className="h-8 w-8">
              <AvatarImage src={course.instructor.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white text-xs">
                {course.instructor.full_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-white font-outfit">
              {course.instructor.full_name}
            </span>
          </>
        ) : (
          <span className="text-sm text-white/60 font-outfit italic">Unassigned</span>
        )}
      </div>


      {/* Capacity and Video Link */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-white/60" />
          <span className={cn('text-sm font-outfit font-semibold', getCapacityColor(course.booking_count, course.capacity))}>
            {course.booking_count}/{course.capacity} spots
          </span>
        </div>
        {course.video_link && (
          <a
            href={course.video_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-rookie-cyan hover:text-rookie-cyan/80 font-outfit font-medium transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Music className="h-3.5 w-3.5" />
            Check Video
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-white/10">
        {isBooked ? (
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    disabled={!canCancelBooking || cancelLoading}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelLoading ? 'Cancelling...' : canCancelBooking ? 'Cancel Booking' : 'Cancel Not Available'}
                  </Button>
                </div>
              </TooltipTrigger>
              {!canCancelBooking && (
                <TooltipContent>
                  <p>Cannot cancel within 24 hours of start</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        ) : (
          <Button
            onClick={onBook}
            disabled={isFull || bookingLoading}
            className={cn(
              'w-full font-outfit',
              isFull
                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-rookie-purple to-rookie-pink hover:opacity-90'
            )}
          >
            {bookingLoading ? 'Booking...' : isFull ? 'Full - Cannot Book' : 'Book Now'}
          </Button>
        )}
      </div>
    </div>
  )
}

export const CourseCard = React.memo(CourseCardComponent)
