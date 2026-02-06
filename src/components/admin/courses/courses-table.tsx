'use client'

import { useState } from 'react'
import { deleteCourse } from '@/app/admin/courses/actions'
import type { CourseWithBookingCount } from '@/types/courses'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CourseDetailsDialog } from './course-details-dialog'
import { EditCourseDialog } from './edit-course-dialog'
import { Eye, Trash2, Users, MapPin, Clock, Pencil } from 'lucide-react'

interface CoursesTableProps {
  courses: CourseWithBookingCount[]
  instructors: Array<{ id: string; full_name: string; avatar_url: string | null }>
  type: 'future' | 'past'
}

export function CoursesTable({ courses, type }: CoursesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<CourseWithBookingCount | null>(null)
  const [deleting, setDeleting] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

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

  const getCurrentAttendance = (course: CourseWithBookingCount) => {
    // Return whichever is larger: booking count or check-in count
    return Math.max(course.booking_count, course.checkin_count)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="scheduled">Scheduled</Badge>
      case 'completed':
        return <Badge variant="completed">Completed</Badge>
      case 'cancelled':
        return <Badge variant="cancelled">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const handleDeleteClick = (course: CourseWithBookingCount) => {
    if (course.booking_count > 0) {
      toast.error('Cannot delete course with existing bookings')
      return
    }
    setCourseToDelete(course)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return

    setDeleting(true)
    try {
      await deleteCourse(courseToDelete.id)
      toast.success('Course deleted successfully')
      setDeleteDialogOpen(false)
      setCourseToDelete(null)
      // Refresh page to update list
      window.location.reload()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to delete course')
      } else {
        toast.error('Failed to delete course')
      }
    } finally {
      setDeleting(false)
    }
  }

  const getCourseName = (course: CourseWithBookingCount) => {
    return `${course.dance_style} - ${formatDate(course.scheduled_date)}, ${formatTime(course.start_time)}`
  }

  if (courses.length === 0) {
    return (
      <div className="bg-white/10 rounded-2xl p-8 text-center border border-white/20">
        <p className="text-white/70 font-outfit">
          {type === 'future' 
            ? 'No upcoming courses scheduled. Create your first course!' 
            : 'No past courses yet.'}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="space-y-3 md:hidden">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg space-y-3"
          >
            {/* Header with Date and Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="font-syne font-bold text-white text-lg">
                  {course.song || course.dance_style}
                </div>
                {course.singer && (
                  <div className="text-sm text-white/70 font-outfit">
                    {course.singer}
                  </div>
                )}
                <div className="text-sm text-white/60 font-outfit">
                  {formatDate(course.scheduled_date)} • {formatTime(course.start_time)}
                </div>
              </div>
              {getStatusBadge(course.status)}
            </div>

            {/* Instructor */}
            <div className="flex items-center gap-2">
              {course.instructor ? (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={course.instructor.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white text-xs">
                      {course.instructor.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white font-outfit">
                    {course.instructor.full_name}
                  </span>
                </>
              ) : (
                <span className="text-sm text-white/60 font-outfit italic">Unassigned</span>
              )}
            </div>

            {/* Capacity */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/60" />
              <span className={`text-sm font-outfit font-semibold ${getCapacityColor(getCurrentAttendance(course), course.capacity)}`}>
                {getCurrentAttendance(course)}/{course.capacity}
              </span>
              {getCurrentAttendance(course) >= course.capacity && (
                <Badge variant="full">Full</Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <CourseDetailsDialog courseId={course.id} courseName={getCourseName(course)}>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-white/10 hover:bg-white/20 border-white/20 text-white"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
              </CourseDetailsDialog>
              {type === 'future' && (
                <EditCourseDialog course={course} onSuccess={() => window.location.reload()}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white/10 hover:bg-white/20 border-white/20 text-white"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </EditCourseDialog>
              )}
              {type === 'future' && course.booking_count === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteClick(course)}
                  className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block rounded-lg border border-white/20 overflow-hidden bg-white/5 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/10 bg-white/5">
                <TableHead className="text-white/90 font-syne font-bold px-6 py-4">Date</TableHead>
                <TableHead className="text-white/90 font-syne font-bold px-6 py-4">Time</TableHead>
                <TableHead className="text-white/90 font-syne font-bold px-6 py-4">Style</TableHead>
                <TableHead className="text-white/90 font-syne font-bold px-6 py-4">Instructor</TableHead>
                <TableHead className="text-white/90 font-syne font-bold px-6 py-4">Capacity</TableHead>
                <TableHead className="text-white/90 font-syne font-bold px-6 py-4">Status</TableHead>
                <TableHead className="text-right text-white/90 font-syne font-bold px-6 py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id} className="border-white/20 hover:bg-white/10 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="font-outfit text-white">{formatDate(course.scheduled_date)}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2 font-outfit text-white">
                      <Clock className="h-4 w-4 text-white/60" />
                      {formatTime(course.start_time)}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="font-syne font-semibold text-white">
                      {course.song || course.dance_style}
                    </div>
                    {course.singer && (
                      <div className="text-xs text-white/60 font-outfit mt-0.5">
                        {course.singer}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {course.instructor ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={course.instructor.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white text-xs">
                            {course.instructor.full_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white font-outfit">
                          {course.instructor.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-white/60 font-outfit italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-outfit font-semibold ${getCapacityColor(getCurrentAttendance(course), course.capacity)}`}>
                        {getCurrentAttendance(course)}/{course.capacity}
                      </span>
                      {getCurrentAttendance(course) >= course.capacity && (
                        <Badge variant="full">Full</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {getStatusBadge(course.status)}
                  </TableCell>
                  <TableCell className="text-right px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <CourseDetailsDialog courseId={course.id} courseName={getCourseName(course)}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20 font-outfit"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </CourseDetailsDialog>
                      {type === 'future' && (
                        <EditCourseDialog course={course} onSuccess={() => window.location.reload()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/20 font-outfit"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </EditCourseDialog>
                      )}
                      {type === 'future' && course.booking_count === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(course)}
                          className="text-red-400 hover:bg-red-500/20 font-outfit"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-syne text-xl">Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {courseToDelete && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="font-syne font-semibold text-white mb-1">
                {courseToDelete.dance_style}
              </div>
              <div className="text-sm text-white/60 font-outfit">
                {formatDate(courseToDelete.scheduled_date)} • {formatTime(courseToDelete.start_time)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4 text-white/60" />
                <span className="text-xs text-white/60 font-outfit">{courseToDelete.location}</span>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
