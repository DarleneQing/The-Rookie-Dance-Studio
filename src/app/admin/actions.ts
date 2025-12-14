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
