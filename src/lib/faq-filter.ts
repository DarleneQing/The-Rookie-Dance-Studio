export interface FaqQuestion {
  q: string
  a: string
}

export interface FaqCategory {
  category: string
  icon: string
  questions: FaqQuestion[]
}

export function getVisibleFaqData<T extends FaqCategory>(
  categories: T[],
  searchQuery: string,
  showAllTopics: boolean
) {
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredData = categories
    .map(category => ({
      ...category,
      questions: category.questions.filter(
        question =>
          question.q.toLowerCase().includes(normalizedQuery) ||
          question.a.toLowerCase().includes(normalizedQuery)
      ),
    }))
    .filter(category => category.questions.length > 0)

  const visibleData = normalizedQuery || showAllTopics
    ? filteredData
    : filteredData.slice(0, 4)

  return { normalizedQuery, filteredData, visibleData }
}
