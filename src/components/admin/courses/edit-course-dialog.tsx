'use client'

import { useState, useEffect } from 'react'
import { updateCourse, getInstructors } from '@/app/admin/courses/actions'
import type { CourseWithBookingCount, CreateCourseInput } from '@/types/courses'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2 } from 'lucide-react'

interface EditCourseDialogProps {
  course: CourseWithBookingCount
  children: React.ReactNode
  onSuccess?: () => void
}

export function EditCourseDialog({
  course,
  children,
  onSuccess,
}: EditCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [instructors, setInstructors] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([])
  const [formData, setFormData] = useState<Partial<CreateCourseInput>>({
    dance_style: course.dance_style === 'Commercial' ? 'Choreography' : course.dance_style,
    instructor_id: course.instructor_id,
    location: course.location,
    scheduled_date: course.scheduled_date,
    start_time: course.start_time,
    duration_minutes: course.duration_minutes,
    capacity: course.capacity,
    song: course.song,
    singer: course.singer,
    video_link: course.video_link,
  })

  useEffect(() => {
    if (open) {
      loadInstructors()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const loadInstructors = async () => {
    try {
      const data = await getInstructors()
      setInstructors(data)
    } catch (error) {
      console.error('Failed to load instructors:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    try {
      await updateCourse(course.id, formData)
      setOpen(false)
      // Show toast after dialog starts closing
      setTimeout(() => {
        toast.success('Course updated successfully')
      }, 100)
      onSuccess?.()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to update course')
      } else {
        toast.error('Failed to update course')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto !top-[5vh] !translate-y-0 sm:!top-[50%] sm:!-translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl">Edit Course</DialogTitle>
          <DialogDescription>
            Update course details. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dance Style */}
          <div className="space-y-2">
            <Label htmlFor="dance_style" className="font-syne font-semibold text-white">
              Dance Style
            </Label>
            <Select
              value={formData.dance_style}
              onValueChange={(value) => setFormData({ ...formData, dance_style: value })}
            >
              <SelectTrigger id="dance_style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Kpop">Kpop</SelectItem>
                <SelectItem value="Choreography">Choreography</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Instructor */}
          <div className="space-y-2">
            <Label htmlFor="instructor" className="font-syne font-semibold text-white">
              Instructor (Optional)
            </Label>
            <Select
              value={formData.instructor_id || 'unassigned'}
              onValueChange={(value) => 
                setFormData({ ...formData, instructor_id: value === 'unassigned' ? null : value })
              }
            >
              <SelectTrigger id="instructor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <span className="text-white/60">Unassigned</span>
                </SelectItem>
                {instructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={instructor.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white text-xs">
                          {instructor.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{instructor.full_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Time and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time" className="font-syne font-semibold text-white">
                Start Time
              </Label>
              <div className="rounded-2xl border border-rookie-purple px-3 py-2">
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full border-0 bg-transparent p-0 text-base text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="font-syne font-semibold text-white">
                Duration (min)
              </Label>
              <Input
                id="duration"
                type="number"
                min="30"
                max="180"
                step="15"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity" className="font-syne font-semibold text-white">
              Capacity
            </Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="100"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="font-syne font-semibold text-white">
              Location
            </Label>
            <Input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          {/* Song and Singer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="song" className="font-syne font-semibold text-white">
                Song (Optional)
              </Label>
              <Input
                id="song"
                type="text"
                placeholder="e.g., Magnetic"
                value={formData.song || ''}
                onChange={(e) => setFormData({ ...formData, song: e.target.value || null })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="singer" className="font-syne font-semibold text-white">
                Singer (Optional)
              </Label>
              <Input
                id="singer"
                type="text"
                placeholder="e.g., ILLIT"
                value={formData.singer || ''}
                onChange={(e) => setFormData({ ...formData, singer: e.target.value || null })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Video Link */}
          <div className="space-y-2">
            <Label htmlFor="video_link" className="font-syne font-semibold text-white">
              Video Link (Optional)
            </Label>
            <Input
              id="video_link"
              type="url"
              placeholder="https://youtube.com/..."
              value={formData.video_link || ''}
              onChange={(e) => setFormData({ ...formData, video_link: e.target.value || null })}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
