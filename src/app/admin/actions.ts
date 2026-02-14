'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type PaymentMethod = 'cash' | 'twint' | 'abo';

export async function checkInUser(userId: string, paymentMethod: PaymentMethod) {
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
    p_payment_method: paymentMethod,
  })

  if (error) {
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
    member_type: 'adult' | 'student'
    already_checked_in_today: boolean
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
    .select('id, full_name, avatar_url, dob, member_type')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, message: 'Member not found' }
    }
    return { success: false, message: error.message || 'Failed to fetch member profile' }
  }

  if (!profile) {
    return { success: false, message: 'Member not found' }
  }

  const { data: alreadyCheckedInToday, error: alreadyCheckedInError } = await supabase.rpc(
    'has_checked_in_today',
    {
      p_user_id: userId,
    }
  )

  if (alreadyCheckedInError) {
    return {
      success: false,
      message: alreadyCheckedInError.message || 'Failed to check today status',
    }
  }

  return {
    success: true,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      dob: profile.dob,
      member_type: profile.member_type,
      already_checked_in_today: Boolean(alreadyCheckedInToday),
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
    return { success: false, message: error.message }
  }

  revalidatePath('/admin/users')
  return { success: true, message: 'Subscription assigned successfully' }
}

export async function approveStudentVerification(
  userId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Unauthorized' }
  }

  // Check if admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return { success: false, message: 'Only admins can approve verifications' }
  }

  // Verify target user exists and has pending status
  const { data: targetProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('verification_status')
    .eq('id', userId)
    .single()

  if (fetchError || !targetProfile) {
    return { success: false, message: 'User not found' }
  }

  if (targetProfile.verification_status !== 'pending') {
    return {
      success: false,
      message: `Cannot approve verification. Current status: ${targetProfile.verification_status}`,
    }
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      member_type: 'student',
      verification_status: 'approved',
    })
    .eq('id', userId)

  if (updateError) {
    return { success: false, message: updateError.message || 'Failed to approve verification' }
  }

  revalidatePath('/admin/verifications')
  revalidatePath('/admin/users')
  revalidatePath('/profile')

  return { success: true, message: 'Student verification approved successfully' }
}

export async function rejectStudentVerification(
  userId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Unauthorized' }
  }

  // Check if admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return { success: false, message: 'Only admins can reject verifications' }
  }

  // Validate reason
  if (!reason || !reason.trim()) {
    return { success: false, message: 'Rejection reason is required' }
  }

  // Verify target user exists and has pending status
  const { data: targetProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('verification_status, member_type')
    .eq('id', userId)
    .single()

  if (fetchError || !targetProfile) {
    return { success: false, message: 'User not found' }
  }

  if (targetProfile.verification_status !== 'pending') {
    return {
      success: false,
      message: `Cannot reject verification. Current status: ${targetProfile.verification_status}`,
    }
  }

  // Update profile (keep member_type as is, set status to rejected)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      verification_status: 'rejected',
      rejection_reason: reason.trim(),
    })
    .eq('id', userId)

  if (updateError) {
    return { success: false, message: updateError.message || 'Failed to reject verification' }
  }

  revalidatePath('/admin/verifications')
  revalidatePath('/admin/users')
  revalidatePath('/profile')

  return { success: true, message: 'Student verification rejected successfully' }
}

export async function requestStudentReVerification(
  userId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Unauthorized' }
  }

  // Check if admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return { success: false, message: 'Only admins can request re-verification' }
  }

  // Verify target user exists and is an approved student
  const { data: targetProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('verification_status, member_type')
    .eq('id', userId)
    .single()

  if (fetchError || !targetProfile) {
    return { success: false, message: 'User not found' }
  }

  if (targetProfile.member_type !== 'student') {
    return { success: false, message: 'User is not a student' }
  }

  if (targetProfile.verification_status !== 'approved') {
    return {
      success: false,
      message: `Cannot request re-verification. Current status: ${targetProfile.verification_status}`,
    }
  }

  const defaultReason = 'Your student verification has expired. Please upload a current student card to maintain your student status.'
  
  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      verification_status: 'reupload_required',
      rejection_reason: reason?.trim() || defaultReason,
    })
    .eq('id', userId)

  if (updateError) {
    return { success: false, message: updateError.message || 'Failed to request re-verification' }
  }

  revalidatePath('/admin/users')
  revalidatePath('/profile')

  return { success: true, message: 'Re-verification request sent successfully' }
}
