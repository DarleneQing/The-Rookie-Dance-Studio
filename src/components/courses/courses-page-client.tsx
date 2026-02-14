'use client'

import { useState, useCallback, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CourseWithBookingCount, BookingWithCourse } from '@/types/courses'
import { bookCourse, cancelBooking } from '@/app/courses/booking-actions'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CoursesList } from './courses-list'
import { BookCourseDialog } from './book-course-dialog'
import { CancelBookingDialog } from './cancel-booking-dialog'

interface CoursesPageClientProps {
  allCourses: CourseWithBookingCount[]
  bookedCourses: CourseWithBookingCount[]
  bookingsMap: Map<string, BookingWithCourse>
  canCancelMap: Map<string, boolean>
  hasActiveSubscription: boolean
  subscriptionType?: string | null
  isLoggedIn: boolean
}

export function CoursesPageClient({
  allCourses,
  bookedCourses,
  bookingsMap,
  canCancelMap,
  hasActiveSubscription,
  subscriptionType,
  isLoggedIn,
}: CoursesPageClientProps) {
  const router = useRouter()
  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null)
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null)
  const [selectedCourseForBooking, setSelectedCourseForBooking] = useState<CourseWithBookingCount | null>(null)
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<BookingWithCourse | null>(null)

  const handleBookClick = useCallback(
    (courseId: string) => {
      if (!isLoggedIn) {
        router.push('/login?callbackUrl=/courses')
        return
      }
      const course = allCourses.find((c) => c.id === courseId)
      if (course) {
        setSelectedCourseForBooking(course)
      }
    },
    [isLoggedIn, router, allCourses]
  )

  const handleBookConfirm = useCallback(async () => {
    if (!selectedCourseForBooking) return

    setBookingLoadingId(selectedCourseForBooking.id)
    try {
      const result = await bookCourse(selectedCourseForBooking.id)

      if (result.success) {
        toast.success(result.message || 'Course booked successfully!')
        startTransition(() => router.refresh())
      } else {
        toast.error(result.message || 'Failed to book course')
      }
    } catch (error) {
      toast.error('An error occurred while booking')
      console.error(error)
    } finally {
      setBookingLoadingId(null)
      setSelectedCourseForBooking(null)
    }
  }, [selectedCourseForBooking, router])

  const handleCancelClick = useCallback(
    (bookingId: string) => {
      const booking = Array.from(bookingsMap.values()).find((b) => b.id === bookingId)
      if (booking) {
        setSelectedBookingForCancel(booking)
      }
    },
    [bookingsMap]
  )

  const handleCancelConfirm = useCallback(async () => {
    if (!selectedBookingForCancel) return

    setCancelLoadingId(selectedBookingForCancel.id)
    try {
      const result = await cancelBooking(selectedBookingForCancel.id)

      if (result.success) {
        toast.success(result.message || 'Booking cancelled successfully')
        startTransition(() => router.refresh())
      } else {
        toast.error(result.message || 'Failed to cancel booking')
      }
    } catch (error) {
      toast.error('An error occurred while cancelling')
      console.error(error)
    } finally {
      setCancelLoadingId(null)
      setSelectedBookingForCancel(null)
    }
  }, [selectedBookingForCancel, router])

  return (
    <>
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="bookings">
            Your Bookings ({bookedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Courses ({allCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <CoursesList
            courses={bookedCourses}
            userBookings={bookingsMap}
            canCancelMap={canCancelMap}
            onBook={handleBookClick}
            onCancel={handleCancelClick}
            bookingLoadingId={bookingLoadingId}
            cancelLoadingId={cancelLoadingId}
            emptyMessage="No upcoming bookings. Browse courses to book your first class!"
          />
        </TabsContent>

        <TabsContent value="all">
          <CoursesList
            courses={allCourses}
            userBookings={bookingsMap}
            canCancelMap={canCancelMap}
            onBook={handleBookClick}
            onCancel={handleCancelClick}
            bookingLoadingId={bookingLoadingId}
            cancelLoadingId={cancelLoadingId}
            emptyMessage="No upcoming courses available."
          />
        </TabsContent>
      </Tabs>

      {/* Book Course Dialog */}
      {selectedCourseForBooking && (
        <BookCourseDialog
          course={selectedCourseForBooking}
          hasActiveSubscription={hasActiveSubscription}
          subscriptionType={subscriptionType}
          onConfirm={handleBookConfirm}
          onClose={() => setSelectedCourseForBooking(null)}
        >
          <div />
        </BookCourseDialog>
      )}

      {/* Cancel Booking Dialog */}
      {selectedBookingForCancel && (
        <CancelBookingDialog
          booking={selectedBookingForCancel}
          canCancel={canCancelMap.get(selectedBookingForCancel.id) || false}
          onConfirm={handleCancelConfirm}
          onClose={() => setSelectedBookingForCancel(null)}
        >
          <div />
        </CancelBookingDialog>
      )}
    </>
  )
}
