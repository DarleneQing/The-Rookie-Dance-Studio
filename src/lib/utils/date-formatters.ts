/**
 * Date and time formatting utilities
 * Centralized formatting functions to avoid duplication across components
 */

/**
 * Format a date string with optional weekday and year
 */
export function formatDate(
  dateString: string,
  options?: { 
    includeWeekday?: boolean
    includeYear?: boolean
    weekdayStyle?: 'short' | 'long'
    monthStyle?: 'short' | 'long'
  }
): string {
  const date = new Date(dateString)
  const formatOptions: Intl.DateTimeFormatOptions = {
    month: options?.monthStyle || 'short',
    day: 'numeric',
  }

  if (options?.includeWeekday) {
    formatOptions.weekday = options?.weekdayStyle || 'short'
  }
  if (options?.includeYear) {
    formatOptions.year = 'numeric'
  }

  return date.toLocaleDateString('en-US', formatOptions)
}

/**
 * Format a time string (HH:MM:SS or HH:MM) to 12-hour format
 */
export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

/**
 * Format a Date object to 12-hour time format
 */
export function formatTimeFromDate(date: Date): string {
  const hour = date.getHours()
  const minute = date.getMinutes()
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  const displayMinute = minute.toString().padStart(2, '0')
  return `${displayHour}:${displayMinute} ${ampm}`
}

/**
 * Format course date and time, returning both separately
 */
export function formatCourseDateTime(date: string, time: string) {
  const dateObj = new Date(date)
  const dateStr = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  const timeStr = `${displayHour}:${minutes} ${ampm}`

  return { dateStr, timeStr }
}

/**
 * Format date and time together as a single string
 */
export function formatDateTime(date: string, time: string): string {
  const { dateStr, timeStr } = formatCourseDateTime(date, time)
  return `${dateStr} • ${timeStr}`
}

/**
 * Format a timestamp to a readable date string
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a timestamp to a readable time string
 */
export function formatTimestampTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Calculate time interval from start time and duration
 */
export function getTimeInterval(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':')
  const startDate = new Date()
  startDate.setHours(parseInt(hours), parseInt(minutes), 0)

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000)

  return `${formatTimeFromDate(startDate)} - ${formatTimeFromDate(endDate)}`
}
