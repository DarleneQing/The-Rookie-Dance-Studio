import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCourses, getUserBookings, canCancelBooking } from '@/app/courses/actions'
import { MemberLayout } from '@/components/navigation/member-layout'
import { CoursesPageClient } from '@/components/courses/courses-page-client'
import { FloatingElementsLazy } from '@/components/auth/floating-elements-lazy'
import { Toaster } from 'sonner'

export default async function CoursesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch user profile for subscription status (not currently used but may be needed for future features)
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('*')
  //   .eq('id', user.id)
  //   .single()

  // Fetch active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  // Fetch courses and user bookings in parallel
  const today = new Date().toISOString().split('T')[0]
  
  const [allCourses, userBookingsData] = await Promise.all([
    getCourses({
      status: 'scheduled',
      fromDate: today,
    }),
    getUserBookings(),
  ])

  // Check cancellation eligibility for each booking (parallel)
  const canCancelResults = userBookingsData.length > 0
    ? await Promise.all(userBookingsData.map((b) => canCancelBooking(b.id)))
    : []
  const canCancelMap = new Map(
    userBookingsData.map((b, i) => [b.id, canCancelResults[i] ?? false])
  )

  // Create a map of course_id to booking for quick lookup
  const bookingsMap = new Map(
    userBookingsData.map((booking) => [booking.course_id, booking])
  )

  // Separate booked courses from all courses
  const bookedCourses = allCourses.filter((course) => bookingsMap.has(course.id))
  
  return (
    <MemberLayout>
      <main className="relative min-h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0 bg-black" />

        {/* Floating decorative elements */}
        <FloatingElementsLazy />

        {/* Content */}
        <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-8 pb-8 px-4">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
            <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-4 md:p-6 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />

              {/* Header */}
              <div className="mb-6">
                <h2 className="font-syne font-bold text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple px-2">
                  Upcoming Courses
                </h2>
                <p className="text-white/70 font-outfit text-sm mt-2 px-2">
                  Browse and book dance courses
                </p>
              </div>

              {/* Client Component with Tabs and Actions */}
              <CoursesPageClient
                allCourses={allCourses}
                bookedCourses={bookedCourses}
                bookingsMap={bookingsMap}
                canCancelMap={canCancelMap}
                hasActiveSubscription={!!subscription}
                subscriptionType={subscription?.type}
              />
            </div>
          </div>
          <Toaster position="top-center" />
        </div>
      </main>
    </MemberLayout>
  )
}
