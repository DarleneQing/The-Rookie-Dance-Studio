'use client'

import { useState, useEffect } from 'react'
import { batchCreateCourses } from '@/app/admin/courses/actions'
import { getCourses } from '@/app/courses/actions'
import type { BatchCreateCoursesInput } from '@/types/courses'
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
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface BatchCreateDialogProps {
  instructors: Array<{ id: string; full_name: string; avatar_url: string | null }>
  children: React.ReactNode
  onSuccess?: () => void
}

interface SaturdayPreview {
  date: string
  exists: boolean
  formatted: string
}

export function BatchCreateDialog({
  instructors,
  children,
  onSuccess,
}: BatchCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<SaturdayPreview[]>([])
  const [formData, setFormData] = useState<BatchCreateCoursesInput>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    dance_style: 'Kpop',
    instructor_id: null,
    location: 'Quatierzentrum Schütze Flex 4, Heinrichstrasse 238, 8005 Zurich',
    start_time: '15:00',
    duration_minutes: 90,
    capacity: 25,
    song: null,
    singer: null,
    video_link: null,
  })

  const getSaturdaysInMonth = (year: number, month: number): Date[] => {
    const saturdays: Date[] = []
    const date = new Date(year, month - 1, 1)
    
    while (date.getMonth() === month - 1) {
      if (date.getDay() === 6) {
        saturdays.push(new Date(date))
      }
      date.setDate(date.getDate() + 1)
    }
    
    return saturdays
  }

  const generatePreview = async () => {
    setLoadingPreview(true)
    try {
      const saturdays = getSaturdaysInMonth(formData.year, formData.month)
      
      // Fetch existing courses for the month
      const firstDay = new Date(formData.year, formData.month - 1, 1).toISOString().split('T')[0]
      const lastDay = new Date(formData.year, formData.month, 0).toISOString().split('T')[0]
      const existingCourses = await getCourses({
        fromDate: firstDay,
        toDate: lastDay
      })

      const existingDates = new Set(
        existingCourses.map(c => c.scheduled_date)
      )

      const previewData: SaturdayPreview[] = saturdays.map(date => {
        const dateStr = date.toISOString().split('T')[0]
        return {
          date: dateStr,
          exists: existingDates.has(dateStr),
          formatted: date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })
        }
      })

      setPreview(previewData)
    } catch (error) {
      toast.error('Failed to generate preview')
      console.error(error)
    } finally {
      setLoadingPreview(false)
    }
  }

  useEffect(() => {
    if (open) {
      generatePreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.year, formData.month, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newCoursesCount = preview.filter(p => !p.exists).length
    if (newCoursesCount === 0) {
      toast.error('All Saturdays in this month already have courses')
      return
    }

    setLoading(true)
    try {
      const result = await batchCreateCourses(formData)
      toast.success(
        `Successfully created ${result.created_count} course${result.created_count !== 1 ? 's' : ''}. ` +
        `Skipped ${result.skipped_count} existing.`
      )
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to create courses')
      } else {
        toast.error('Failed to create courses')
      }
    } finally {
      setLoading(false)
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear + 1, currentYear + 2]

  const newCoursesCount = preview.filter(p => !p.exists).length
  const skippedCount = preview.filter(p => p.exists).length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl">Batch Create Courses</DialogTitle>
          <DialogDescription>
            Create courses for all Saturdays in a selected month. Existing courses will be skipped.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Month and Year Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month" className="font-syne font-semibold text-white">
                Month
              </Label>
              <Select
                value={formData.month.toString()}
                onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
              >
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year" className="font-syne font-semibold text-white">
                Year
              </Label>
              <Select
                value={formData.year.toString()}
                onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
              >
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

          {/* Duration and Capacity in Grid */}
          <div className="grid grid-cols-2 gap-4">
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
                required
              />
            </div>

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

          {/* Preview Section */}
          <div className="space-y-2">
            <Label className="font-syne font-semibold text-white">
              Saturday Preview
            </Label>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-rookie-purple" />
                </div>
              ) : preview.length > 0 ? (
                <>
                  {preview.map((item) => (
                    <div
                      key={item.date}
                      className="flex items-center gap-2 text-sm font-outfit"
                    >
                      {item.exists ? (
                        <>
                          <XCircle className="h-4 w-4 text-red-400" />
                          <span className="text-white/60">{item.formatted}</span>
                          <span className="text-red-400 text-xs">(Skipped - already exists)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <span className="text-white">{item.formatted}</span>
                          <span className="text-green-400 text-xs">(New)</span>
                        </>
                      )}
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-white/10 text-sm font-outfit text-white/80">
                    Will create <span className="font-semibold text-green-400">{newCoursesCount}</span> course{newCoursesCount !== 1 ? 's' : ''}, 
                    skip <span className="font-semibold text-red-400">{skippedCount}</span> existing
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-white/60 font-outfit text-sm">
                  No Saturdays found in selected month
                </div>
              )}
            </div>
          </div>

          {/* Song and Singer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="song" className="font-syne font-semibold text-white">
                Song Name (Optional)
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
              disabled={loading || newCoursesCount === 0}
              className="w-full sm:w-auto bg-gradient-to-r from-rookie-purple to-rookie-pink hover:opacity-90"
            >
              {loading ? 'Creating...' : `Create ${newCoursesCount} Course${newCoursesCount !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
