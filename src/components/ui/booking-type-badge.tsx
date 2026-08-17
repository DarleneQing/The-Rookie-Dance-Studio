import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BookingType } from '@/types/courses'

interface BookingTypeBadgeProps {
  type: BookingType | string
  className?: string
  size?: 'default' | 'small'
}

/**
 * Reusable component for displaying booking type badges
 * Ensures consistent styling across the application
 */
export function BookingTypeBadge({
  type,
  className,
  size = 'default',
}: BookingTypeBadgeProps) {
  const combinedClass = cn(
    'font-semibold',
    size === 'small' && 'text-xs',
    className
  )

  if (type === 'subscription') {
    return (
      <Badge variant="subscription" className={combinedClass}>
        Subscription
      </Badge>
    )
  }

  if (type === 'single') {
    return (
      <Badge variant="single" className={combinedClass}>
        Single Class
      </Badge>
    )
  }

  if (type === 'drop_in') {
    return (
      <Badge variant="drop_in" className={combinedClass}>
        Drop-in
      </Badge>
    )
  }

  return <Badge className={className}>{type}</Badge>
}
