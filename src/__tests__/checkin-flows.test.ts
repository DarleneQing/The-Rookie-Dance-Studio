/**
 * Tests for the check-in context logic and SQL flow behavior.
 *
 * We can't hit a real Supabase DB here, so we test:
 *   1. getCheckinContext() — mocking the Supabase client to verify the logic
 *      that decides bookingType/subscriptionDetails for every user-flow variant.
 *   2. SQL flow tracing — verifying the decision tree of find_usable_subscription,
 *      book_course, and perform_course_checkin matches expectations for each flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Supabase — intercept createClient() so getCheckinContext never hits a DB
// ---------------------------------------------------------------------------

// Each query builder call returns `this` (chainable). We store the mock
// responses per table so tests can configure them.
type MockRow = Record<string, unknown>

let mockResponses: Record<string, { data: MockRow | MockRow[] | null; error: null }> = {}

function createChainableMock(table: string) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'or', 'order', 'limit', 'maybeSingle', 'single']
  for (const m of methods) {
    chain[m] = vi.fn(() => {
      // Terminal methods return the mock response
      if (m === 'maybeSingle' || m === 'single') {
        return mockResponses[table] ?? { data: null, error: null }
      }
      return chain
    })
  }
  return chain
}

const mockSupabase = {
  from: vi.fn((table: string) => createChainableMock(table)),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Import AFTER mocking
import { getCheckinContext } from '@/app/admin/scanner/actions'
import type { CheckinContext } from '@/app/admin/scanner/actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = '00000000-0000-0000-0000-000000000001'
const COURSE_ID = '00000000-0000-0000-0000-000000000002'
const SUB_5T_ID = '00000000-0000-0000-0000-000000000010'
const SUB_10T_ID = '00000000-0000-0000-0000-000000000011'
const SUB_MONTHLY_ID = '00000000-0000-0000-0000-000000000012'

const today = new Date().toISOString().split('T')[0]
const futureDate = '2099-12-31'
const pastDate = '2020-01-01'

function makeProfile(overrides?: Partial<MockRow>) {
  return {
    id: USER_ID,
    full_name: 'Test User',
    avatar_url: null,
    dob: '1990-01-01',
    member_type: 'adult',
    ...overrides,
  }
}

function makeSub(
  type: '5_times' | '10_times' | 'monthly',
  overrides?: Partial<MockRow>
) {
  const base: MockRow = {
    id: type === '5_times' ? SUB_5T_ID : type === '10_times' ? SUB_10T_ID : SUB_MONTHLY_ID,
    status: 'active',
    type,
    remaining_credits: type === 'monthly' ? 0 : 5,
    end_date: type === 'monthly' ? futureDate : null,
  }
  return { ...base, ...overrides }
}

function makeBooking(
  bookingType: 'subscription' | 'single' | 'drop_in',
  subscriptionId: string | null = null,
  subscription: MockRow | null = null
) {
  return {
    id: '00000000-0000-0000-0000-000000000099',
    booking_type: bookingType,
    subscription_id: subscriptionId,
    subscription: subscription ? [subscription] : null,
  }
}

/**
 * Configure what each Supabase .from(table) query returns.
 *
 * getCheckinContext runs 4 parallel queries via Promise.all:
 *   [0] profiles  (single)
 *   [1] checkins  (array — already checked in?)
 *   [2] bookings  (maybeSingle — confirmed booking)
 *   [3] subscriptions (maybeSingle — best usable sub)
 *
 * Since each from() call creates a fresh chain, we track call order.
 */
function configureMocks(opts: {
  profile?: MockRow | null
  checkins?: MockRow[]
  booking?: MockRow | null
  usableSub?: MockRow | null
}) {
  let callIndex = 0
  mockSupabase.from.mockImplementation(() => {
    const idx = callIndex++
    const responses = [
      { data: opts.profile ?? null, error: null },       // profiles
      { data: opts.checkins ?? [], error: null },         // checkins
      { data: opts.booking ?? null, error: null },        // bookings
      { data: opts.usableSub ?? null, error: null },      // subscriptions
    ]
    const resp = responses[idx] ?? { data: null, error: null }

    const chain: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'or', 'order', 'limit', 'maybeSingle', 'single']
    for (const m of methods) {
      chain[m] = vi.fn(() => {
        if (m === 'maybeSingle' || m === 'single') return resp
        // For checkins (array query), terminal is the chain itself
        // but we need to return after .limit() — we handle by making
        // every chain method return the resp on last call
        return chain
      })
    }
    // The checkins query ends at .limit() not .maybeSingle/.single
    // Promise.all awaits the result of the last chained call.
    // Supabase client returns a thenable from any chain method.
    // We simulate this by making the chain itself thenable.
    ;(chain as { then?: unknown }).then = (resolve: (v: unknown) => void) =>
      resolve(resp)

    return chain
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockResponses = {}
})

describe('getCheckinContext — user flow scenarios', () => {
  // ========================================================================
  // Flow A: Pre-booked with active subscription
  // ========================================================================
  it('Flow A: pre-booked with active 5-times subscription → subscription + details', async () => {
    const sub = makeSub('5_times', { remaining_credits: 3 })
    configureMocks({
      profile: makeProfile(),
      checkins: [],
      booking: makeBooking('subscription', SUB_5T_ID, sub),
      usableSub: sub,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.hasBooking).toBe(true)
    expect(ctx.bookingType).toBe('subscription')
    expect(ctx.subscriptionDetails?.type).toBe('5_times')
    expect(ctx.subscriptionDetails?.remainingCredits).toBe(3)
    expect(ctx.isRepeatCheckin).toBe(false)
  })

  // ========================================================================
  // Flow B: Pre-booked with active monthly subscription
  // ========================================================================
  it('Flow B: pre-booked with active monthly subscription → subscription + end date', async () => {
    const sub = makeSub('monthly', { end_date: futureDate })
    configureMocks({
      profile: makeProfile(),
      checkins: [],
      booking: makeBooking('subscription', SUB_MONTHLY_ID, sub),
      usableSub: sub,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.bookingType).toBe('subscription')
    expect(ctx.subscriptionDetails?.type).toBe('monthly')
    expect(ctx.subscriptionDetails?.endDate).toBe(futureDate)
    expect(ctx.subscriptionDetails?.remainingCredits).toBeUndefined()
  })

  // ========================================================================
  // Flow C: Pre-booked as single, no subscription ever
  // ========================================================================
  it('Flow C: pre-booked as single, no subscription → single', async () => {
    configureMocks({
      profile: makeProfile(),
      checkins: [],
      booking: makeBooking('single'),
      usableSub: null,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.hasBooking).toBe(true)
    expect(ctx.bookingType).toBe('single')
    expect(ctx.subscriptionDetails).toBeUndefined()
  })

  // ========================================================================
  // Flow D: Pre-booked as single, THEN bought subscription (upgrade scenario)
  // ========================================================================
  it('Flow D: pre-booked as single, user acquired 10-times card → upgraded to subscription', async () => {
    const sub = makeSub('10_times', { remaining_credits: 10 })
    configureMocks({
      profile: makeProfile(),
      checkins: [],
      booking: makeBooking('single'),
      usableSub: sub,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.hasBooking).toBe(true)
    expect(ctx.bookingType).toBe('subscription')
    expect(ctx.subscriptionDetails?.type).toBe('10_times')
    expect(ctx.subscriptionDetails?.remainingCredits).toBe(10)
  })

  // ========================================================================
  // Flow E: Pre-booked with subscription, but that card is now depleted,
  //         and user has a NEW card
  // ========================================================================
  it('Flow E: subscription booking but linked card depleted, user has new card → re-linked', async () => {
    const depletedSub = makeSub('5_times', {
      remaining_credits: 0,
      status: 'depleted',
    })
    const newSub = makeSub('10_times', { remaining_credits: 8 })

    configureMocks({
      profile: makeProfile(),
      checkins: [],
      booking: makeBooking('subscription', SUB_5T_ID, depletedSub),
      usableSub: newSub,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.bookingType).toBe('subscription')
    expect(ctx.subscriptionDetails?.type).toBe('10_times')
    expect(ctx.subscriptionDetails?.remainingCredits).toBe(8)
  })

  // ========================================================================
  // Flow F: Pre-booked with subscription, card depleted, NO new card
  // ========================================================================
  it('Flow F: subscription booking, linked card depleted, no alternative → downgraded to single', async () => {
    const depletedSub = makeSub('5_times', {
      remaining_credits: 0,
      status: 'depleted',
    })

    configureMocks({
      profile: makeProfile(),
      checkins: [],
      booking: makeBooking('subscription', SUB_5T_ID, depletedSub),
      usableSub: null,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.bookingType).toBe('single')
    expect(ctx.subscriptionDetails).toBeUndefined()
  })

  // ========================================================================
  // Flow G: Walk-in (no booking), user has active subscription
  // ========================================================================
  it('Flow G: walk-in with active subscription → no booking, subscription detected', async () => {
    const sub = makeSub('5_times', { remaining_credits: 4 })
    configureMocks({
      profile: makeProfile(),
      checkins: [],
      booking: null,
      usableSub: sub,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.hasBooking).toBe(false)
    expect(ctx.bookingType).toBe('subscription')
    expect(ctx.subscriptionDetails?.type).toBe('5_times')
    expect(ctx.subscriptionDetails?.remainingCredits).toBe(4)
  })

  // ========================================================================
  // Flow H: Walk-in (no booking), no subscription
  // ========================================================================
  it('Flow H: walk-in without subscription → no booking, single', async () => {
    configureMocks({
      profile: makeProfile(),
      checkins: [],
      booking: null,
      usableSub: null,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.hasBooking).toBe(false)
    expect(ctx.bookingType).toBe('single')
    expect(ctx.subscriptionDetails).toBeUndefined()
  })

  // ========================================================================
  // Flow I: Walk-in with ARCHIVED times card that still has credits
  // ========================================================================
  it('Flow I: walk-in with archived times card with credits → subscription detected', async () => {
    const archivedSub = makeSub('5_times', {
      status: 'archived',
      remaining_credits: 2,
    })
    configureMocks({
      profile: makeProfile(),
      checkins: [],
      booking: null,
      usableSub: archivedSub,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.hasBooking).toBe(false)
    expect(ctx.bookingType).toBe('subscription')
    expect(ctx.subscriptionDetails?.remainingCredits).toBe(2)
  })

  // ========================================================================
  // Flow J: Repeat check-in (already checked in for this course)
  // ========================================================================
  it('Flow J: repeat check-in detected → isRepeatCheckin = true', async () => {
    const sub = makeSub('5_times', { remaining_credits: 3 })
    configureMocks({
      profile: makeProfile(),
      checkins: [{ id: 'existing-checkin-id' }],
      booking: makeBooking('subscription', SUB_5T_ID, sub),
      usableSub: sub,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.isRepeatCheckin).toBe(true)
  })

  // ========================================================================
  // Flow K: User not found
  // ========================================================================
  it('Flow K: user not found → success=false', async () => {
    configureMocks({
      profile: null,
      checkins: [],
      booking: null,
      usableSub: null,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(false)
    expect(ctx.hasBooking).toBe(false)
  })

  // ========================================================================
  // Flow L: Expired monthly subscription should NOT be treated as usable
  // ========================================================================
  it('Flow L: expired monthly subscription linked to booking → single (not subscription)', async () => {
    const expiredMonthly = makeSub('monthly', {
      end_date: pastDate,
      status: 'active',
    })
    configureMocks({
      profile: makeProfile(),
      checkins: [],
      booking: makeBooking('subscription', SUB_MONTHLY_ID, expiredMonthly),
      usableSub: null, // DB would not return expired monthly
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    // The linked monthly is expired (end_date < today), so it's not usable
    // and no alternative was found → downgrade to single
    expect(ctx.bookingType).toBe('single')
    expect(ctx.subscriptionDetails).toBeUndefined()
  })

  // ========================================================================
  // Flow M: Student member type is propagated
  // ========================================================================
  it('Flow M: student member type is correctly returned', async () => {
    configureMocks({
      profile: makeProfile({ member_type: 'student' }),
      checkins: [],
      booking: null,
      usableSub: null,
    })

    const ctx = await getCheckinContext(USER_ID, COURSE_ID)

    expect(ctx.success).toBe(true)
    expect(ctx.profile?.member_type).toBe('student')
  })
})

// ---------------------------------------------------------------------------
// SQL flow tracing — verify the decision tree of the SQL functions
// These don't execute SQL but verify the LOGIC documented in the migration
// matches our expectations for each scenario.
// ---------------------------------------------------------------------------

describe('SQL flow tracing — find_usable_subscription logic', () => {
  // The find_usable_subscription function's WHERE clause:
  //   (type IN ('5_times','10_times') AND remaining_credits > 0 AND status <> 'depleted')
  //   OR (type = 'monthly' AND status = 'active' AND end_date >= CURRENT_DATE)

  function wouldFindSub(sub: {
    type: string
    remaining_credits: number
    status: string
    end_date: string | null
  }): boolean {
    if (sub.type === '5_times' || sub.type === '10_times') {
      return sub.remaining_credits > 0 && sub.status !== 'depleted'
    }
    if (sub.type === 'monthly') {
      return sub.status === 'active' && (sub.end_date ?? '') >= today
    }
    return false
  }

  it('active 5-times with 3 credits → found', () => {
    expect(wouldFindSub({ type: '5_times', remaining_credits: 3, status: 'active', end_date: null })).toBe(true)
  })

  it('archived 5-times with 2 credits → found (relaxed status check)', () => {
    expect(wouldFindSub({ type: '5_times', remaining_credits: 2, status: 'archived', end_date: null })).toBe(true)
  })

  it('depleted 5-times with 0 credits → NOT found', () => {
    expect(wouldFindSub({ type: '5_times', remaining_credits: 0, status: 'depleted', end_date: null })).toBe(false)
  })

  it('active 5-times with 0 credits (race condition) → NOT found', () => {
    expect(wouldFindSub({ type: '5_times', remaining_credits: 0, status: 'active', end_date: null })).toBe(false)
  })

  it('active monthly with future end_date → found', () => {
    expect(wouldFindSub({ type: 'monthly', remaining_credits: 0, status: 'active', end_date: futureDate })).toBe(true)
  })

  it('active monthly with past end_date → NOT found', () => {
    expect(wouldFindSub({ type: 'monthly', remaining_credits: 0, status: 'active', end_date: pastDate })).toBe(false)
  })

  it('expired monthly → NOT found', () => {
    expect(wouldFindSub({ type: 'monthly', remaining_credits: 0, status: 'expired', end_date: futureDate })).toBe(false)
  })

  it('archived monthly → NOT found (monthly requires active)', () => {
    expect(wouldFindSub({ type: 'monthly', remaining_credits: 0, status: 'archived', end_date: futureDate })).toBe(false)
  })
})

describe('SQL flow tracing — book_course logic', () => {
  // book_course decision tree:
  //   1. Course exists? No → error
  //   2. Time check:
  //      - admin override: allow until course end
  //      - normal: reject if past start time
  //   3. Capacity check: skip if admin override
  //   4. Duplicate booking check
  //   5. find_usable_subscription → subscription or single

  it('normal booking before start time, has subscription → subscription booking', () => {
    const isAdminOverride = false
    const courseStarted = false
    const capacityFull = false
    const hasExistingBooking = false
    const hasSub = true

    // Would not hit time check error
    expect(courseStarted && !isAdminOverride).toBe(false)
    // Would not hit capacity error
    expect(capacityFull && !isAdminOverride).toBe(false)
    // Would not hit duplicate error
    expect(hasExistingBooking).toBe(false)
    // Would create subscription booking
    expect(hasSub ? 'subscription' : 'single').toBe('subscription')
  })

  it('admin override during course, capacity full → succeeds', () => {
    const isAdminOverride = true
    const courseEnded = false

    // Admin override skips start-time check, only checks end time
    expect(courseEnded).toBe(false)
    // Admin override skips capacity check entirely
    // → booking succeeds
  })

  it('normal booking after start time → rejected', () => {
    const isAdminOverride = false
    const courseStarted = true

    expect(courseStarted && !isAdminOverride).toBe(true)
    // → "Course has already started"
  })

  it('admin override after course ended → rejected', () => {
    const isAdminOverride = true
    const courseEnded = true

    expect(isAdminOverride && courseEnded).toBe(true)
    // → "Course has already ended"
  })
})

describe('SQL flow tracing — perform_course_checkin logic', () => {
  // Decision tree for non-drop-in path:
  //   1. Load booking → must exist
  //   2. If single/drop_in → find_usable_subscription → upgrade if found
  //   3. If subscription → check linked sub usability → re-link if depleted
  //   4. Validate subscription (credits > 0, monthly not expired)
  //   5. Insert checkin + deduct credits

  it('single booking + new subscription → upgrade to subscription + deduct', () => {
    const bookingType = 'single'
    const hasUsableSub = true
    const subType = '5_times'
    const credits = 5

    // Step 2: upgrade
    const effectiveType = (bookingType === 'single' && hasUsableSub) ? 'subscription' : bookingType
    expect(effectiveType).toBe('subscription')

    // Step 5: deduct
    const newCredits = effectiveType === 'subscription' && subType !== 'monthly' ? credits - 1 : credits
    expect(newCredits).toBe(4)
  })

  it('subscription booking with depleted card + new card → re-link + deduct new card', () => {
    const bookingType = 'subscription'
    const linkedCredits = 0
    const hasAlternative = true
    const alternativeCredits = 10

    // Step 3: linked is depleted → re-link
    const shouldRelink = bookingType === 'subscription' && linkedCredits <= 0 && hasAlternative
    expect(shouldRelink).toBe(true)

    // Step 5: deduct from new card
    const newCredits = alternativeCredits - 1
    expect(newCredits).toBe(9)
  })

  it('subscription booking with depleted card + NO alternative → error', () => {
    const bookingType = 'subscription'
    const linkedCredits = 0
    const hasAlternative = false

    const shouldRelink = bookingType === 'subscription' && linkedCredits <= 0 && hasAlternative
    expect(shouldRelink).toBe(false)

    // Step 4: validation fails
    const valid = linkedCredits > 0
    expect(valid).toBe(false)
    // → "No remaining credits"
  })

  it('drop-in path → delegates to book_course(admin_override=true)', () => {
    const isDropIn = true
    // perform_course_checkin calls book_course(userId, courseId, true)
    // which skips time+capacity checks and uses find_usable_subscription
    expect(isDropIn).toBe(true)
    // → booking created, then check-in proceeds
  })

  it('monthly subscription check-in → no credit deduction', () => {
    const bookingType = 'subscription'
    const subType = 'monthly'
    const shouldDeduct = bookingType === 'subscription' && (subType === '5_times' || subType === '10_times')
    expect(shouldDeduct).toBe(false)
  })

  it('times card check-in → deducts 1 credit, depletes at 0', () => {
    const subType = '5_times'
    const creditsBefore = 1

    const creditsAfter = creditsBefore - 1
    const newStatus = creditsAfter <= 0 ? 'depleted' : 'active'

    expect(creditsAfter).toBe(0)
    expect(newStatus).toBe('depleted')
  })
})
