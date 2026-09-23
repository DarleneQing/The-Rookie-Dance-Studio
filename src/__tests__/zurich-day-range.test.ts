import { describe, it, expect } from 'vitest'
import { getZurichDayRange, shiftYMD } from '@/lib/utils/date-helpers'

// Server code runs in UTC on Vercel, so "midnight" must be Zurich midnight
// expressed as an absolute instant — not setHours(0) in the server's zone.
describe('getZurichDayRange', () => {
  it('summer (CEST, UTC+2): day starts 22:00 UTC the previous day', () => {
    expect(getZurichDayRange('2026-09-23')).toEqual({
      start: '2026-09-22T22:00:00.000Z',
      end: '2026-09-23T22:00:00.000Z',
    })
  })

  it('winter (CET, UTC+1): day starts 23:00 UTC the previous day', () => {
    expect(getZurichDayRange('2026-01-15')).toEqual({
      start: '2026-01-14T23:00:00.000Z',
      end: '2026-01-15T23:00:00.000Z',
    })
  })

  it('spring-forward day is 23 hours long', () => {
    expect(getZurichDayRange('2026-03-29')).toEqual({
      start: '2026-03-28T23:00:00.000Z',
      end: '2026-03-29T22:00:00.000Z',
    })
  })

  it('fall-back day is 25 hours long', () => {
    expect(getZurichDayRange('2026-10-25')).toEqual({
      start: '2026-10-24T22:00:00.000Z',
      end: '2026-10-25T23:00:00.000Z',
    })
  })

  it('rolls over month and year boundaries', () => {
    expect(getZurichDayRange('2026-12-31')).toEqual({
      start: '2026-12-30T23:00:00.000Z',
      end: '2026-12-31T23:00:00.000Z',
    })
  })

  it.each(['', '2026-9-23', '23.09.2026', '2026-02-30', '2026-13-01', 'garbage'])(
    'rejects invalid date %j',
    (input) => {
      expect(() => getZurichDayRange(input)).toThrow(/Invalid date/)
    }
  )
})

describe('shiftYMD', () => {
  it.each([
    ['2026-09-23', -1, '2026-09-22'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-01-01', -1, '2025-12-31'],
    ['2026-03-30', -1, '2026-03-29'], // day after spring-forward
    ['2026-10-26', -1, '2026-10-25'], // day after fall-back
    ['2026-09-23', -90, '2026-06-25'],
    ['2028-02-28', 1, '2028-02-29'], // leap year
  ])('shiftYMD(%s, %i) = %s', (ymd, days, expected) => {
    expect(shiftYMD(ymd, days)).toBe(expected)
  })
})
