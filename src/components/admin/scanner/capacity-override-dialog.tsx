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
import { AlertTriangle, Clock, Users, Loader2 } from 'lucide-react'

interface CapacityOverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  course: CourseWithBookingCount
  currentAttendance: number
  onConfirm: () => Promise<void>
  loading?: boolean
}

export function CapacityOverrideDialog({
  open,
  onOpenChange,
  user,
  course,
  currentAttendance,
  onConfirm,
  loading = false,
}: CapacityOverrideDialogProps) {
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

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

        {/* User Info */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne text-lg">
                {user.full_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-syne font-bold text-white text-lg">
                {user.full_name}
              </div>
              <div className="text-xs text-white/60 font-outfit">
                Drop-in Member
              </div>
            </div>
          </div>
        </div>

        {/* Course Info */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="font-syne font-semibold text-white text-sm mb-2">
            {course.song || course.dance_style}
          </div>
          <div className="flex items-center gap-3 text-xs text-white/70 font-outfit">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(course.start_time)}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {course.booking_count} booked
            </div>
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
