import { describe, expect, it } from "vitest"

import { groupHistoryByMonth } from "@/lib/history-grouping"

interface HistoryItem {
  id: string
  date: string
}

describe("groupHistoryByMonth", () => {
  it("groups entries by month while preserving their display order", () => {
    const items: HistoryItem[] = [
      { id: "march-first", date: "2026-03-07" },
      { id: "february", date: "2026-02-09" },
      { id: "march-second", date: "2026-03-01" },
    ]

    expect(groupHistoryByMonth(items, item => item.date)).toEqual([
      {
        label: "March 2026",
        items: [items[0], items[2]],
      },
      {
        label: "February 2026",
        items: [items[1]],
      },
    ])
  })

  it("uses full month and year labels for cross-year history", () => {
    const items: HistoryItem[] = [
      { id: "december", date: "2025-12-20" },
      { id: "january", date: "2026-01-03" },
    ]

    expect(
      groupHistoryByMonth(items, item => item.date).map(group => group.label)
    ).toEqual(["December 2025", "January 2026"])
  })
})
