import { SINGLE_CLASS_PRICE } from '@/lib/pricing'

export interface FinanceCalculationItem {
  member_type: 'adult' | 'student' | null
  payment_method: 'cash' | 'twint' | 'abo' | null
}

export interface ClassFinanceCalculation {
  adultCashCount: number
  studentCashCount: number
  adultTwintCount: number
  studentTwintCount: number
  aboCount: number
  cashTotal: number
  twintTotal: number
  totalRevenue: number
  unresolvedCount: number
}

export function calculateClassFinance(
  checkins: FinanceCalculationItem[]
): ClassFinanceCalculation {
  let adultCashCount = 0
  let studentCashCount = 0
  let adultTwintCount = 0
  let studentTwintCount = 0
  let aboCount = 0
  let unresolvedCount = 0

  for (const checkin of checkins) {
    if (checkin.payment_method === 'abo') {
      aboCount += 1
      continue
    }

    if (
      (checkin.payment_method !== 'cash' && checkin.payment_method !== 'twint') ||
      (checkin.member_type !== 'adult' && checkin.member_type !== 'student')
    ) {
      unresolvedCount += 1
      continue
    }

    if (checkin.payment_method === 'cash') {
      if (checkin.member_type === 'adult') adultCashCount += 1
      else studentCashCount += 1
    } else if (checkin.member_type === 'adult') {
      adultTwintCount += 1
    } else {
      studentTwintCount += 1
    }
  }

  const cashTotal =
    adultCashCount * SINGLE_CLASS_PRICE.adult +
    studentCashCount * SINGLE_CLASS_PRICE.student
  const twintTotal =
    adultTwintCount * SINGLE_CLASS_PRICE.adult +
    studentTwintCount * SINGLE_CLASS_PRICE.student

  return {
    adultCashCount,
    studentCashCount,
    adultTwintCount,
    studentTwintCount,
    aboCount,
    cashTotal,
    twintTotal,
    totalRevenue: cashTotal + twintTotal,
    unresolvedCount,
  }
}
