'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { isRateLimited, RATE_LIMITED_MESSAGE } from '@/lib/utils/rate-limit'

/**
 * Validate a callback path before redirecting to it.
 *
 * Hardened against CWE-601 open redirect: browsers normalize `\` to `/` and
 * strip tab/CR/LF during URL parsing, so a string check like
 * `path.startsWith('/') && !path.startsWith('//')` is bypassable via
 * `/\evil.com` or `/\t/evil.com`. We require the value to be a same-origin
 * relative path with no backslashes or control characters.
 */
function isValidCallbackUrl(path: string | null): path is string {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/')) return false
  // Reject scheme-relative (//) and protocol-relative (/\ ...) tricks.
  if (path.startsWith('//')) return false
  // Reject backslashes (normalized to / by browsers) and control characters.
  if (path.includes('\\')) return false
  if (/[\u0000-\u001f\u007f]/.test(path)) return false
  // Must resolve to a same-origin path.
  try {
    const resolved = new URL(path, 'https://internal.invalid')
    return resolved.origin === 'https://internal.invalid'
  } catch {
    return false
  }
}

export async function login(formData: FormData): Promise<{ error?: string; message?: string }> {
  const supabase = createClient()

  const email = ((formData.get('email') as string) ?? '').trim()
  const password = (formData.get('password') as string) ?? ''

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  if (await isRateLimited('login', email)) {
    return { error: RATE_LIMITED_MESSAGE }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  const callbackUrl = formData.get('callbackUrl') as string | null
  if (isValidCallbackUrl(callbackUrl)) {
    revalidatePath('/', 'layout')
    redirect(callbackUrl)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const redirectPath = profile?.role === "admin" ? "/admin" : "/profile"
    revalidatePath('/', 'layout')
    redirect(redirectPath)
  }

  revalidatePath('/', 'layout')
  redirect('/profile')
}

// Updated signature for useFormState
export async function signup(prevState: unknown, formData: FormData): Promise<{ error?: string; message?: string }> {
  const supabase = createClient()

  const data = {
    email: (formData.get('email') as string) ?? '',
    password: (formData.get('password') as string) ?? '',
    full_name: (formData.get('full_name') as string) ?? '',
    dob: (formData.get('dob') as string) ?? '',
    phone_number: (formData.get('phone_number') as string) ?? '',
  }

  if (!data.email || !data.password || !data.full_name || !data.dob) {
    return {
      error: 'All fields (email, full name, password, and date of birth) are required.',
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email.trim())) {
    return { error: 'Invalid email format' }
  }

  // Validate password length
  if (data.password.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  // Validate date of birth
  const dobDate = new Date(data.dob)
  if (isNaN(dobDate.getTime())) {
    return { error: 'Invalid date of birth' }
  }
  if (dobDate > new Date()) {
    return { error: 'Date of birth cannot be in the future' }
  }

  // Determine if user is a minor (under 18) and whether a guardian confirmed
  const today = new Date()
  let age = today.getFullYear() - dobDate.getFullYear()
  const monthDiff = today.getMonth() - dobDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
    age--
  }

  const isMinor = age < 18
  const isGuardianForMinor =
    (formData.get('is_guardian_for_minor') as string | null) === 'true'

  if (isMinor && !isGuardianForMinor) {
    return { error: 'A guardian must confirm registration for users under 18.' }
  }

  // Get callback URL if provided
  const callbackUrl = formData.get('callbackUrl') as string | null
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectPath = isValidCallbackUrl(callbackUrl) ? callbackUrl : '/profile'

  if (await isRateLimited('signup', data.email)) {
    return { error: RATE_LIMITED_MESSAGE }
  }

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
        dob: data.dob,
        phone_number: data.phone_number || null,
        guardian_for_minor: isMinor && isGuardianForMinor ? 'true' : 'false',
      },
      emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
    }
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/verify-email')
}

// Password reset deliberately has no Server Action: auth-form.tsx calls
// resetPasswordForEmail from the browser so the PKCE verifier is stored
// client-side, and Supabase then rate-limits by the visitor's real IP. A
// server-side variant would send reset emails from Vercel's IP, bypassing
// that limit — do not reintroduce one without rate limiting it.

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
