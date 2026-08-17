import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/cached'
import { getCourses, getUserBookings, canCancelBookings } from '@/app/courses/actions'
import { MemberLayout } from '@/components/navigation/member-layout'
import { CoursesPageClient } from '@/components/courses/courses-page-client'
import { getZurichToday } from '@/lib/utils/date-helpers'
import { Footer } from '@/components/footer'
import { usableSubscriptionFilter } from '@/lib/utils/subscription-helpers'

const FloatingElementsLazy = dynamic(
  () =>
    import('@/components/auth/floating-elements-lazy').then((mod) => ({
      default: mod.FloatingElementsLazy,
    })),
  { ssr: false }
)

const coursesPageContent = (
  allCourses: Awaited<ReturnType<typeof getCourses>>,
  bookedCourses: Awaited<ReturnType<typeof getCourses>>,
  bookingsMap: Map<string, Awaited<ReturnType<typeof getUserBookings>>[number]>,
  canCancelMap: Map<string, boolean>,
  hasActiveSubscription: boolean,
  subscriptionType: string | null,
  isLoggedIn: boolean
) => (
  <main id="main-content" className="relative min-h-screen overflow-hidden">
    <div className="absolute inset-0 z-0 bg-background" />
    {!isLoggedIn && <FloatingElementsLazy />}
    <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-8 pb-8 px-4">
      <div className="relative">
        <div className="relative bg-card border border-border/60 rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden">
          <div className="mb-6">
            <h1 className="font-syne font-bold text-2xl md:text-3xl text-foreground px-2">
              Upcoming Courses
            </h1>
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
    const bookingsMap = new Map<string, Awaited<ReturnType<typeof getUserBookings>>[number]>()
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

  const [{ data: subscription }, userBookingsData] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .or(usableSubscriptionFilter(today))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getUserBookings(),
  ])

  const canCancelMap =
    userBookingsData.length > 0
      ? await canCancelBookings(userBookingsData.map((b) => b.id))
      : new Map<string, boolean>()
  const bookingsMap = new Map(
    userBookingsData.map((booking) => [booking.course_id, booking])
  )
  const bookedCourses = allCourses.filter((course) => bookingsMap.has(course.id))

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
