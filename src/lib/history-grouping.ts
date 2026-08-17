export interface HistoryMonthGroup<T> {
  label: string
  items: T[]
}

function getMonthParts(dateString: string) {
  const dateOnlyMatch = /^(\d{4})-(\d{2})/.exec(dateString)

  if (dateOnlyMatch) {
    return {
      year: Number(dateOnlyMatch[1]),
      monthIndex: Number(dateOnlyMatch[2]) - 1,
    }
  }

  const date = new Date(dateString)
  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
  }
}

export function groupHistoryByMonth<T>(
  items: readonly T[],
  getDate: (item: T) => string
): HistoryMonthGroup<T>[] {
  const groups = new Map<string, HistoryMonthGroup<T>>()

  items.forEach(item => {
    const { year, monthIndex } = getMonthParts(getDate(item))
    const key = `${year}-${monthIndex}`
    const existingGroup = groups.get(key)

    if (existingGroup) {
      existingGroup.items.push(item)
      return
    }

    groups.set(key, {
      label: new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(year, monthIndex, 1)),
      items: [item],
    })
  })

  return Array.from(groups.values())
}
