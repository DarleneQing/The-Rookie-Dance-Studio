'use client'

import { useState } from 'react'
import { createCourse } from '@/app/admin/courses/actions'
import type { CreateCourseInput } from '@/types/courses'
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

interface CreateCourseDialogProps {
  instructors: Array<{ id: string; full_name: string; avatar_url: string | null }>
  children: React.ReactNode
  onSuccess?: () => void
}

export function CreateCourseDialog({
  instructors,
  children,
  onSuccess,
}: CreateCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateCourseInput>({
    dance_style: 'Kpop',
    instructor_id: null,
    location: 'Quatierzentrum Schütze Flex 4, Heinrichstrasse 238, 8005 Zurich',
    scheduled_date: '',
    start_time: '15:00',
    duration_minutes: 90,
    capacity: 25,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.scheduled_date) {
      toast.error('Please select a date')
      return
    }

    const selectedDate = new Date(formData.scheduled_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      toast.error('Cannot create course for past date')
      return
    }

    setLoading(true)
    try {
      await createCourse(formData)
      toast.success('Course created successfully')
      setOpen(false)
      // Reset form
      setFormData({
        dance_style: 'Kpop',
        instructor_id: null,
        location: 'Quatierzentrum Schütze Flex 4, Heinrichstrasse 238, 8005 Zurich',
        scheduled_date: '',
        start_time: '15:00',
        duration_minutes: 90,
        capacity: 25,
      })
      onSuccess?.()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to create course')
      } else {
        toast.error('Failed to create course')
      }
    } finally {
      setLoading(false)
    }
  }

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl">Create Course</DialogTitle>
          <DialogDescription>
            Create a new dance course. Default values are pre-filled.
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
                <SelectItem value="Commercial">Commercial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Instructor */}
          <div className="space-y-2">
            <Label htmlFor="instructor" className="font-syne font-semibold text-white">
              Instructor
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

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="scheduled_date" className="font-syne font-semibold text-white">
              Date
            </Label>
            <div className="rounded-2xl border border-rookie-purple px-3 py-2">
              <Input
                id="scheduled_date"
                type="date"
                min={getTodayDate()}
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full border-0 bg-transparent p-0 text-base text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                required
              />
            </div>
          </div>

          {/* Start Time */}
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
                required
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="font-syne font-semibold text-white">
              Duration (minutes)
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
              required
            />
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
              required
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
              required
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
              className="w-full sm:w-auto bg-gradient-to-r from-rookie-purple to-rookie-pink hover:opacity-90"
            >
              {loading ? 'Creating...' : 'Create Course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
