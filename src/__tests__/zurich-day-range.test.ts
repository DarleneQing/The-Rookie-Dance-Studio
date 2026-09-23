import { describe, it, expect } from 'vitest'
import { getSaturdaysInMonth, getZurichDayRange, shiftYMD } from '@/lib/utils/date-helpers'

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

// Regression: the batch-create preview built Saturdays at local midnight and
// read them back with toISOString(), which in Zurich (UTC+1/+2) yields the
// previous day — every "Saturday" became a Friday string, so existing courses
// were never detected. Run under several TZs to prove host independence.
describe('getSaturdaysInMonth', () => {
  it.each([
    [2026, 3, ['2026-03-07', '2026-03-14', '2026-03-21', '2026-03-28']],
    [2026, 8, ['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22', '2026-08-29']],
    [2026, 10, ['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31']],
    [2028, 2, ['2028-02-05', '2028-02-12', '2028-02-19', '2028-02-26']],
  ])('%i-%i', (year, month, expected) => {
    expect(getSaturdaysInMonth(year, month)).toEqual(expected)
  })
})
