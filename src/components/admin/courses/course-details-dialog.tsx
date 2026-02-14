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
import { Users, Clock, Loader2, Music, UserX } from 'lucide-react'

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

  const getTimeInterval = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0)
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    
    const formatTime = (date: Date) => {
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const displayHour = hours % 12 || 12
      const displayMinutes = minutes.toString().padStart(2, '0')
      return `${displayHour}:${displayMinutes} ${ampm}`
    }
    
    return `${formatTime(startDate)} - ${formatTime(endDate)}`
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
        return <Badge variant="subscription" className="font-semibold">Subscription</Badge>
      case 'single':
        return <Badge variant="single" className="font-semibold">Single Class</Badge>
      case 'drop_in':
        return <Badge variant="drop_in" className="font-semibold">Drop-in</Badge>
      default:
        return <Badge className="font-semibold">{type}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne text-xl">
            {courseDetails ? formatDate(courseDetails.scheduled_date) : courseName}
          </DialogTitle>
          {courseDetails ? (
            <DialogDescription asChild>
              <div className="flex flex-col gap-2 text-white/70 mt-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{getTimeInterval(courseDetails.start_time, courseDetails.duration_minutes)}</span>
                </div>
                {courseDetails.instructor && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={courseDetails.instructor.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white text-xs">
                        {courseDetails.instructor.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{courseDetails.instructor.full_name}</span>
                  </div>
                )}
                {courseDetails.song && (
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    <span>{courseDetails.song}{courseDetails.singer && ` - ${courseDetails.singer}`}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{courseDetails.bookings?.filter(b => b.status === 'confirmed').length || 0}/{courseDetails.capacity} spots booked</span>
                </div>
              </div>
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">Course details</DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-rookie-purple" />
          </div>
        ) : courseDetails ? (
          <Tabs defaultValue="bookings" className="w-full">
            {(() => {
              const confirmedBookings = courseDetails.bookings?.filter(b => b.status === 'confirmed') || []
              const checkedInUserIds = new Set(courseDetails.checkins?.map(c => c.user_id) || [])
              const notCheckedIn = confirmedBookings.filter(b => !checkedInUserIds.has(b.user_id))
              return (
            <>
            <TabsList className="grid w-full grid-cols-3 h-auto min-h-9 p-1 gap-0.5">
              <TabsTrigger value="bookings" className="text-xs sm:text-sm px-1.5 sm:px-3 py-1 sm:py-1.5 min-w-0">
                <span className="truncate block w-full text-center">Bookings ({confirmedBookings.length})</span>
              </TabsTrigger>
              <TabsTrigger value="not-checked-in" className="text-xs sm:text-sm px-1.5 sm:px-3 py-1 sm:py-1.5 min-w-0">
                <span className="truncate block w-full text-center">Not in ({notCheckedIn.length})</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs sm:text-sm px-1.5 sm:px-3 py-1 sm:py-1.5 min-w-0">
                <span className="truncate block w-full text-center">Attendance ({courseDetails.checkins?.length || 0})</span>
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

            <TabsContent value="not-checked-in" className="mt-4">
              <div className="space-y-2">
                {notCheckedIn.length > 0 ? (
                  notCheckedIn
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
                        <span title="Not checked in"><UserX className="h-4 w-4 text-amber-400 flex-shrink-0" /></span>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-12 text-white/60 font-outfit flex flex-col items-center gap-2">
                    <UserX className="h-10 w-10 text-white/40" />
                    <span>Everyone who booked has checked in</span>
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
            </>
              )
            })()}
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
