'use client'

import type { CheckinWithUser } from '@/app/admin/scanner/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Clock, Users } from 'lucide-react'

interface CheckinListProps {
  checkins: CheckinWithUser[]
  maxHeight?: string
}

export function CheckinList({ checkins, maxHeight = '300px' }: CheckinListProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getBookingTypeBadge = (type: string) => {
    switch (type) {
      case 'subscription':
        return <Badge variant="subscription" className="text-xs">Subscription</Badge>
      case 'single':
        return <Badge variant="single" className="text-xs">Single</Badge>
      case 'drop_in':
        return <Badge variant="drop_in" className="text-xs">Drop-in</Badge>
      default:
        return <Badge className="text-xs">{type}</Badge>
    }
  }

  if (checkins.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
        <Users className="h-10 w-10 text-white/40 mx-auto mb-2" />
        <p className="text-white/60 font-outfit text-sm">
          No check-ins yet
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 rounded-xl border border-white/10">
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-syne font-semibold text-white">
            Check-ins Today
          </h3>
          <Badge variant="scheduled" className="font-semibold">
            {checkins.length}
          </Badge>
        </div>
      </div>
      
      <div 
        className="overflow-y-auto space-y-2 p-3"
        style={{ maxHeight }}
      >
        {checkins.map((checkin) => (
          <div
            key={checkin.id}
            className="bg-white/5 rounded-xl p-3 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={checkin.user.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-rookie-purple to-rookie-pink text-white font-syne text-sm">
                  {checkin.user.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="font-syne font-semibold text-white text-sm">
                  {checkin.user.full_name}
                </div>
                <div className="flex items-center gap-1 text-xs text-white/60 font-outfit">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(checkin.created_at)}
                </div>
              </div>
              
              {getBookingTypeBadge(checkin.booking_type)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
