import { describe, expect, it } from "vitest"

import { getVisibleFaqData, type FaqCategory } from "@/lib/faq-filter"

const topics: FaqCategory[] = Array.from({ length: 6 }, (_, index) => ({
  category: `Topic ${index + 1}`,
  icon: "•",
  questions: [
    {
      q: index === 5 ? "How is my privacy protected?" : `Question ${index + 1}`,
      a: `Answer ${index + 1}`,
    },
  ],
}))

describe("FAQ topic disclosure", () => {
  it("starts with four topics and expands to the full set", () => {
    expect(getVisibleFaqData(topics, "", false).visibleData).toHaveLength(4)
    expect(getVisibleFaqData(topics, "", true).visibleData).toHaveLength(6)
  })

  it("searches hidden topics even while the topic list is collapsed", () => {
    const result = getVisibleFaqData(topics, "privacy", false)

    expect(result.visibleData.map(({ category }) => category)).toEqual(["Topic 6"])
  })

  it("returns an empty result and restores the collapsed view after clearing", () => {
    expect(getVisibleFaqData(topics, "no match", false).visibleData).toEqual([])
    expect(getVisibleFaqData(topics, "", false).visibleData).toHaveLength(4)
  })
})
