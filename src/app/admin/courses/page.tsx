import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/cached'
import { getCourses } from '@/app/courses/actions'
import { getInstructors } from '@/app/admin/courses/actions'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CoursesTable } from '@/components/admin/courses/courses-table'
import { CreateCourseDialog } from '@/components/admin/courses/create-course-dialog'
import { BatchCreateDialog } from '@/components/admin/courses/batch-create-dialog'

export default async function AdminCoursesPage() {
  const user = await getCachedUser()

  if (!user) {
    return redirect('/login')
  }

  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const [
    { data: profile },
    futureCourses,
    pastCourses,
    instructors,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
    getCourses({ status: 'scheduled', fromDate: today }),
    getCourses({ toDate: yesterdayStr }),
    getInstructors(),
  ])

  if (profile?.role !== 'admin') {
    return redirect('/admin')
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div className="absolute inset-0 z-0 bg-black" />

      {/* Content */}
      <div className="relative z-10 container max-w-md md:max-w-6xl mx-auto pt-8 pb-8 px-4">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-4 md:p-6 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />

            {/* Back button */}
            <div className="mb-4">
              <Link
                href="/admin"
                aria-label="Back to Admin Dashboard"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>

            {/* Header with actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className="font-syne font-bold text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple px-2">
                Course Management
              </h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <CreateCourseDialog instructors={instructors}>
                  <Button className="bg-gradient-to-r from-rookie-purple to-rookie-pink hover:opacity-90 font-outfit">
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
                  Past Courses ({pastCourses.length})
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
                  courses={pastCourses}
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
