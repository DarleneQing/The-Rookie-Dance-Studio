/**
 * Supabase-specific utility functions
 * Helpers for handling Supabase query results and relations
 */

/**
 * Supabase returns relations as arrays. This helper safely extracts the first item
 * or returns the value if it's not an array.
 */
export function unwrapSupabaseRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null
  if (Array.isArray(value)) {
    return value[0] || null
  }
  return value
}

/**
 * Unwrap nested Supabase relations (e.g., course.instructor)
 * Handles cases where both the parent and nested values might be arrays
 */
export function unwrapNestedRelation<T extends Record<string, unknown>>(
  value: T | T[] | null | undefined,
  key: keyof T
): T[keyof T] | null {
  const unwrapped = unwrapSupabaseRelation(value)
  if (!unwrapped || !key) return null

  const nested = unwrapped[key]
  if (Array.isArray(nested)) {
    return nested[0] || null
  }
  return nested || null
}
