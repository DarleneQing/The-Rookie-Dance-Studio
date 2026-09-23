import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Calendar } from 'lucide-react'
import { getCachedUser } from '@/lib/supabase/cached'
import { requireAdmin } from '@/lib/utils/admin-guard'
import { getCourses } from '@/app/courses/actions'
import { getInstructors } from '@/app/admin/courses/actions'
import { getZurichToday, shiftYMD } from '@/lib/utils/date-helpers'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CoursesTable } from '@/components/admin/courses/courses-table'
import { CreateCourseDialog } from '@/components/admin/courses/create-course-dialog'
import { BatchCreateDialog } from '@/components/admin/courses/batch-create-dialog'

// ponytail: fixed window instead of pagination; add paging if admins need older courses here.
const PAST_COURSES_WINDOW_DAYS = 90

export default async function AdminCoursesPage() {
  const user = await getCachedUser()

  if (!user) {
    return redirect('/login')
  }

  const today = getZurichToday()

  // requireAdmin() is cached per request, so getInstructors() shares its lookup.
  const [admin, futureCourses, pastCourses, instructors] = await Promise.all([
    requireAdmin(),
    getCourses({ status: 'scheduled', fromDate: today }),
    getCourses({ fromDate: shiftYMD(today, -PAST_COURSES_WINDOW_DAYS), toDate: shiftYMD(today, -1) }),
    getInstructors(),
  ])

  if (!admin) {
    return redirect('/admin')
  }

  // getCourses sorts ascending (right for upcoming); history reads latest first.
  const pastCoursesLatestFirst = [...pastCourses].reverse()

  return (
    <main id="main-content" className="relative min-h-screen overflow-x-hidden">
      <div className="absolute inset-0 z-0 bg-background" />

      {/* Content */}
      <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-8 pb-8 px-4">
        <div className="relative">
          <div className="relative bg-card border border-border/60 rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden">

            {/* Back button */}
            <div className="mb-4">
              <Link
                href="/admin"
                aria-label="Back to Admin Dashboard"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-black/40 text-foreground backdrop-blur transition hover:bg-black/60"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>

            {/* Header with actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h1 className="font-syne font-bold text-2xl md:text-3xl text-foreground px-2">
                Course Management
              </h1>
              <div className="flex flex-col sm:flex-row gap-2">
                <CreateCourseDialog instructors={instructors}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Course
                  </Button>
                </CreateCourseDialog>
                <BatchCreateDialog instructors={instructors}>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 font-outfit"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Batch Create
                  </Button>
                </BatchCreateDialog>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="future" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="future">
                  Future Courses ({futureCourses.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past {PAST_COURSES_WINDOW_DAYS} Days ({pastCourses.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="future">
                <CoursesTable
                  courses={futureCourses}
                  instructors={instructors}
                  type="future"
                />
              </TabsContent>

              <TabsContent value="past">
                <CoursesTable
                  courses={pastCoursesLatestFirst}
                  instructors={instructors}
                  type="past"
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </main>
  )
}
