/**
 * Real-Postgres tests for the credit-bearing RPCs: check-in deduction,
 * check-in deletion refunds, booking cancellation, and batch course creation.
 * Runs the whole migration chain (see pg-harness.ts), so these assert the
 * LATEST function definitions — mocks cannot reproduce Postgres semantics like
 * the %ROWTYPE `IS NOT NULL` bug that silently disabled refunds (81b5cff).
 */
import { readFileSync } from 'fs'
import path from 'path'
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { actAs, createTestDb } from './pg-harness'

type RpcResult = { success: boolean; message?: string; [key: string]: unknown }
type SubType = '5_times' | '10_times' | 'monthly'

let db: PGlite
let admin: string
let member: string
let otherMember: string
let courseSeq = 0

async function createUser(name: string, role: 'admin' | 'member' = 'member'): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO auth.users (id, raw_user_meta_data)
     VALUES (gen_random_uuid(), jsonb_build_object('full_name', $1::text))
     RETURNING id`,
    [name]
  )
  if (role === 'admin') {
    // block_non_admin_role_change would reject this; seed around the trigger.
    await db.exec(`SET session_replication_role = replica`)
    await db.query(`UPDATE profiles SET role = 'admin' WHERE id = $1`, [rows[0].id])
    await db.exec(`SET session_replication_role = DEFAULT`)
  }
  return rows[0].id
}

/** A course starting `hoursFromNow` hours from now (Zurich wall clock). */
async function createCourse(hoursFromNow = 72): Promise<string> {
  courseSeq += 1
  const { rows } = await db.query<{ id: string }>(
    `WITH start AS (
       SELECT (NOW() + make_interval(hours => $1::int, mins => $2::int)) AT TIME ZONE 'Europe/Zurich' AS at
     )
     INSERT INTO courses (dance_style, location, scheduled_date, start_time, capacity)
     SELECT 'kpop', 'Studio', at::date, date_trunc('minute', at)::time, 20 FROM start
     RETURNING id`,
    [hoursFromNow, courseSeq]
  )
  return rows[0].id
}

async function giveCard(userId: string, type: SubType, credits = 5): Promise<string> {
  const isTimes = type !== 'monthly'
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO subscriptions (user_id, type, start_date, end_date, total_credits, remaining_credits)
     VALUES ($1, $2::subscription_type, $3, $4, $5, $5)
     RETURNING id`,
    [
      userId,
      type,
      isTimes ? null : '2000-01-01',
      isTimes ? null : '2999-12-31',
      isTimes ? credits : null,
    ]
  )
  return rows[0].id
}

async function rpc(sql: string, params: unknown[] = []): Promise<RpcResult> {
  const { rows } = await db.query<{ r: RpcResult }>(`SELECT ${sql} AS r`, params)
  return rows[0].r
}

async function sub(id: string): Promise<{ remaining_credits: number | null; status: string }> {
  const { rows } = await db.query<{ remaining_credits: number | null; status: string }>(
    `SELECT remaining_credits, status FROM subscriptions WHERE id = $1`,
    [id]
  )
  return rows[0]
}

async function checkinCount(userId: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM checkins WHERE user_id = $1`,
    [userId]
  )
  return rows[0].n
}

/** Member books; admin checks in (the normal scanner path). Returns checkin id. */
async function bookAndCheckIn(userId: string, courseId: string): Promise<string> {
  await actAs(db, userId)
  expect(await rpc(`book_course($1, $2)`, [userId, courseId])).toMatchObject({ success: true })
  await actAs(db, admin)
  const result = await rpc(`perform_course_checkin($1, $2, $3, false, 'abo')`, [userId, courseId, admin])
  expect(result).toMatchObject({ success: true })
  return result.checkin_id as string
}

beforeAll(async () => {
  db = await createTestDb()
  admin = await createUser('Admin', 'admin')
  member = await createUser('Member')
  otherMember = await createUser('Other Member')
}, 60_000)

afterAll(async () => {
  await db?.close()
})

// Each test runs in a transaction that is rolled back, so tests are isolated
// without paying for a fresh database each time.
beforeEach(async () => {
  await db.exec('BEGIN')
})
afterEach(async () => {
  await db.exec('ROLLBACK')
  await actAs(db, null)
})

describe('perform_course_checkin — credit deduction', () => {
  it('deducts one times-card credit per check-in', async () => {
    const card = await giveCard(member, '5_times', 5)
    await bookAndCheckIn(member, await createCourse())
    expect(await sub(card)).toEqual({ remaining_credits: 4, status: 'active' })
  })

  it('shared account: repeat walk-ins on one course each deduct a credit (feature, not a bug)', async () => {
    const card = await giveCard(member, '10_times', 10)
    const course = await createCourse()
    await actAs(db, admin)
    for (let person = 0; person < 3; person++) {
      const result = await rpc(`perform_course_checkin($1, $2, $3, true, 'abo')`, [member, course, admin])
      expect(result).toMatchObject({ success: true })
    }
    expect(await sub(card)).toMatchObject({ remaining_credits: 7 })
    expect(await checkinCount(member)).toBe(3)
  })

  it('marks the card depleted on the last credit and refuses the next check-in', async () => {
    const card = await giveCard(member, '5_times', 1)
    const course = await createCourse()
    await bookAndCheckIn(member, course)
    expect(await sub(card)).toEqual({ remaining_credits: 0, status: 'depleted' })

    await actAs(db, admin)
    const again = await rpc(`perform_course_checkin($1, $2, $3, false, 'abo')`, [member, course, admin])
    expect(again.success).toBe(false)
    expect(await sub(card)).toMatchObject({ remaining_credits: 0 })
  })
})

describe('monthly card priority over times cards', () => {
  async function assign(userId: string, type: SubType): Promise<string> {
    await actAs(db, admin)
    const { rows } = await db.query<{ id: string }>(
      `SELECT assign_subscription($1, $2::subscription_type) AS id`,
      [userId, type]
    )
    return rows[0].id
  }

  async function checkinCard(checkinId: string): Promise<string | null> {
    const { rows } = await db.query<{ subscription_id: string | null }>(
      `SELECT subscription_id FROM checkins WHERE id = $1`,
      [checkinId]
    )
    return rows[0].subscription_id
  }

  it('assigning a times card keeps an active monthly card active', async () => {
    const pass = await assign(member, 'monthly')
    const card = await assign(member, '10_times')
    expect(await sub(pass)).toMatchObject({ status: 'active' })
    expect(await sub(card)).toEqual({ remaining_credits: 10, status: 'active' })
  })

  it('assigning a card still archives the active card of the same kind', async () => {
    const oldPass = await assign(member, 'monthly')
    await assign(member, 'monthly')
    expect(await sub(oldPass)).toMatchObject({ status: 'archived' })

    const oldCard = await assign(member, '5_times')
    await assign(member, '10_times')
    // Archived, but its credits stay usable (see find_usable_subscription)
    expect(await sub(oldCard)).toEqual({ remaining_credits: 5, status: 'archived' })
  })

  it('course check-in uses the monthly card and deducts no times credit', async () => {
    const pass = await assign(member, 'monthly')
    const card = await assign(member, '10_times')
    const checkin = await bookAndCheckIn(member, await createCourse())
    expect(await checkinCard(checkin)).toBe(pass)
    expect(await sub(card)).toMatchObject({ remaining_credits: 10 })
  })

  it('re-links a booking made with a times card once a monthly card is assigned', async () => {
    const card = await assign(member, '10_times')
    const course = await createCourse()
    await actAs(db, member)
    expect(await rpc(`book_course($1, $2)`, [member, course])).toMatchObject({ success: true })

    const pass = await assign(member, 'monthly')
    const result = await rpc(`perform_course_checkin($1, $2, $3, false, 'abo')`, [member, course, admin])
    expect(result).toMatchObject({ success: true })
    expect(await checkinCard(result.checkin_id as string)).toBe(pass)
    expect(await sub(card)).toMatchObject({ remaining_credits: 10 })
  })

  it('walk-in check-in (perform_checkin) uses the monthly card first', async () => {
    const pass = await assign(member, 'monthly')
    const card = await assign(member, '5_times')
    await actAs(db, admin)
    const walkIn = await rpc(`perform_checkin($1, $2, 'abo')`, [member, admin])
    expect(walkIn).toMatchObject({ success: true })
    expect(await checkinCard(walkIn.checkin_id as string)).toBe(pass)
    expect(await sub(card)).toMatchObject({ remaining_credits: 5 })
  })

  it('falls back to the times card once the monthly card has expired', async () => {
    const pass = await assign(member, 'monthly')
    await db.query(`UPDATE subscriptions SET end_date = CURRENT_DATE - 1 WHERE id = $1`, [pass])
    const card = await assign(member, '10_times')
    await bookAndCheckIn(member, await createCourse())
    expect(await sub(card)).toMatchObject({ remaining_credits: 9 })
  })
})

describe('delete_course_checkin — refunds', () => {
  it('refunds a times-card credit (regression: row IS NOT NULL made refunds a no-op)', async () => {
    const card = await giveCard(member, '5_times', 5)
    const checkin = await bookAndCheckIn(member, await createCourse())
    expect(await sub(card)).toMatchObject({ remaining_credits: 4 })

    await actAs(db, admin)
    expect(await rpc(`delete_course_checkin($1)`, [checkin])).toMatchObject({ success: true })
    expect(await sub(card)).toEqual({ remaining_credits: 5, status: 'active' })
    expect(await checkinCount(member)).toBe(0)
  })

  it('reactivates a card that the deleted check-in had depleted', async () => {
    const card = await giveCard(member, '5_times', 1)
    const checkin = await bookAndCheckIn(member, await createCourse())
    expect(await sub(card)).toEqual({ remaining_credits: 0, status: 'depleted' })

    await actAs(db, admin)
    await rpc(`delete_course_checkin($1)`, [checkin])
    expect(await sub(card)).toEqual({ remaining_credits: 1, status: 'active' })
  })

  it('refunds a walk-in check-in (booking_type NULL) made by perform_checkin', async () => {
    const card = await giveCard(member, '10_times', 10)
    await actAs(db, admin)
    const walkIn = await rpc(`perform_checkin($1, $2, 'abo')`, [member, admin])
    expect(walkIn).toMatchObject({ success: true })
    expect(await sub(card)).toMatchObject({ remaining_credits: 9 })

    const { rows } = await db.query<{ id: string; booking_type: string | null }>(
      `SELECT id, booking_type FROM checkins WHERE user_id = $1`,
      [member]
    )
    expect(rows[0].booking_type).toBeNull()
    await rpc(`delete_course_checkin($1)`, [rows[0].id])
    expect(await sub(card)).toMatchObject({ remaining_credits: 10 })
  })

  it('does not refund a single (paid) check-in, even when a card id is on the row', async () => {
    const card = await giveCard(member, '5_times', 3)
    const course = await createCourse()
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO checkins (user_id, subscription_id, admin_id, course_id, booking_type)
       VALUES ($1, $2, $3, $4, 'single') RETURNING id`,
      [member, card, admin, course]
    )
    await actAs(db, admin)
    await rpc(`delete_course_checkin($1)`, [rows[0].id])
    expect(await sub(card)).toMatchObject({ remaining_credits: 3 })
  })

  it('leaves monthly passes untouched', async () => {
    const pass = await giveCard(member, 'monthly')
    const checkin = await bookAndCheckIn(member, await createCourse())
    await actAs(db, admin)
    await rpc(`delete_course_checkin($1)`, [checkin])
    expect(await sub(pass)).toEqual({ remaining_credits: null, status: 'active' })
    expect(await checkinCount(member)).toBe(0)
  })

  it('rejects non-admin callers', async () => {
    await giveCard(member, '5_times', 5)
    const checkin = await bookAndCheckIn(member, await createCourse())
    await actAs(db, member)
    await expect(rpc(`delete_course_checkin($1)`, [checkin])).rejects.toThrow(/Only admins/)
  })
})

describe('cancel_booking', () => {
  async function book(userId: string, courseId: string): Promise<string> {
    await actAs(db, userId)
    const result = await rpc(`book_course($1, $2)`, [userId, courseId])
    expect(result).toMatchObject({ success: true })
    return result.booking_id as string
  }

  it('lets the owner cancel more than 24h ahead, without touching credits', async () => {
    const card = await giveCard(member, '5_times', 5)
    const booking = await book(member, await createCourse(72))
    expect(await rpc(`cancel_booking($1, $2)`, [booking, member])).toMatchObject({ success: true })

    const { rows } = await db.query<{ status: string }>(`SELECT status FROM bookings WHERE id = $1`, [booking])
    expect(rows[0].status).toBe('cancelled')
    // Credits are only taken at check-in, so cancelling has nothing to refund.
    expect(await sub(card)).toMatchObject({ remaining_credits: 5 })
  })

  it('refuses cancellation within 24h of the course start', async () => {
    const booking = await book(member, await createCourse(2))
    const result = await rpc(`cancel_booking($1, $2)`, [booking, member])
    expect(result).toMatchObject({ success: false })
    expect(result.message).toMatch(/24 hours/)
  })

  it("refuses to cancel another member's booking", async () => {
    const booking = await book(member, await createCourse(72))
    await actAs(db, otherMember)
    expect(await rpc(`cancel_booking($1, $2)`, [booking, member])).toMatchObject({
      success: false,
      message: 'Unauthorized',
    })
  })

  it('gives the same 24h answer in any session timezone (regression: 2026-08-16_6 skew)', async () => {
    // Deadline 30 min from now: inside the old 1-2h UTC/Zurich skew window.
    const booking = await book(member, await createCourse(24))
    const answers: boolean[] = []
    for (const tz of ['UTC', 'Europe/Zurich', 'America/New_York']) {
      await db.exec(`SET LOCAL timezone = '${tz}'`)
      const { rows } = await db.query<{ ok: boolean }>(`SELECT can_cancel_booking($1) AS ok`, [booking])
      answers.push(rows[0].ok)
    }
    expect(new Set(answers).size).toBe(1)
  })
})

describe('book_course — authorization', () => {
  it('refuses to book on behalf of another member', async () => {
    const course = await createCourse()
    await actAs(db, otherMember)
    expect(await rpc(`book_course($1, $2)`, [member, course])).toMatchObject({
      success: false,
      message: 'Unauthorized',
    })
  })

  it('2026-09-23_2 removes the ungated legacy book_course(uuid, uuid) overload', async () => {
    // Recreate the overload as 2026-02-06_4 left it on a DB that ran 2026-04-04_1.
    await db.exec(`
      CREATE FUNCTION book_course(p_user_id UUID, p_course_id UUID) RETURNS JSONB
      LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{"success": true}'::jsonb $$;
    `)
    const migration = readFileSync(
      path.resolve(__dirname, '../../../docs/migrations/2026-09-23_2_drop-legacy-book-course-overload.sql'),
      'utf8'
    )
    await db.exec(migration)

    const { rows } = await db.query<{ sig: string }>(
      `SELECT oid::regprocedure::text AS sig FROM pg_proc WHERE proname = 'book_course'`
    )
    expect(rows.map((r) => r.sig)).toEqual(['book_course(uuid,uuid,boolean)'])
  })
})

describe('checkins — writes only through the RPCs', () => {
  // Run as the Supabase API role so RLS applies (the harness is a superuser).
  async function asApiRole<T>(fn: () => Promise<T>): Promise<T> {
    await db.exec(`SAVEPOINT api_role; SET LOCAL ROLE authenticated`)
    try {
      return await fn()
    } finally {
      await db.exec(`ROLLBACK TO SAVEPOINT api_role`)
    }
  }

  it('an admin cannot insert a check-in row directly, skipping the credit debit', async () => {
    const card = await giveCard(member, '5_times', 5)
    await actAs(db, admin)
    await asApiRole(() =>
      expect(
        db.query(`INSERT INTO checkins (user_id, subscription_id, admin_id) VALUES ($1, $2, $3)`, [
          member,
          card,
          admin,
        ])
      ).rejects.toThrow(/row-level security/)
    )
    expect(await checkinCount(member)).toBe(0)
    expect(await sub(card)).toMatchObject({ remaining_credits: 5 })
  })

  it('the check-in RPC still inserts as the API role', async () => {
    await giveCard(member, '5_times', 5)
    const course = await createCourse()
    await actAs(db, admin)
    const result = await asApiRole(async () => ({
      ...(await rpc(`perform_course_checkin($1, $2, $3, true, 'abo')`, [member, course, admin])),
      visible: await checkinCount(member),
    }))
    expect(result).toMatchObject({ success: true, visible: 1 })
  })
})

describe('batch_create_courses', () => {
  const nextYear = new Date().getUTCFullYear() + 1

  async function saturdaysIn(year: number, month: number): Promise<string[]> {
    const { rows } = await db.query<{ d: string }>(
      `SELECT d::date::text AS d
       FROM generate_series(make_date($1, $2, 1), make_date($1, $2, 1) + INTERVAL '1 month - 1 day', '1 day') d
       WHERE EXTRACT(DOW FROM d) = 6 ORDER BY 1`,
      [year, month]
    )
    return rows.map((r) => r.d)
  }

  it('creates one course on every Saturday of the month and skips existing slots', async () => {
    const saturdays = await saturdaysIn(nextYear, 3)
    await db.query(
      `INSERT INTO courses (dance_style, location, scheduled_date, start_time) VALUES ('kpop', 'Studio', $1, '18:00')`,
      [saturdays[0]]
    )
    await actAs(db, admin)
    const result = await rpc(`batch_create_courses($1, 3, 'kpop', NULL, 'Studio', '18:00', 90, 20)`, [nextYear])

    expect(result).toMatchObject({
      success: true,
      created_count: saturdays.length - 1,
      skipped_dates: [saturdays[0]],
      past_dates: [],
    })
    expect(result.created_dates).toEqual(saturdays.slice(1))
  })

  it('skips Saturdays that are already in the past', async () => {
    await actAs(db, admin)
    const lastYear = nextYear - 2
    const result = await rpc(`batch_create_courses($1, 3, 'kpop', NULL, 'Studio', '18:00', 90, 20)`, [lastYear])
    expect(result).toMatchObject({ created_count: 0, past_dates: await saturdaysIn(lastYear, 3) })
  })

  it('rejects non-admin callers', async () => {
    await actAs(db, member)
    await expect(
      rpc(`batch_create_courses($1, 3, 'kpop', NULL, 'Studio', '18:00', 90, 20)`, [nextYear])
    ).rejects.toThrow(/Only admins/)
  })
})
