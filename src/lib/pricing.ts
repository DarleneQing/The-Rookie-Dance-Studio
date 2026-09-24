/**
 * Studio prices in CHF. Single source of truth for the pricing dialog and the
 * admin finance summary. Legal/FAQ copy repeats these numbers in prose — update
 * `terms-content.tsx`, `faq-content.tsx` and `book-course-dialog.tsx` too.
 */

export const DEFAULT_COURSE_DURATION_MINUTES = 120

export interface StudentAdultPrice {
  student: number
  adult: number
}

/** First day (Zurich calendar date) the October 2026 prices apply. */
export const NEW_PRICES_EFFECTIVE_DATE = '2026-10-01'

const LEGACY_SINGLE_CLASS_PRICE: StudentAdultPrice = { student: 10, adult: 15 }

export const PRICES = {
  singleClass: { student: 12, adult: 18 },
  fiveTimes: { student: 55, adult: 80 },
  tenTimes: { student: 100, adult: 150 },
  monthly: { student: 36, adult: 54 },
} as const satisfies Record<string, StudentAdultPrice>

/**
 * Single-class price in effect on a given day, so the finance summary for
 * pre-October days still reports what members actually paid.
 * @param date YYYY-MM-DD (Zurich calendar date)
 */
// ponytail: one hard-coded cutover; move to a dated price table if prices change again
export function getSingleClassPrice(date: string): StudentAdultPrice {
  return date < NEW_PRICES_EFFECTIVE_DATE ? LEGACY_SINGLE_CLASS_PRICE : PRICES.singleClass
}
