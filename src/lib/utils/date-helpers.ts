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

/**
 * Today's date (YYYY-MM-DD) in Europe/Zurich.
 *
 * Use this instead of `new Date().toISOString().split('T')[0]` — that returns
 * the UTC date, which is YESTERDAY between 00:00–02:00 Zurich time (CET/CEST),
 * so "today" filters (courses, check-ins, subscriptions) would be off by one.
 */
export function getZurichToday(): string {
  const { y, m, d } = getZurichYMD(new Date())
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const zurichWallClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Zurich',
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

/** Zurich's UTC offset (ms) at a given instant. */
function zurichOffsetMs(instant: number): number {
  const parts = zurichWallClock.formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - instant
}

/** The instant of 00:00 Zurich time on y-m-d (day overflow rolls over, like Date.UTC). */
function zurichMidnight(y: number, m: number, d: number): number {
  const wallMidnightAsUtc = Date.UTC(y, m - 1, d)
  // Second pass uses the offset in force at the corrected instant, so it
  // stays exact even on DST-switch days.
  const firstGuess = wallMidnightAsUtc - zurichOffsetMs(wallMidnightAsUtc)
  return wallMidnightAsUtc - zurichOffsetMs(firstGuess)
}

/**
 * Absolute bounds of a Zurich calendar day (YYYY-MM-DD) as ISO instants,
 * half-open: `created_at >= start AND created_at < end`. Matches the SQL
 * `get_admin_stats` window.
 *
 * Use this for server-side day filters instead of `setHours(0, 0, 0, 0)`,
 * which uses the server's zone (UTC on Vercel) and shifts the window by the
 * Zurich offset (1h CET / 2h CEST).
 */
export function getZurichDayRange(ymd: string): { start: string; end: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  const [y, m, d] = match ? match.slice(1).map(Number) : []
  const calendar = match ? new Date(Date.UTC(y, m - 1, d)) : null
  if (!calendar || calendar.getUTCMonth() !== m - 1 || calendar.getUTCDate() !== d) {
    throw new Error(`Invalid date: ${JSON.stringify(ymd)} (expected YYYY-MM-DD)`)
  }
  return {
    start: new Date(zurichMidnight(y, m, d)).toISOString(),
    end: new Date(zurichMidnight(y, m, d + 1)).toISOString(),
  }
}
