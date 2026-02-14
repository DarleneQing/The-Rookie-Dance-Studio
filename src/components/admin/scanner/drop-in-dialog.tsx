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
import { AlertTriangle, Clock, Users, Loader2 } from 'lucide-react'

interface DropInDialogProps {
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

export function DropInDialog({
  open,
  onOpenChange,
  user,
  course,
  currentAttendance,
  onConfirm,
  loading = false,
}: DropInDialogProps) {
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
          <DialogTitle className="font-syne text-xl flex items-center gap-2 text-orange-400">
            <AlertTriangle className="h-5 w-5" />
            Drop-in Check-in
          </DialogTitle>
          <DialogDescription className="text-white/70">
            No booking found for this course. Confirm to create drop-in booking and check-in.
          </DialogDescription>
        </DialogHeader>

        {/* User Info */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
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
                Member
              </div>
            </div>
          </div>
        </div>

        {/* Course Info */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
          <div>
            <div className="font-syne font-bold text-white">
              {course.song || course.dance_style}
            </div>
            {course.singer && (
              <div className="text-sm text-white/70 font-outfit">
                {course.singer}
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm text-white/80 font-outfit">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/60" />
              <span>Today • {formatTime(course.start_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/60" />
              <span>Current: {currentAttendance}/{course.capacity}</span>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-300 font-outfit">
            This will create a drop-in booking and check in the user immediately.
          </p>
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
