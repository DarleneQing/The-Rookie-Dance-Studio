"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, User, Music } from "lucide-react"
import { formatDateTime } from "@/lib/utils/date-formatters"
import { BookingTypeBadge } from "@/components/ui/booking-type-badge"
import type { BookingType } from "@/types/courses"
import { unwrapSupabaseRelation } from "@/lib/utils/supabase-helpers"

// Supabase returns arrays for relations, so we need to handle that
export interface CheckinHistoryItem {
  id: string
  created_at: string
  subscription_id: string | null
  booking_type: BookingType
  course: Array<{
    id: string
    dance_style: string
    scheduled_date: string
    start_time: string
    song: string | null
    singer: string | null
    instructor: Array<{
      id: string
      full_name: string
      avatar_url: string | null
    }> | null
  }> | null
}

interface CheckinHistoryDialogProps {
  children: React.ReactNode
  checkins: CheckinHistoryItem[]
}

export function CheckinHistoryDialog({
  children,
  checkins,
}: CheckinHistoryDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[520px] max-h-[80vh] overflow-y-auto bg-black/90 border-white/20 backdrop-blur-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-syne text-white">
            Course History
          </DialogTitle>
        </DialogHeader>

        {checkins.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="flex justify-center">
              <div className="bg-white/10 rounded-full p-4">
                <Music className="h-10 w-10 text-white/40" />
              </div>
            </div>
            <p className="text-white/70 font-outfit">No classes attended yet.</p>
            <p className="text-white/50 font-outfit text-sm">Book your first course to get started!</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {checkins.map((c) => {
              const course = unwrapSupabaseRelation(c.course)
              const instructor = course?.instructor 
                ? unwrapSupabaseRelation(course.instructor)
                : null

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3"
                >
                  {/* Course Title and Singer */}
                  <div>
                    <div className="font-syne font-bold text-white text-lg">
                      {course?.song || course?.dance_style || 'Class'}
                    </div>
                    {course?.singer && (
                      <div className="text-sm text-white/70 font-outfit mt-0.5">
                        {course.singer}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/10" />

                  {/* Date and Time */}
                  {course && (
                    <div className="flex items-center gap-2 text-sm text-white/60 font-outfit">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDateTime(course.scheduled_date, course.start_time)}</span>
                    </div>
                  )}

                  {/* Instructor */}
                  {instructor && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-white/60" />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={instructor.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white text-xs">
                          {instructor.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-white/70 font-outfit">
                        {instructor.full_name}
                      </span>
                    </div>
                  )}

                  {/* Booking Type Badge */}
                  <div className="flex items-center justify-between pt-2">
                    <BookingTypeBadge type={c.booking_type} size="small" />
                    <div className="flex items-center gap-1 text-xs text-white/50 font-outfit">
                      <Clock className="h-3 w-3" />
                      {new Date(c.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>

                  {/* Legacy check-in notice */}
                  {!course && (
                    <div className="text-xs text-white/50 font-outfit italic">
                      Legacy check-in (before course system)
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

