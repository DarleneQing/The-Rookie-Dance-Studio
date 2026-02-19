'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

function isValidCallbackUrl(path: string | null): path is string {
  if (!path || typeof path !== 'string') return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  return true
}

export async function login(formData: FormData): Promise<{ error?: string; message?: string }> {
  const supabase = createClient()

  const email = ((formData.get('email') as string) ?? '').trim()
  const password = (formData.get('password') as string) ?? ''

  if (!email || !password) {
    return { error: 'Email and password are required.' }
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

  // Get callback URL if provided
  const callbackUrl = formData.get('callbackUrl') as string | null
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectPath = isValidCallbackUrl(callbackUrl) ? callbackUrl : '/profile'

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
        dob: data.dob,
        phone_number: data.phone_number || null,
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

export async function resetPassword(prevState: unknown, formData: FormData): Promise<{ error?: string; message?: string }> {
  const supabase = createClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required.' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { message: 'Password reset link sent to your email.' }
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
