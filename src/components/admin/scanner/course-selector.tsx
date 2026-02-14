'use client'

import type { CourseWithBookingCount } from '@/types/courses'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CourseSelectorProps {
  courses: CourseWithBookingCount[]
  selectedCourseId: string | null
  onSelectCourse: (courseId: string) => void
  attendanceCount: number
}

export function CourseSelector({
  courses,
  selectedCourseId,
  onSelectCourse,
  attendanceCount,
}: CourseSelectorProps) {
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getCapacityColor = (current: number, max: number) => {
    const percentage = (current / max) * 100
    if (percentage >= 100) return 'text-red-400'
    if (percentage >= 80) return 'text-orange-400'
    return 'text-green-400'
  }

  if (courses.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
        <Calendar className="h-12 w-12 text-white/40 mx-auto mb-3" />
        <p className="text-white/70 font-outfit text-sm">
          No courses scheduled for today
        </p>
      </div>
    )
  }

  if (courses.length === 1 && !selectedCourseId) {
    // Auto-select the only course
    onSelectCourse(courses[0].id)
  }

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  return (
    <div className="space-y-3">
      {/* Selected Course Display */}
      {selectedCourse && (
        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/20 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-syne font-bold text-lg text-white">
                {selectedCourse.song || selectedCourse.dance_style}
              </h3>
              {selectedCourse.singer && (
                <p className="text-sm text-white/70 font-outfit">
                  {selectedCourse.singer}
                </p>
              )}
            </div>
            <Badge variant="scheduled" className="font-semibold">
              Today
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-white/80 font-outfit">
              <Clock className="h-4 w-4 text-white/60" />
              <span>{formatTime(selectedCourse.start_time)}</span>
            </div>
            {selectedCourse.instructor && (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={selectedCourse.instructor.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white text-xs">
                    {selectedCourse.instructor.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white/80 font-outfit text-xs truncate">
                  {selectedCourse.instructor.full_name}
                </span>
              </div>
            )}
          </div>

          {/* Attendance Count */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white/60" />
              <span className="text-white/70 font-outfit text-sm">Attendance:</span>
            </div>
            <span className={cn('font-syne font-bold text-2xl', getCapacityColor(attendanceCount, selectedCourse.capacity))}>
              {attendanceCount}/{selectedCourse.capacity}
            </span>
          </div>

          {/* Bookings Count */}
          <div className="flex items-center justify-between text-xs text-white/60 font-outfit">
            <span>Pre-booked:</span>
            <span>{selectedCourse.booking_count}/{selectedCourse.capacity}</span>
          </div>
        </div>
      )}

      {/* Course List (if multiple courses) */}
      {courses.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-white/60 font-outfit">Select Course:</p>
          <div className="space-y-2">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => onSelectCourse(course.id)}
                className={cn(
                  'w-full text-left bg-white/5 hover:bg-white/10 rounded-xl p-3 border transition-all',
                  selectedCourseId === course.id
                    ? 'border-rookie-purple bg-white/10'
                    : 'border-white/10'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-syne font-semibold text-white text-sm">
                      {course.song || course.dance_style}
                    </div>
                    <div className="text-xs text-white/60 font-outfit">
                      {formatTime(course.start_time)}
                    </div>
                  </div>
                  <div className="text-xs text-white/60 font-outfit">
                    {course.booking_count}/{course.capacity}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
