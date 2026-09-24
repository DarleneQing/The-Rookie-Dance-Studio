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
 *
 * The SQL also orders monthly first (2026-09-24_1); PostgREST cannot order by
 * that expression, so order by created_at DESC and use pickUsableSubscription.
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

interface CombinableSubscription {
  type: string
  remaining_credits: number | null
  total_credits?: number | null
}

/**
 * The card check-ins use next, from usable rows ordered created_at DESC.
 * Mirrors find_usable_subscription(): a usable monthly card first (times
 * credits are not spent while one is usable), otherwise the newest card.
 * KEEP IN SYNC with docs/migrations/2026-09-24_1_prioritize-monthly-over-times-cards.sql
 */
export function pickUsableSubscription<T extends { type: string }>(
  subs: T[] | null | undefined
): T | null {
  return subs?.find((sub) => isMonthlySubscription(sub.type)) ?? subs?.[0] ?? null
}

/**
 * Collapses a member's usable subscriptions (usableSubscriptionFilter rows,
 * created_at DESC) into the single card the UI shows. Check-ins drain every
 * usable times card, newest first (find_usable_subscription), so the real
 * balance is the sum: an archived 5-times card with 4 left plus a newly
 * assigned 10-times card shows as 14 / 15. A usable monthly card is shown
 * as-is because check-ins use it before any times credits.
 */
export function combineUsableSubscriptions<T extends CombinableSubscription>(
  subs: T[] | null | undefined
): T | null {
  const next = pickUsableSubscription(subs)
  if (!next || !subs) return null
  if (!isTimesBasedSubscription(next.type)) return next

  const cards = subs.filter((sub) => isTimesBasedSubscription(sub.type))
  return {
    ...next,
    remaining_credits: cards.reduce((sum, sub) => sum + (sub.remaining_credits ?? 0), 0),
    total_credits: cards.reduce(
      (sum, sub) => sum + (sub.total_credits ?? getSubscriptionTotalCredits(sub.type)),
      0
    ),
  }
}

/** combineUsableSubscriptions per member, for admin lists spanning many users. */
export function combineUsableSubscriptionsByUser<T extends CombinableSubscription & { user_id: string }>(
  subs: T[] | null | undefined
): Map<string, T> {
  const byUser = new Map<string, T[]>()
  for (const sub of subs ?? []) {
    byUser.set(sub.user_id, [...(byUser.get(sub.user_id) ?? []), sub])
  }
  return new Map(
    Array.from(byUser, ([userId, userSubs]) => [userId, combineUsableSubscriptions(userSubs)!])
  )
}
