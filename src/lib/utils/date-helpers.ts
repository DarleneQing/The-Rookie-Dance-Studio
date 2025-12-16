/**
 * Date and timezone helper functions for weekly streak calculation
 * Uses Europe/Zurich timezone with Monday as week start
 */

/**
 * Get year, month, day in Europe/Zurich timezone
 */
export function getZurichYMD(date: Date): { y: number; m: number; d: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const parts = formatter.formatToParts(date)
  const y = parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10)
  const m = parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10)
  const d = parseInt(parts.find((p) => p.type === 'day')?.value || '0', 10)
  return { y, m, d }
}

/**
 * Get ISO day of week from year, month, day
 * Returns 1=Monday, 2=Tuesday, ..., 7=Sunday
 */
export function isoDayOfWeekFromYMD(y: number, m: number, d: number): number {
  const utcDate = new Date(Date.UTC(y, m - 1, d))
  const dayOfWeek = utcDate.getUTCDay()
  // Convert from 0=Sunday, 1=Monday, ... to 1=Monday, 2=Tuesday, ..., 7=Sunday
  return dayOfWeek === 0 ? 7 : dayOfWeek
}

/**
 * Convert year, month, day to day number (days since epoch in UTC)
 */
export function ymdToDayNumberUTC(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

/**
 * Convert day number to year, month, day in UTC
 */
export function dayNumberToYMDUTC(day: number): { y: number; m: number; d: number } {
  const date = new Date(day * 86400000)
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
  }
}

/**
 * Get week start key (YYYY-MM-DD of Monday) from year, month, day
 */
export function weekStartKeyFromYMD(y: number, m: number, d: number): string {
  const dayNumber = ymdToDayNumberUTC(y, m, d)
  const isoDow = isoDayOfWeekFromYMD(y, m, d)
  const weekStartDay = dayNumber - (isoDow - 1) // Monday is day 1, so subtract (isoDow - 1)
  const weekStartYMD = dayNumberToYMDUTC(weekStartDay)
  return `${weekStartYMD.y}-${String(weekStartYMD.m).padStart(2, '0')}-${String(weekStartYMD.d).padStart(2, '0')}`
}
