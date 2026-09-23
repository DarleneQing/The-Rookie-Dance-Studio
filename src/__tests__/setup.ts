import { vi } from 'vitest'

// Next.js bundles a React build with `cache()` for server code; the plain
// react@18 package Vitest loads does not export it. A pass-through keeps
// modules that use cache() importable. Behaviourally this matches cache()
// outside a request: the function simply runs, with no memoization.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T extends (...args: never[]) => unknown>(fn: T) => fn }
})
