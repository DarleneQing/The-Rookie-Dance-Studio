'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function checkInUser(userId: string) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Unauthorized' }
  }

  // Call the RPC
  const { data, error } = await supabase.rpc('perform_checkin', {
    p_user_id: userId,
    p_admin_id: user.id,
  })

  if (error) {
    console.error('Check-in error:', error)
    return { success: false, message: error.message }
  }

  // RPC returns JSONB with success/message
  return data as { success: boolean; message: string; checkin_id?: string; remaining?: number }
}

export async function getMemberProfile(userId: string): Promise<{
  success: boolean
  message?: string
  profile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    dob: string | null
  }
}> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Unauthorized' }
  }

  // Query profiles table for the userId
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, dob')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Get member profile error:', error)
    if (error.code === 'PGRST116') {
      return { success: false, message: 'Member not found' }
    }
    return { success: false, message: error.message || 'Failed to fetch member profile' }
  }

  if (!profile) {
    return { success: false, message: 'Member not found' }
  }

  return {
    success: true,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      dob: profile.dob,
    },
  }
}

export async function assignUserSubscription(
  userId: string, 
  type: 'monthly' | '5_times' | '10_times', 
  startDate?: string
) {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Unauthorized' }
  }

  // Call RPC
  const { error } = await supabase.rpc('assign_subscription', {
    p_user_id: userId,
    p_type: type,
    p_start_date: startDate || null,
    p_admin_id: user.id
  })

  if (error) {
    console.error('Assign sub error:', error)
    return { success: false, message: error.message }
  }

  revalidatePath('/admin/users')
  return { success: true, message: 'Subscription assigned successfully' }
}
