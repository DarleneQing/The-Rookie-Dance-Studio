/**
 * Real-Postgres tests for hit_rate_limit(), the fixed-window counter behind
 * the login/signup rate limits (src/lib/utils/rate-limit.ts).
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from './pg-harness'

let db: PGlite

async function hit(key: string, limit = 3, windowSeconds = 900): Promise<boolean> {
  const { rows } = await db.query<{ allowed: boolean }>(
    `SELECT hit_rate_limit($1, $2, $3) AS allowed`,
    [key, limit, windowSeconds]
  )
  return rows[0].allowed
}

beforeAll(async () => {
  db = await createTestDb()
}, 60_000)

afterAll(async () => {
  await db?.close()
})

beforeEach(async () => {
  await db.exec('BEGIN')
})
afterEach(async () => {
  await db.exec('ROLLBACK')
})

describe('hit_rate_limit', () => {
  it('allows up to the limit, then blocks', async () => {
    const results = []
    for (let i = 0; i < 5; i++) results.push(await hit('login:email:a@example.com', 3))
    expect(results).toEqual([true, true, true, false, false])
  })

  it('counts each key independently', async () => {
    for (let i = 0; i < 3; i++) await hit('login:email:a@example.com', 3)
    expect(await hit('login:email:a@example.com', 3)).toBe(false)
    expect(await hit('login:email:b@example.com', 3)).toBe(true)
    expect(await hit('login:ip:203.0.113.7', 3)).toBe(true)
  })

  it('starts a fresh window once the old one has expired', async () => {
    for (let i = 0; i < 4; i++) await hit('signup:ip:203.0.113.7', 3, 3600)
    expect(await hit('signup:ip:203.0.113.7', 3, 3600)).toBe(false)

    // NOW() is fixed inside a transaction, so age the window instead of waiting.
    await db.query(
      `UPDATE rate_limit_buckets SET window_start = NOW() - INTERVAL '61 minutes' WHERE key = $1`,
      ['signup:ip:203.0.113.7']
    )
    expect(await hit('signup:ip:203.0.113.7', 3, 3600)).toBe(true)
    const { rows } = await db.query<{ hits: number }>(
      `SELECT hits FROM rate_limit_buckets WHERE key = $1`,
      ['signup:ip:203.0.113.7']
    )
    expect(rows[0].hits).toBe(1)
  })

  it.each([
    ['null key', null, 3, 900],
    ['oversized key', 'x'.repeat(201), 3, 900],
    ['zero limit', 'k', 0, 900],
    ['zero window', 'k', 3, 0],
    ['window over a day', 'k', 3, 86_401],
  ])('rejects invalid arguments: %s', async (_label, key, limit, windowSeconds) => {
    await expect(
      db.query(`SELECT hit_rate_limit($1, $2, $3)`, [key, limit, windowSeconds])
    ).rejects.toThrow(/Invalid rate limit arguments/)
  })

  it('is callable by anon, but the counter table is not readable or writable directly', async () => {
    await db.exec(`SET LOCAL ROLE anon`)
    const { rows } = await db.query<{ allowed: boolean }>(
      `SELECT hit_rate_limit('login:ip:198.51.100.1', 3, 900) AS allowed`
    )
    expect(rows[0].allowed).toBe(true)

    await expect(db.query(`SELECT * FROM rate_limit_buckets`)).rejects.toThrow(/permission denied/)
  })

  it('anon cannot reset a bucket by writing to the table', async () => {
    await db.exec(`SET LOCAL ROLE anon`)
    await expect(
      db.query(`DELETE FROM rate_limit_buckets WHERE key = 'login:ip:198.51.100.1'`)
    ).rejects.toThrow(/permission denied/)
  })
})
