import { describe, expect, it } from "vitest"

import { getSingleClassPrice } from "@/lib/pricing"

describe("getSingleClassPrice", () => {
  it("keeps the old rates for check-ins before October 2026", () => {
    expect(getSingleClassPrice("2026-09-30")).toEqual({ student: 10, adult: 15 })
  })

  it("applies the new rates from 2026-10-01 onwards", () => {
    expect(getSingleClassPrice("2026-10-01")).toEqual({ student: 12, adult: 18 })
    expect(getSingleClassPrice("2027-01-15")).toEqual({ student: 12, adult: 18 })
  })
})
