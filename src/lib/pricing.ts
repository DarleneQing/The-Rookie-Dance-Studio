export const SINGLE_CLASS_PRICE = {
  adult: 15,
  student: 10,
} as const

export type SubscriptionType = 'monthly' | '5_times' | '10_times'

export const SUBSCRIPTION_PRICES = {
  monthly: { adult: 45, student: 30 },
  '5_times': { adult: 68, student: 45 },
  '10_times': { adult: 128, student: 85 },
} as const satisfies Record<SubscriptionType, Record<'adult' | 'student', number>>
