'use client'

import { useState, useEffect } from 'react'
import { getCourseDetails } from '@/app/admin/courses/actions'
import type { CourseWithDetails } from '@/types/courses'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Clock, Loader2 } from 'lucide-react'

interface CourseDetailsDialogProps {
  courseId: string
  courseName: string
  children: React.ReactNode
}

export function CourseDetailsDialog({
  courseId,
  courseName,
  children,
}: CourseDetailsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [courseDetails, setCourseDetails] = useState<CourseWithDetails | null>(null)

  useEffect(() => {
    if (open && !courseDetails) {
      loadCourseDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const loadCourseDetails = async () => {
    setLoading(true)
    try {
      const details = await getCourseDetails(courseId)
      setCourseDetails(details)
    } catch (error) {
      toast.error('Failed to load course details')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getBookingTypeBadge = (type: string) => {
    switch (type) {
      case 'subscription':
        return <Badge variant="subscription">Subscription</Badge>
      case 'single':
        return <Badge variant="single">Single</Badge>
      case 'drop_in':
        return <Badge variant="drop_in">Drop-in</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl">{courseName}</DialogTitle>
          {courseDetails && (
            <DialogDescription className="flex flex-col gap-1 text-white/70">
              <span>{formatDate(courseDetails.scheduled_date)} • {formatTime(courseDetails.start_time)}</span>
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Capacity: {courseDetails.bookings?.filter(b => b.status === 'confirmed').length || 0}/{courseDetails.capacity}
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-rookie-purple" />
          </div>
        ) : courseDetails ? (
          <Tabs defaultValue="bookings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bookings">
                Bookings ({courseDetails.bookings?.filter(b => b.status === 'confirmed').length || 0})
              </TabsTrigger>
              <TabsTrigger value="attendance">
                Attendance ({courseDetails.checkins?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="mt-4">
              <div className="space-y-2">
                {courseDetails.bookings && courseDetails.bookings.filter(b => b.status === 'confirmed').length > 0 ? (
                  courseDetails.bookings
                    .filter(b => b.status === 'confirmed')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={booking.user.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                            {booking.user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-syne font-semibold text-white">
                            {booking.user.full_name}
                          </div>
                          <div className="text-xs text-white/60 font-outfit">
                            Booked {formatTimestamp(booking.created_at)}
                          </div>
                        </div>
                        {getBookingTypeBadge(booking.booking_type)}
                      </div>
                    ))
                ) : (
                  <div className="text-center py-12 text-white/60 font-outfit">
                    No bookings yet
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="mt-4">
              <div className="space-y-2">
                {courseDetails.checkins && courseDetails.checkins.length > 0 ? (
                  courseDetails.checkins
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((checkin) => (
                      <div
                        key={checkin.id}
                        className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={checkin.user.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne">
                            {checkin.user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-syne font-semibold text-white">
                            {checkin.user.full_name}
                          </div>
                          <div className="text-xs text-white/60 font-outfit flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(checkin.created_at)}
                          </div>
                        </div>
                        {checkin.booking_type && getBookingTypeBadge(checkin.booking_type)}
                      </div>
                    ))
                ) : (
                  <div className="text-center py-12 text-white/60 font-outfit">
                    No check-ins yet
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
