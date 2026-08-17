/**
 * Subscription-related utility functions
 * Centralized logic for subscription type handling
 */

export type SubscriptionType = 'monthly' | '5_times' | '10_times'

/**
 * Format subscription type to display name
 */
export function formatSubscriptionType(type: string): string {
  switch (type) {
    case 'monthly':
      return 'Monthly Card'
    case '5_times':
      return '5-Times Card'
    case '10_times':
      return '10-Times Card'
    default:
      return type
  }
}

/**
 * Get total credits for a subscription type
 */
export function getSubscriptionTotalCredits(type: string): number {
  switch (type) {
    case '5_times':
      return 5
    case '10_times':
      return 10
    case 'monthly':
      return Infinity // Unlimited
    default:
      return 0
  }
}

/**
 * Check if subscription is times-based (5_times or 10_times)
 */
export function isTimesBasedSubscription(type: string): boolean {
  return type === '5_times' || type === '10_times'
}

/**
 * Check if subscription is monthly
 */
export function isMonthlySubscription(type: string): boolean {
  return type === 'monthly'
}

/**
 * PostgREST `.or()` filter that mirrors the SQL find_usable_subscription()
 * rule exactly. KEEP IN SYNC with:
 *   docs/migrations/2026-04-04_1_fix-book-course-and-checkin.sql
 *   docs/migrations/2026-08-16_1_fix-times-card-deduction-and-subscription-detection.sql
 *
 * SQL rule:
 *   (type IN ('5_times','10_times') AND remaining_credits > 0 AND status <> 'depleted')
 *   OR (type = 'monthly' AND status = 'active' AND end_date >= CURRENT_DATE)
 */
export function usableSubscriptionFilter(today: string): string {
  return `and(type.in.(5_times,10_times),remaining_credits.gt.0,status.neq.depleted),and(type.eq.monthly,status.eq.active,end_date.gte.${today})`
}

export interface UsableSubscriptionShape {
  type: string
  status: string
  remaining_credits: number | null
  end_date: string | null
}

/**
 * Mirrors the SQL usability predicate (see usableSubscriptionFilter).
 * Times cards: usable when remaining_credits > 0 AND status <> 'depleted'
 * (archived cards with credits are usable).
 * Monthly: usable when status = 'active' AND end_date >= today.
 */
export function isUsableSubscription(
  sub: UsableSubscriptionShape,
  today: string
): boolean {
  if (sub.type === '5_times' || sub.type === '10_times') {
    return sub.status !== 'depleted' && (sub.remaining_credits ?? 0) > 0
  }
  if (sub.type === 'monthly') {
    return sub.status === 'active' && !!sub.end_date && sub.end_date >= today
  }
  return false
}
