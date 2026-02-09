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
