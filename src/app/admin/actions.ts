'use server'

import { createClient } from '@/lib/supabase/server'

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

