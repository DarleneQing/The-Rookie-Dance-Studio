import { createHash } from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks: Supabase client, request headers, and Next navigation/cache
// ---------------------------------------------------------------------------

const rpc = vi.fn()
const signInWithPassword = vi.fn()
const signUp = vi.fn()
const mockSupabase = {
  rpc,
  auth: {
    signInWithPassword,
    signUp,
    getUser: vi.fn(async () => ({ data: { user: null } })),
  },
}

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => mockSupabase) }))

let requestHeaders = new Headers()
vi.mock('next/headers', () => ({ headers: () => requestHeaders }))

class RedirectSignal extends Error {}
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSignal(path)
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { AUTH_RATE_LIMITS, isRateLimited } from '@/lib/utils/rate-limit'
import { login, signup } from '@/app/auth/actions'

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
const LIMITED_MESSAGE = /Too many attempts/

function allowAll() {
  rpc.mockResolvedValue({ data: true, error: null })
}

function loginForm(email: string, password = 'pw123456') {
  const form = new FormData()
  form.append('email', email)
  form.append('password', password)
  return form
}

function signupForm(email: string) {
  const form = new FormData()
  form.append('email', email)
  form.append('password', 'pw123456')
  form.append('full_name', 'New Member')
  form.append('dob', '1990-01-01')
  return form
}

beforeEach(() => {
  vi.clearAllMocks()
  requestHeaders = new Headers({ 'x-real-ip': '203.0.113.7' })
  signInWithPassword.mockResolvedValue({ error: null })
  signUp.mockResolvedValue({ error: null })
})

describe('isRateLimited', () => {
  it('counts one hit per email and per IP, with hashed keys and the configured limits', async () => {
    allowAll()
    expect(await isRateLimited('login', 'Member@Example.com ')).toBe(false)

    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc).toHaveBeenCalledWith('hit_rate_limit', {
      p_key: `login:email:${sha256('member@example.com')}`,
      p_limit: AUTH_RATE_LIMITS.login.perEmail.limit,
      p_window_seconds: AUTH_RATE_LIMITS.login.perEmail.windowSeconds,
    })
    expect(rpc).toHaveBeenCalledWith('hit_rate_limit', {
      p_key: `login:ip:${sha256('203.0.113.7')}`,
      p_limit: AUTH_RATE_LIMITS.login.perIp.limit,
      p_window_seconds: AUTH_RATE_LIMITS.login.perIp.windowSeconds,
    })
  })

  it('never stores the raw email or IP in a key', async () => {
    allowAll()
    await isRateLimited('signup', 'member@example.com')
    const keys = rpc.mock.calls.map(([, args]) => args.p_key as string)
    expect(keys.join(' ')).not.toMatch(/member@example\.com|203\.0\.113\.7/)
  })

  it('normalizes email case and whitespace into the same bucket', async () => {
    allowAll()
    await isRateLimited('login', '  A@X.com')
    await isRateLimited('login', 'a@x.com')
    const emailKeys = rpc.mock.calls
      .map(([, args]) => args.p_key as string)
      .filter((key) => key.startsWith('login:email:'))
    expect(new Set(emailKeys).size).toBe(1)
  })

  it('is limited when either bucket is exhausted', async () => {
    rpc.mockImplementation(async (_fn: string, args: { p_key: string }) => ({
      data: !args.p_key.startsWith('login:ip:'),
      error: null,
    }))
    expect(await isRateLimited('login', 'a@x.com')).toBe(true)
  })

  it('falls back to the first x-forwarded-for address without x-real-ip', async () => {
    allowAll()
    requestHeaders = new Headers({ 'x-forwarded-for': '198.51.100.9, 10.0.0.1' })
    await isRateLimited('login', 'a@x.com')
    expect(rpc).toHaveBeenCalledWith(
      'hit_rate_limit',
      expect.objectContaining({ p_key: `login:ip:${sha256('198.51.100.9')}` })
    )
  })

  it('still blocks when one bucket is exhausted and the other errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockImplementation(async (_fn: string, args: { p_key: string }) =>
      args.p_key.startsWith('login:ip:')
        ? { data: false, error: null }
        : { data: null, error: { message: 'boom' } }
    )
    expect(await isRateLimited('login', 'a@x.com')).toBe(true)
    consoleError.mockRestore()
  })

  it('fails open (allows) when the limiter itself errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockResolvedValue({ data: null, error: { message: 'function hit_rate_limit does not exist' } })
    expect(await isRateLimited('login', 'a@x.com')).toBe(false)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('login / signup actions', () => {
  it('login: a limited request is refused before reaching Supabase Auth', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    const result = await login(loginForm('a@x.com'))
    expect(result.error).toMatch(LIMITED_MESSAGE)
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('login: an allowed request signs in as before', async () => {
    allowAll()
    await expect(login(loginForm('a@x.com'))).rejects.toBeInstanceOf(RedirectSignal)
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@x.com', password: 'pw123456' })
  })

  it('login: missing fields are rejected without counting a hit', async () => {
    allowAll()
    const result = await login(loginForm(''))
    expect(result.error).toMatch(/required/)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('signup: a limited request is refused before reaching Supabase Auth', async () => {
    rpc.mockResolvedValue({ data: false, error: null })
    const result = await signup(null, signupForm('new@x.com'))
    expect(result.error).toMatch(LIMITED_MESSAGE)
    expect(signUp).not.toHaveBeenCalled()
  })

  it('signup: an allowed request signs up as before', async () => {
    allowAll()
    await expect(signup(null, signupForm('new@x.com'))).rejects.toBeInstanceOf(RedirectSignal)
    expect(signUp).toHaveBeenCalledTimes(1)
  })
})
