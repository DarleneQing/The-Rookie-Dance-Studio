'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/utils/admin-guard'
import { calculateClassFinance } from '@/lib/finance/calculate-class-finance'
import {
  upsertAboSale,
  upsertFinanceCloseout,
  upsertOtherTransaction,
  type AboSalePayload,
  type OtherTransactionPayload,
} from '@/lib/finance/finance-closeout-webhook'
import {
  financeWorkbookLinks,
  getAboSaleRowLink,
  getFinanceCloseoutRowLink,
  getOtherTransactionRowLink,
} from '@/lib/finance-workbook'
import type { SubscriptionType } from '@/lib/pricing'

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

export type AboPriceLabel = AboSalePayload['priceLabel']
export type FinancePaymentChannel = AboSalePayload['paymentChannel']
export type FinanceDestination = AboSalePayload['destination']

export type AboPaymentInput =
  | { recordPayment: false }
  | {
      recordPayment: true
      paymentDate: string
      priceLabel: AboPriceLabel
      actualSaleAmount: number
      paymentChannel: FinancePaymentChannel
      destination: FinanceDestination
      relatedSettlementId?: string
    }

export interface AssignSubscriptionResult {
  success: boolean
  message: string
  subscriptionId?: string
  financeRecorded?: boolean
  financeMessage?: string
  financeSheetUrl?: string
}

const ABO_PRODUCT_BY_TYPE: Record<SubscriptionType, AboSalePayload['product']> = {
  monthly: 'Monthly',
  '5_times': '5-times',
  '10_times': '10-times',
}

const ABO_PRICE_LABELS: readonly AboPriceLabel[] = [
  'Old Price',
  'New Price',
  'Discount',
  'Special',
  'N/A',
]
const FINANCE_PAYMENT_CHANNELS: readonly FinancePaymentChannel[] = [
  'Cash',
  'TWINT',
  'Bank',
  'Other',
]
const FINANCE_DESTINATIONS: readonly FinanceDestination[] = [
  'Cash Box',
  'Personal TWINT',
  'Public Bank Account',
  'Other',
]

function isValidPaymentDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function validateAboPayment(payment: AboPaymentInput): string | null {
  if (!payment.recordPayment) return null
  if (!isValidPaymentDate(payment.paymentDate)) return 'A valid payment date is required.'
  if (!ABO_PRICE_LABELS.includes(payment.priceLabel)) return 'The price context is invalid.'
  if (!Number.isFinite(payment.actualSaleAmount) || payment.actualSaleAmount <= 0) {
    return 'Actual sale amount must be greater than zero.'
  }
  if (!FINANCE_PAYMENT_CHANNELS.includes(payment.paymentChannel)) {
    return 'The payment channel is invalid.'
  }
  if (!FINANCE_DESTINATIONS.includes(payment.destination)) {
    return 'The payment destination is invalid.'
  }
  return null
}

async function writeAboSale(params: {
  adminId: string
  subscriptionId: string
  userId: string
  type: SubscriptionType
  payment: Extract<AboPaymentInput, { recordPayment: true }>
}): Promise<{ recorded: boolean; message: string; sheetUrl: string }> {
  const supabase = createClient()
  const [memberResult, adminResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', params.userId).single(),
    supabase.from('profiles').select('full_name').eq('id', params.adminId).single(),
  ])

  const memberName = memberResult.data?.full_name?.trim() || 'Member'
  const result = await upsertAboSale({
    saleId: `ABO-${params.subscriptionId}`,
    paymentDate: params.payment.paymentDate,
    relatedSettlementId: params.payment.relatedSettlementId?.trim() || '',
    memberReference: `${memberName} | ${params.userId}`,
    product: ABO_PRODUCT_BY_TYPE[params.type],
    priceLabel: params.payment.priceLabel,
    actualSaleAmount: params.payment.actualSaleAmount,
    paymentChannel: params.payment.paymentChannel,
    destination: params.payment.destination,
    subscriptionId: params.subscriptionId,
    enteredBy: adminResult.data?.full_name?.trim() || 'Admin',
  })

  if (!result.ok || !result.row) {
    return {
      recorded: false,
      message: result.message || 'The Abo sale could not be added to Google Sheets.',
      sheetUrl: financeWorkbookLinks.aboSales,
    }
  }

  return {
    recorded: true,
    message:
      result.status === 'locked'
        ? 'The Abo sale was already recorded.'
        : 'The Abo sale was recorded for account review.',
    sheetUrl: getAboSaleRowLink(result.row),
  }
}

export async function assignUserSubscription(
  userId: string,
  type: SubscriptionType,
  startDate?: string,
  payment: AboPaymentInput = { recordPayment: false }
): Promise<AssignSubscriptionResult> {
  const supabase = createClient()
  
  const admin = await requireAdmin()
  if (!admin) {
    return { success: false, message: 'Unauthorized' }
  }

  // Call RPC
  const validationError = validateAboPayment(payment)
  if (validationError) return { success: false, message: validationError }
  if (!(type in ABO_PRODUCT_BY_TYPE)) {
    return { success: false, message: 'This subscription type is invalid.' }
  }

  const { data, error } = await supabase.rpc('assign_subscription', {
    p_user_id: userId,
    p_type: type,
    p_start_date: startDate || null,
    p_admin_id: admin.id
  })

  if (error) {
    console.error('assign_subscription RPC error:', error)
    return { success: false, message: 'Failed to assign subscription' }
  }

  const subscriptionId = typeof data === 'string' ? data : null
  if (!subscriptionId) {
    console.error('assign_subscription did not return a subscription ID')
    return {
      success: true,
      message: 'Subscription assigned, but its finance reference needs manual entry.',
      financeRecorded: payment.recordPayment ? false : undefined,
      financeMessage: payment.recordPayment
        ? 'The website did not receive the new Subscription ID. Record this sale manually in Abo Sales.'
        : undefined,
      financeSheetUrl: payment.recordPayment ? financeWorkbookLinks.aboSales : undefined,
    }
  }

  revalidatePath('/admin/users')

  if (!payment.recordPayment) {
    return {
      success: true,
      message: 'Subscription assigned without a new payment.',
      subscriptionId,
    }
  }

  const finance = await writeAboSale({
    adminId: admin.id,
    subscriptionId,
    userId,
    type,
    payment,
  })

  return {
    success: true,
    message: 'Subscription assigned successfully.',
    subscriptionId,
    financeRecorded: finance.recorded,
    financeMessage: finance.message,
    financeSheetUrl: finance.sheetUrl,
  }
}

export async function retryAboSaleRecord(
  subscriptionId: string,
  payment: Extract<AboPaymentInput, { recordPayment: true }>
): Promise<AssignSubscriptionResult> {
  const admin = await requireAdmin()
  if (!admin) return { success: false, message: 'Unauthorized' }

  const validationError = validateAboPayment(payment)
  if (validationError) return { success: false, message: validationError }

  const supabase = createClient()
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, type')
    .eq('id', subscriptionId)
    .single()

  if (error || !subscription) {
    return { success: false, message: 'The assigned subscription could not be loaded.' }
  }

  const type = subscription.type as SubscriptionType
  if (!(type in ABO_PRODUCT_BY_TYPE)) {
    return { success: false, message: 'This subscription type cannot be recorded as an Abo sale.' }
  }

  const finance = await writeAboSale({
    adminId: admin.id,
    subscriptionId,
    userId: subscription.user_id,
    type,
    payment,
  })

  return {
    success: true,
    message: 'Subscription remains assigned.',
    subscriptionId,
    financeRecorded: finance.recorded,
    financeMessage: finance.message,
    financeSheetUrl: finance.sheetUrl,
  }
}

export type QuickTransactionCategory = OtherTransactionPayload['category']
export type FinanceCustodyStatus = OtherTransactionPayload['custodyStatus']

const QUICK_TRANSACTION_CATEGORIES: readonly QuickTransactionCategory[] = [
  'Instructor',
  'Venue',
  'Admin',
  'Donation',
  'Sponsorship',
  'Refund',
  'Other',
]
const FINANCE_CUSTODY_STATUSES: readonly FinanceCustodyStatus[] = [
  'Not Needed',
  'Pending',
  'Reimbursed',
  'Holding Cash',
  'Transferred',
  'Other',
]

export interface QuickTransactionInput {
  transactionId: string
  transactionDate: string
  serviceDate?: string
  direction: 'income' | 'expense'
  category: QuickTransactionCategory
  description: string
  amount: number
  paymentChannel: FinancePaymentChannel
  destination: FinanceDestination
  receiptLink?: string
  custodyStatus: FinanceCustodyStatus
  notes?: string
}

export interface FinanceRecordActionResult {
  success: boolean
  message: string
  sheetUrl?: string
}

function getTransactionType(
  direction: QuickTransactionInput['direction'],
  category: QuickTransactionCategory
): OtherTransactionPayload['transactionType'] | null {
  if (direction === 'income') {
    if (category === 'Donation') return 'Donation'
    if (category === 'Sponsorship') return 'Sponsorship'
    if (category === 'Other') return 'Other'
    return null
  }

  if (category === 'Instructor') return 'Instructor Fee'
  if (category === 'Venue') return 'Rent'
  if (category === 'Refund') return 'Refund'
  if (category === 'Admin') return 'Expense'
  if (category === 'Other') return 'Expense'
  return null
}

export async function recordOtherTransaction(
  input: QuickTransactionInput
): Promise<FinanceRecordActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { success: false, message: 'Unauthorized' }

  const transactionType = getTransactionType(input.direction, input.category)
  if (!/^TXN-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.transactionId)) {
    return { success: false, message: 'The transaction reference is invalid.' }
  }
  if (!isValidPaymentDate(input.transactionDate)) {
    return { success: false, message: 'A valid transaction date is required.' }
  }
  if (input.serviceDate && !isValidPaymentDate(input.serviceDate)) {
    return { success: false, message: 'The service date is invalid.' }
  }
  if (!QUICK_TRANSACTION_CATEGORIES.includes(input.category)) {
    return { success: false, message: 'The transaction category is invalid.' }
  }
  if (!transactionType) {
    return { success: false, message: 'This category does not match the selected income or expense type.' }
  }
  if (!input.description.trim()) {
    return { success: false, message: 'A short description is required.' }
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { success: false, message: 'Amount must be greater than zero.' }
  }
  if (input.receiptLink && !/^https?:\/\//i.test(input.receiptLink)) {
    return { success: false, message: 'Receipt link must start with http:// or https://.' }
  }
  if (!FINANCE_PAYMENT_CHANNELS.includes(input.paymentChannel)) {
    return { success: false, message: 'The payment channel is invalid.' }
  }
  if (!FINANCE_DESTINATIONS.includes(input.destination)) {
    return { success: false, message: 'The payment destination is invalid.' }
  }
  if (!FINANCE_CUSTODY_STATUSES.includes(input.custodyStatus)) {
    return { success: false, message: 'The reimbursement or custody status is invalid.' }
  }

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', admin.id)
    .single()
  const adminName = profile?.full_name?.trim() || 'Admin'

  const result = await upsertOtherTransaction({
    transactionId: input.transactionId,
    transactionDate: input.transactionDate,
    serviceDate: input.serviceDate || input.transactionDate,
    transactionType,
    category: input.category,
    description: input.description.trim(),
    direction: input.direction,
    amount: input.amount,
    paymentChannel: input.paymentChannel,
    destination: input.destination,
    paidCollectedBy: adminName,
    receiptLink: input.receiptLink?.trim() || '',
    custodyStatus: input.custodyStatus,
    confirmedBy: adminName,
    notes: input.notes?.trim() || '',
  })

  if (!result.ok || !result.row) {
    return {
      success: false,
      message: result.message || 'The transaction could not be added to Google Sheets.',
      sheetUrl: financeWorkbookLinks.otherTransactions,
    }
  }

  return {
    success: true,
    message:
      result.status === 'locked'
        ? 'This transaction was already recorded.'
        : 'Transaction recorded for account review.',
    sheetUrl: getOtherTransactionRowLink(result.row),
  }
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
  course_id: string
  full_name: string | null
  member_type: 'adult' | 'student' | null
  payment_method: 'cash' | 'twint' | 'abo' | null
  phone_number: string | null
  created_at: string
}

export interface FinanceCourseItem {
  id: string
  dance_style: string
  scheduled_date: string
  start_time: string
}

/**
 * Admin-only: check-ins with member details for the finance view, for one day.
 * Runs on the server so phone numbers are never fetched into a client bundle
 * (RLS alone is not an authorization boundary for browser-replayed queries).
 */
export async function getFinanceCheckins(
  selectedDate: string
): Promise<{
  success: boolean
  message?: string
  items?: FinanceCheckinItem[]
  courses?: FinanceCourseItem[]
}> {
  const admin = await requireAdmin()
  if (!admin) {
    return { success: false, message: 'Unauthorized' }
  }

  const supabase = createClient()
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('id, dance_style, scheduled_date, start_time')
    .eq('scheduled_date', selectedDate)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })

  if (courseError) {
    console.error('getFinanceCheckins course error:', courseError)
    return { success: false, message: 'Failed to load classes' }
  }

  const courses = (courseData ?? []) as FinanceCourseItem[]
  if (courses.length === 0) {
    return { success: true, items: [], courses: [] }
  }

  const { data, error } = await supabase
    .from('checkins')
    .select('id, course_id, created_at, payment_method, profiles!user_id(full_name, member_type, phone_number)')
    .in('course_id', courses.map((course) => course.id))
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getFinanceCheckins error:', error)
    return { success: false, message: 'Failed to load check-ins' }
  }

  const items: FinanceCheckinItem[] = ((data as Array<{
    id: string
    course_id: string
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
      course_id: item.course_id,
      full_name: p?.full_name ?? null,
      member_type: (p?.member_type === 'adult' || p?.member_type === 'student' ? p.member_type : null) as 'adult' | 'student' | null,
      payment_method: item.payment_method,
      phone_number: p?.phone_number ?? null,
      created_at: item.created_at,
    }
  })

  return { success: true, items, courses }
}

export interface FinanceCloseoutActionResult {
  success: boolean
  status?: 'created' | 'refreshed' | 'locked'
  message: string
  sheetUrl?: string
}

/**
 * Recomputes a single class from server-side check-ins and upserts only the
 * workbook's system snapshot columns. A Backup-confirmed row is immutable.
 */
export async function createOrRefreshFinanceCloseout(
  courseId: string
): Promise<FinanceCloseoutActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { success: false, message: 'Unauthorized' }
  if (!courseId) return { success: false, message: 'No class selected.' }

  const supabase = createClient()
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, dance_style, scheduled_date, start_time')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    console.error('createOrRefreshFinanceCloseout course error:', courseError)
    return { success: false, message: 'The selected class could not be loaded.' }
  }

  const [checkinsResult, adminProfileResult] = await Promise.all([
    supabase
      .from('checkins')
      .select('payment_method, profiles!user_id(member_type)')
      .eq('course_id', courseId),
    supabase.from('profiles').select('full_name').eq('id', admin.id).single(),
  ])

  if (checkinsResult.error) {
    console.error('createOrRefreshFinanceCloseout check-ins error:', checkinsResult.error)
    return { success: false, message: 'The latest check-ins could not be loaded.' }
  }

  const checkins = ((checkinsResult.data ?? []) as Array<{
    payment_method: 'cash' | 'twint' | 'abo' | null
    profiles:
      | { member_type: string | null }
      | { member_type: string | null }[]
      | null
  }>).map((checkin) => {
    const profile = Array.isArray(checkin.profiles)
      ? checkin.profiles[0] ?? null
      : checkin.profiles
    return {
      payment_method: checkin.payment_method,
      member_type:
        profile?.member_type === 'adult' || profile?.member_type === 'student'
          ? profile.member_type
          : null,
    } as const
  })

  const finance = calculateClassFinance(checkins)
  if (finance.unresolvedCount > 0) {
    return {
      success: false,
      message: `${finance.unresolvedCount} check-in${finance.unresolvedCount === 1 ? '' : 's'} need a valid payment method and member type before finance can be calculated.`,
    }
  }

  const backupName = adminProfileResult.data?.full_name?.trim() || 'Admin'
  const result = await upsertFinanceCloseout({
    settlementId: `CLASS-${course.id}`,
    classDate: course.scheduled_date,
    courseId: course.id,
    classStyle: course.dance_style,
    startTime: course.start_time.slice(0, 5),
    backupName,
    adultCashCount: finance.adultCashCount,
    studentCashCount: finance.studentCashCount,
    adultTwintCount: finance.adultTwintCount,
    studentTwintCount: finance.studentTwintCount,
    aboCount: finance.aboCount,
    systemCash: finance.cashTotal,
    systemTwint: finance.twintTotal,
  })

  if (!result.ok || !result.status || !result.row) {
    return { success: false, message: result.message || 'The finance row was not updated.' }
  }

  const messages = {
    created: 'The latest check-ins were added to a new finance row.',
    refreshed: 'The finance row was refreshed from the latest check-ins.',
    locked: 'This row is already Backup confirmed, so no system values were changed.',
  } as const

  return {
    success: true,
    status: result.status,
    message: messages[result.status],
    sheetUrl: getFinanceCloseoutRowLink(result.row),
  }
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
