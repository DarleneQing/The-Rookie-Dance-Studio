import { createClient } from '@/lib/supabase/server'
import { getCourses, getUserBookings, canCancelBooking } from '@/app/courses/actions'
import { MemberLayout } from '@/components/navigation/member-layout'
import { CoursesPageClient } from '@/components/courses/courses-page-client'
import { FloatingElementsLazy } from '@/components/auth/floating-elements-lazy'
import { Footer } from '@/components/footer'
import { Toaster } from 'sonner'

const coursesPageContent = (
  allCourses: Awaited<ReturnType<typeof getCourses>>,
  bookedCourses: Awaited<ReturnType<typeof getCourses>>,
  bookingsMap: Map<string, Awaited<ReturnType<typeof getUserBookings>>[number]>,
  canCancelMap: Map<string, boolean>,
  hasActiveSubscription: boolean,
  subscriptionType: string | null,
  isLoggedIn: boolean
) => (
  <main className="relative min-h-screen overflow-hidden">
    <div className="absolute inset-0 z-0 bg-black" />
    <FloatingElementsLazy />
    <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-8 pb-8 px-4">
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
        <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-4 md:p-6 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
          <div className="mb-6">
            <h2 className="font-syne font-bold text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple px-2">
              Upcoming Courses
            </h2>
            <p className="text-white/70 font-outfit text-sm mt-2 px-2">
              Browse and book dance courses
            </p>
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
      <Toaster position="top-center" />
    </div>
  </main>
)

export default async function CoursesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]
  const allCourses = await getCourses({
    status: 'scheduled',
    fromDate: today,
  })

  if (!user) {
    const bookingsMap = new Map<string, Awaited<ReturnType<typeof getUserBookings>>[number]>()
    const canCancelMap = new Map<string, boolean>()
    const bookedCourses: Awaited<ReturnType<typeof getCourses>> = []
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <div className="w-full text-center pt-8 pb-2 px-4">
            <h1 className="font-syne font-bold text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
              The Rookie Dance Studio
            </h1>
          </div>
          {coursesPageContent(allCourses, bookedCourses, bookingsMap, canCancelMap, false, null, false)}
        </div>
        <Footer />
      </div>
    )
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const userBookingsData = await getUserBookings()
  const canCancelResults = userBookingsData.length > 0
    ? await Promise.all(userBookingsData.map((b) => canCancelBooking(b.id)))
    : []
  const canCancelMap = new Map(
    userBookingsData.map((b, i) => [b.id, canCancelResults[i] ?? false])
  )
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
