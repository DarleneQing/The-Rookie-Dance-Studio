'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  // Check if user is admin and redirect accordingly
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

  // Fallback to profile if user fetch fails
  revalidatePath('/', 'layout')
  redirect('/profile')
}

// Updated signature for useFormState
export async function signup(prevState: unknown, formData: FormData) {
  const supabase = createClient()

  const data = {
    email: (formData.get('email') as string) ?? '',
    password: (formData.get('password') as string) ?? '',
    full_name: (formData.get('full_name') as string) ?? '',
    dob: (formData.get('dob') as string) ?? '',
  }

  if (!data.email || !data.password || !data.full_name || !data.dob) {
    return {
      error: 'All fields (email, full name, password, and date of birth) are required.',
    }
  }

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
        dob: data.dob,
      },
    }
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/verify-email')
}

export async function resetPassword(prevState: unknown, formData: FormData) {
  const supabase = createClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required.' }
  }

  // Use headers to get the origin
  // In Server Actions, we can't easily access request headers directly like in API routes
  // So we'll rely on an environment variable or a default
  // Ideally, we should use the `headers()` function from `next/headers` but it's read-only
  
  // For now, let's assume the site URL is configured in Supabase or we use a relative path if works,
  // or use a generic local default for dev.
  // Actually, Supabase handles the site URL base if not provided full URL?
  // Let's provide a relative URL which Supabase resolves against the Site URL.
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/profile/update-password`,
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
