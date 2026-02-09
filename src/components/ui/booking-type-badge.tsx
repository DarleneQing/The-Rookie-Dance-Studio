import { Badge } from '@/components/ui/badge'
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
  className = '',
  size = 'default',
}: BookingTypeBadgeProps) {
  const sizeClass = size === 'small' ? 'text-xs' : ''
  const baseClass = 'font-semibold'
  const combinedClass = `${baseClass} ${sizeClass} ${className}`.trim()

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
