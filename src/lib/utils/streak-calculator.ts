import {
  getZurichYMD,
  isoDayOfWeekFromYMD,
  ymdToDayNumberUTC,
  dayNumberToYMDUTC,
  weekStartKeyFromYMD,
} from './date-helpers'

/**
 * Calculate consecutive weeks with check-ins
 * Uses Monday as week start and Europe/Zurich timezone
 */
export function calculateStreakWeeks(
  checkins: Array<{ created_at: string }>
): number {
  let streakWeeks = 0
  if (!checkins || checkins.length === 0) {
    return streakWeeks
  }

  // Build set of week keys (YYYY-MM-DD of Monday) for all check-ins
  const weekKeys = new Set<string>()
  for (const checkin of checkins) {
    const checkinDate = new Date(checkin.created_at)
    const zurichYMD = getZurichYMD(checkinDate)
    const weekKey = weekStartKeyFromYMD(zurichYMD.y, zurichYMD.m, zurichYMD.d)
    weekKeys.add(weekKey)
  }

  // Get current week start key
  const now = new Date()
  const currentZurichYMD = getZurichYMD(now)

  // Count consecutive weeks backwards from current week
  const currentWeekStartDay =
    ymdToDayNumberUTC(currentZurichYMD.y, currentZurichYMD.m, currentZurichYMD.d) -
    (isoDayOfWeekFromYMD(currentZurichYMD.y, currentZurichYMD.m, currentZurichYMD.d) - 1)
  let checkWeekStartDay = currentWeekStartDay

  while (true) {
    const checkYMD = dayNumberToYMDUTC(checkWeekStartDay)
    const weekKey = weekStartKeyFromYMD(checkYMD.y, checkYMD.m, checkYMD.d)
    if (!weekKeys.has(weekKey)) {
      break
    }
    streakWeeks++
    checkWeekStartDay -= 7
  }

  return streakWeeks
}
