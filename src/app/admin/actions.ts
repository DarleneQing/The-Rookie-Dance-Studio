'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/utils/admin-guard'

export type PaymentMethod = 'cash' | 'twint' | 'abo';

export async function checkInUser(userId: string, paymentMethod: PaymentMethod) {
  const supabase = createClient()

  const admin = await requireAdmin()
  if (!admin) {
    return { success: false, message: 'Unauthorized' }
  }

  // Call the RPC
  const { data, error } = await supabase.rpc('perform_checkin', {
    p_user_id: userId,
    p_admin_id: admin.id,
    p_payment_method: paymentMethod,
  })

  if (error) {
    console.error('perform_checkin RPC error:', error)
    return { success: false, message: 'Failed to check in member' }
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

  const admin = await requireAdmin()
  if (!admin) {
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
    console.error('getMemberProfile error:', error)
    return { success: false, message: 'Failed to fetch member profile' }
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
  
  const admin = await requireAdmin()
  if (!admin) {
    return { success: false, message: 'Unauthorized' }
  }

  // Call RPC
  const { error } = await supabase.rpc('assign_subscription', {
    p_user_id: userId,
    p_type: type,
    p_start_date: startDate || null,
    p_admin_id: admin.id
  })

  if (error) {
    console.error('assign_subscription RPC error:', error)
    return { success: false, message: 'Failed to assign subscription' }
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
    console.error('approveStudentVerification error:', updateError)
    return { success: false, message: 'Failed to approve verification' }
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
    console.error('rejectStudentVerification error:', updateError)
    return { success: false, message: 'Failed to reject verification' }
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
    console.error('requestStudentReVerification error:', updateError)
    return { success: false, message: 'Failed to request re-verification' }
  }

  revalidatePath('/admin/users')
  revalidatePath('/profile')

  return { success: true, message: 'Re-verification request sent successfully' }
}

export interface FinanceCheckinItem {
  id: string
  full_name: string | null
  member_type: 'adult' | 'student' | null
  payment_method: 'cash' | 'twint' | 'abo' | null
  phone_number: string | null
  created_at: string
}

/**
 * Admin-only: check-ins with member details for the finance view, for one day.
 * Runs on the server so phone numbers are never fetched into a client bundle
 * (RLS alone is not an authorization boundary for browser-replayed queries).
 */
export async function getFinanceCheckins(
  selectedDate: string
): Promise<{ success: boolean; message?: string; items?: FinanceCheckinItem[] }> {
  const admin = await requireAdmin()
  if (!admin) {
    return { success: false, message: 'Unauthorized' }
  }

  const supabase = createClient()

  const dateStart = new Date(selectedDate)
  dateStart.setHours(0, 0, 0, 0)
  const dateStartISO = dateStart.toISOString()

  const dateEnd = new Date(selectedDate)
  dateEnd.setHours(23, 59, 59, 999)
  const dateEndISO = dateEnd.toISOString()

  const { data, error } = await supabase
    .from('checkins')
    .select('id, created_at, payment_method, profiles!user_id(full_name, member_type, phone_number)')
    .not('course_id', 'is', null)
    .gte('created_at', dateStartISO)
    .lte('created_at', dateEndISO)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getFinanceCheckins error:', error)
    return { success: false, message: 'Failed to load check-ins' }
  }

  const items: FinanceCheckinItem[] = ((data as Array<{
    id: string
    created_at: string
    payment_method: 'cash' | 'twint' | 'abo' | null
    profiles:
      | { full_name: string | null; member_type: string | null; phone_number: string | null }
      | { full_name: string | null; member_type: string | null; phone_number: string | null }[]
      | null
  }> | null) ?? []).map((item) => {
    const profile = item.profiles
    const p = profile && !Array.isArray(profile) ? profile : Array.isArray(profile) && profile[0] ? profile[0] : null
    return {
      id: item.id,
      full_name: p?.full_name ?? null,
      member_type: (p?.member_type === 'adult' || p?.member_type === 'student' ? p.member_type : null) as 'adult' | 'student' | null,
      payment_method: item.payment_method,
      phone_number: p?.phone_number ?? null,
      created_at: item.created_at,
    }
  })

  return { success: true, items }
}

export interface AdminUserRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string
  member_type: string | null
  verification_status: string | null
  dob: string | null
  subscription: {
    type: string
    status: string
    start_date?: string | null
    total_credits?: number | null
    remaining_credits?: number | null
    end_date?: string | null
  } | null
}

export interface AdminSubscriptionMember {
  id: string
  user_id: string
  type: 'monthly' | '5_times' | '10_times'
  status: 'active' | 'expired' | 'depleted' | 'archived'
  start_date: string | null
  end_date: string | null
  total_credits: number | null
  remaining_credits: number | null
  profile: {
    id: string
    full_name: string | null
    avatar_url: string | null
    member_type: 'adult' | 'student' | null
  } | null
}

/** Admin-only detail for the Active Plans dashboard drill-down. */
export async function getAdminSubscriptionMembers(): Promise<{
  success: boolean
  message?: string
  items?: AdminSubscriptionMember[]
}> {
  const admin = await requireAdmin()
  if (!admin) return { success: false, message: 'Unauthorized' }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      id, user_id, type, status, start_date, end_date,
      total_credits, remaining_credits,
      profile:profiles!subscriptions_user_id_fkey(id, full_name, avatar_url, member_type)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    console.error('getAdminSubscriptionMembers error:', error)
    return { success: false, message: 'Failed to load subscription members' }
  }

  const items = ((data ?? []) as Array<{
    id: string
    user_id: string
    type: 'monthly' | '5_times' | '10_times'
    status: 'active' | 'expired' | 'depleted' | 'archived'
    start_date: string | null
    end_date: string | null
    total_credits: number | null
    remaining_credits: number | null
    profile: AdminSubscriptionMember['profile'] | AdminSubscriptionMember['profile'][]
  }>).map((subscription) => ({
    ...subscription,
    profile: Array.isArray(subscription.profile)
      ? subscription.profile[0] ?? null
      : subscription.profile,
  }))

  return { success: true, items }
}

/**
 * Admin-only server-side member search. Replaces client-side filtering of the
 * whole profiles table: at most 25 matches, searched by name via ilike.
 */
export async function searchAdminUsers(query: string): Promise<AdminUserRow[]> {
  const admin = await requireAdmin()
  if (!admin) return []

  const q = query.trim()
  if (q.length < 2) return []

  const supabase = createClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, member_type, verification_status, dob')
    .ilike('full_name', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(25)

  if (error || !profiles) {
    if (error) console.error('searchAdminUsers error:', error)
    return []
  }

  const ids = profiles.map((p) => p.id)

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('type, status, start_date, end_date, total_credits, remaining_credits, user_id')
    .eq('status', 'active')
    .in('user_id', ids)

  const subMap = new Map(
    (subscriptions || []).map((s) => [s.user_id, s])
  )

  return profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    role: p.role,
    member_type: p.member_type,
    verification_status: p.verification_status,
    dob: p.dob,
    subscription: subMap.get(p.id) || null,
  }))
}

export interface CheckinHistoryItem {
  id: string
  full_name: string | null
  created_at: string
}

/** Admin-only: all check-ins (with member names) for one day, server-side. */
export async function getCheckinHistory(
  selectedDate: string
): Promise<{ success: boolean; message?: string; items?: CheckinHistoryItem[] }> {
  const admin = await requireAdmin()
  if (!admin) {
    return { success: false, message: 'Unauthorized' }
  }

  const supabase = createClient()

  const dateStart = new Date(selectedDate)
  dateStart.setHours(0, 0, 0, 0)
  const dateStartISO = dateStart.toISOString()

  const dateEnd = new Date(selectedDate)
  dateEnd.setHours(23, 59, 59, 999)
  const dateEndISO = dateEnd.toISOString()

  const { data, error } = await supabase
    .from('checkins')
    .select('id, created_at, profiles!user_id(full_name)')
    .gte('created_at', dateStartISO)
    .lte('created_at', dateEndISO)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getCheckinHistory error:', error)
    return { success: false, message: 'Failed to load check-ins' }
  }

  const items: CheckinHistoryItem[] = ((data as Array<{
    id: string
    created_at: string
    profiles: { full_name: string | null } | { full_name: string | null }[] | null
  }> | null) ?? []).map((item) => {
    const profile = item.profiles
    return {
      id: item.id,
      full_name:
        profile && !Array.isArray(profile)
          ? profile.full_name
          : Array.isArray(profile) && profile[0]
          ? profile[0].full_name
          : null,
      created_at: item.created_at,
    }
  })

  return { success: true, items }
}
