import { describe, expect, it } from 'vitest'

import {
  combineUsableSubscriptions,
  combineUsableSubscriptionsByUser,
} from '@/lib/utils/subscription-helpers'

// Rows as returned by usableSubscriptionFilter + created_at DESC.
const newTen = { user_id: 'u1', type: '10_times', status: 'active', total_credits: 10, remaining_credits: 10 }
const oldFive = { user_id: 'u1', type: '5_times', status: 'archived', total_credits: 5, remaining_credits: 4 }
const monthly = { user_id: 'u1', type: 'monthly', status: 'active', total_credits: null, remaining_credits: null }

describe('combineUsableSubscriptions', () => {
  it('sums credits across stacked times cards (archived 5-times with 4 left + new 10-times)', () => {
    const combined = combineUsableSubscriptions([newTen, oldFive])
    expect(combined).toMatchObject({ type: '10_times', remaining_credits: 14, total_credits: 15 })
  })

  it('leaves a single card unchanged', () => {
    expect(combineUsableSubscriptions([oldFive])).toMatchObject({ remaining_credits: 4, total_credits: 5 })
  })

  it('shows the monthly pass when it is the newest card (check-ins use it first)', () => {
    expect(combineUsableSubscriptions([monthly, oldFive])).toBe(monthly)
  })

  it('returns null when nothing is usable', () => {
    expect(combineUsableSubscriptions([])).toBeNull()
    expect(combineUsableSubscriptions(null)).toBeNull()
  })
})

describe('combineUsableSubscriptionsByUser', () => {
  it('groups by member and combines each', () => {
    const other = { ...oldFive, user_id: 'u2', remaining_credits: 2 }
    const map = combineUsableSubscriptionsByUser([newTen, other, oldFive])
    expect(map.get('u1')).toMatchObject({ remaining_credits: 14, total_credits: 15 })
    expect(map.get('u2')).toMatchObject({ remaining_credits: 2, total_credits: 5 })
  })
})
