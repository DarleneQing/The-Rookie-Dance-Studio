import { describe, expect, it } from 'vitest'

import { calculateClassFinance } from '@/lib/finance/calculate-class-finance'

describe('calculateClassFinance', () => {
  it('separates Cash, TWINT, and Abo while applying member prices', () => {
    const result = calculateClassFinance([
      { member_type: 'adult', payment_method: 'cash' },
      { member_type: 'student', payment_method: 'cash' },
      { member_type: 'adult', payment_method: 'twint' },
      { member_type: 'student', payment_method: 'twint' },
      { member_type: 'adult', payment_method: 'abo' },
    ])

    expect(result).toEqual({
      adultCashCount: 1,
      studentCashCount: 1,
      adultTwintCount: 1,
      studentTwintCount: 1,
      aboCount: 1,
      cashTotal: 25,
      twintTotal: 25,
      totalRevenue: 50,
      unresolvedCount: 0,
    })
  })

  it('does not invent revenue for incomplete finance data', () => {
    const result = calculateClassFinance([
      { member_type: null, payment_method: 'cash' },
      { member_type: 'student', payment_method: null },
      { member_type: null, payment_method: 'abo' },
    ])

    expect(result.totalRevenue).toBe(0)
    expect(result.aboCount).toBe(1)
    expect(result.unresolvedCount).toBe(2)
  })
})
