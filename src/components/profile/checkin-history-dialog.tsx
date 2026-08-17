"use client"

import React, { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Music } from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/utils/date-formatters"
import { BookingTypeBadge } from "@/components/ui/booking-type-badge"
import type { BookingType } from "@/types/courses"
import { unwrapSupabaseRelation } from "@/lib/utils/supabase-helpers"
import { getDisplayDanceStyle } from "@/lib/utils"
import { groupHistoryByMonth } from "@/lib/history-grouping"

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
  const groupedCheckins = useMemo(
    () => groupHistoryByMonth(checkins, checkin => {
      const course = unwrapSupabaseRelation(checkin.course)
      return course?.scheduled_date || checkin.created_at
    }),
    [checkins]
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[520px] max-h-[80vh] overflow-x-hidden overflow-y-auto bg-popover border-border/60 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-syne text-white">
            Course History
          </DialogTitle>
          <DialogDescription className="sr-only">
            Courses you have attended
          </DialogDescription>
        </DialogHeader>

        {checkins.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="flex justify-center">
              <div className="bg-white/10 rounded-full p-4">
                <Music className="h-10 w-10 text-foreground/40" />
              </div>
            </div>
            <p className="text-foreground/70 font-outfit">No classes attended yet.</p>
            <p className="text-foreground/50 font-outfit text-sm">Book your first course to get started!</p>
          </div>
        ) : (
          <div className="min-w-0 space-y-6 py-1">
            {groupedCheckins.map(group => {
              const headingId = `course-history-${group.label.toLowerCase().replace(/\s+/g, '-')}`

              return (
                <section key={group.label} aria-labelledby={headingId} className="min-w-0">
                  <h3
                    id={headingId}
                    className="px-1 pb-2 font-outfit text-xs font-semibold uppercase tracking-widest text-rookie-blue"
                  >
                    {group.label}
                  </h3>

                  <ol className="min-w-0 divide-y divide-border/40 border-y border-border/40">
                    {group.items.map(c => {
                      const course = unwrapSupabaseRelation(c.course)
                      const instructor = course?.instructor
                        ? unwrapSupabaseRelation(course.instructor)
                        : null
                      const title = course?.song || (
                        course?.dance_style
                          ? getDisplayDanceStyle(course.dance_style)
                          : "Class"
                      )

                      return (
                        <li key={c.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-1 py-4">
                          <div className="min-w-0 overflow-hidden space-y-1">
                            <h4 className="truncate font-syne text-base font-bold text-foreground">
                              {title}
                            </h4>

                            {course?.singer && (
                              <p className="truncate font-outfit text-sm text-foreground/70">
                                {course.singer}
                              </p>
                            )}

                            <p className="font-outfit text-sm text-foreground/60">
                              {course
                                ? formatDateTime(course.scheduled_date, course.start_time)
                                : formatDate(c.created_at)}
                              {instructor && (
                                <>
                                  <span className="sr-only">, </span>
                                  <span className="px-1.5" aria-hidden="true">·</span>
                                  {instructor.full_name}
                                </>
                              )}
                            </p>

                            {!course && (
                              <p className="font-outfit text-xs italic text-foreground/50">
                                Legacy check-in
                              </p>
                            )}
                          </div>

                          <BookingTypeBadge
                            type={c.booking_type}
                            size="small"
                            className="shrink-0"
                          />
                        </li>
                      )
                    })}
                  </ol>
                </section>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

