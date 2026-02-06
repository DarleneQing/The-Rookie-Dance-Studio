'use client'

import type { CourseWithBookingCount, Booking } from '@/types/courses'
import { CourseCard } from './course-card'
import { Calendar } from 'lucide-react'

interface CoursesListProps {
  courses: CourseWithBookingCount[]
  userBookings: Map<string, Booking>
  canCancelMap: Map<string, boolean>
  onBook: (courseId: string) => void
  onCancel: (bookingId: string) => void
  bookingLoadingId?: string | null
  cancelLoadingId?: string | null
  emptyMessage?: string
}

export function CoursesList({
  courses,
  userBookings,
  canCancelMap,
  onBook,
  onCancel,
  bookingLoadingId,
  cancelLoadingId,
  emptyMessage = 'No courses available.',
}: CoursesListProps) {
  if (courses.length === 0) {
    return (
      <div className="bg-white/10 rounded-2xl p-12 text-center border border-white/20">
        <Calendar className="h-12 w-12 text-white/40 mx-auto mb-4" />
        <p className="text-white/70 font-outfit">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((course) => {
        const userBooking = userBookings.get(course.id) || null
        const canCancel = userBooking ? canCancelMap.get(userBooking.id) || false : false

        return (
          <CourseCard
            key={course.id}
            course={course}
            userBooking={userBooking}
            canCancelBooking={canCancel}
            onBook={() => onBook(course.id)}
            onCancel={() => userBooking && onCancel(userBooking.id)}
            bookingLoading={bookingLoadingId === course.id}
            cancelLoading={userBooking ? cancelLoadingId === userBooking.id : false}
          />
        )
      })}
    </div>
  )
}
