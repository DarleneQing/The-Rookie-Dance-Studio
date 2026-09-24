import { FloatingElements } from '@/components/auth/floating-elements'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/cached'
import { getCourses, canCancelBookings } from '@/app/courses/actions'
import { MemberLayout } from '@/components/navigation/member-layout'
import { CoursesPageClient } from '@/components/courses/courses-page-client'
import { WhatsAppGroupCard } from '@/components/courses/whatsapp-group-card'
import { getZurichToday } from '@/lib/utils/date-helpers'
import { Footer } from '@/components/footer'
import {
  pickUsableSubscription,
  usableSubscriptionFilter,
} from '@/lib/utils/subscription-helpers'
import type { BookingWithCourse } from '@/types/courses'


const coursesPageContent = (
  allCourses: Awaited<ReturnType<typeof getCourses>>,
  bookedCourses: Awaited<ReturnType<typeof getCourses>>,
  bookingsMap: Map<string, BookingWithCourse>,
  canCancelMap: Map<string, boolean>,
  hasActiveSubscription: boolean,
  subscriptionType: string | null,
  isLoggedIn: boolean
) => (
  <main id="main-content" className="relative min-h-screen overflow-hidden">
    <div className="absolute inset-0 z-0 bg-background" />
    {!isLoggedIn && <FloatingElements />}
    <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-8 pb-8 px-4">
      <div className="relative">
        <div className="relative bg-card border border-border/60 rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden">
          <div className="mb-6 space-y-4">
            <h1 className="bg-gradient-to-r from-white via-rookie-pink to-rookie-blue bg-clip-text px-2 font-syne text-2xl font-bold text-transparent md:text-3xl">
              Upcoming Courses
            </h1>
            <WhatsAppGroupCard />
          </div>
          <CoursesPageClient
            allCourses={allCourses}
            bookedCourses={bookedCourses}
            bookingsMap={bookingsMap}
            canCancelMap={canCancelMap}
            hasActiveSubscription={hasActiveSubscription}
            subscriptionType={subscriptionType}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </div>
    </div>
  </main>
)

export default async function CoursesPage() {
  const today = getZurichToday()

  const [user, allCourses] = await Promise.all([
    getCachedUser(),
    getCourses({ status: 'scheduled', fromDate: today }),
  ])

  if (!user) {
    const bookingsMap = new Map<string, BookingWithCourse>()
    const canCancelMap = new Map<string, boolean>()
    const bookedCourses: Awaited<ReturnType<typeof getCourses>> = []
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <div className="w-full text-center pt-8 pb-2 px-4">
            <h2 className="font-syne font-bold text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-blue">
              The Rookie Dance Studio
            </h2>
          </div>
          {coursesPageContent(allCourses, bookedCourses, bookingsMap, canCancelMap, false, null, false)}
        </div>
        <Footer />
      </div>
    )
  }

  const supabase = createClient()

  // getCourses already attached the user's confirmed booking to each course,
  // so the booked list is derived here instead of re-querying bookings.
  const bookedCourses = allCourses.filter((course) => course.user_booking)
  const bookingsMap = new Map<string, BookingWithCourse>(
    bookedCourses.map((course) => [course.id, { ...course.user_booking!, course }])
  )

  const [{ data: usableSubscriptions }, canCancelMap] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .or(usableSubscriptionFilter(today))
      .order('created_at', { ascending: false }),
    canCancelBookings(bookedCourses.map((course) => course.user_booking!.id)),
  ])
  const subscription = pickUsableSubscription(usableSubscriptions)

  return (
    <MemberLayout>
      {coursesPageContent(
        allCourses,
        bookedCourses,
        bookingsMap,
        canCancelMap,
        !!subscription,
        subscription?.type ?? null,
        true
      )}
    </MemberLayout>
  )
}
