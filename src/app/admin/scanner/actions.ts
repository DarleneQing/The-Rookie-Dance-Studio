'use server';

import { createClient } from '@/lib/supabase/server';
import type { CourseWithBookingCount } from '@/types/courses';
import { getErrorMessage } from '@/lib/utils/error-helpers';
import { unwrapSupabaseRelation } from '@/lib/utils/supabase-helpers';

export interface CheckinWithUser {
  id: string;
  created_at: string;
  booking_type: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface CourseCheckinResponse {
  success: boolean;
  message: string;
  booking_type?: string;
  current_attendance?: number;
  max_capacity?: number;
  remaining_credits?: number;
}

export interface SubscriptionDetails {
  type: string;
  remainingCredits?: number;
  endDate?: string;
}

/** Everything the scanner UI needs after a QR scan, fetched in one round-trip. */
export interface CheckinContext {
  success: boolean;
  message?: string;
  profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    dob: string | null;
    member_type: 'adult' | 'student';
  };
  /** Whether this user already checked in for this course (repeat scan warning). */
  isRepeatCheckin: boolean;
  /** Whether the user has an existing confirmed booking for this course. */
  hasBooking: boolean;
  /** The effective booking type (may be upgraded to 'subscription' if user acquired a card). */
  bookingType?: 'subscription' | 'single' | 'drop_in';
  /** Subscription details if a usable subscription was found (via booking or standalone). */
  subscriptionDetails?: SubscriptionDetails;
}

// Shared Supabase filter for "find usable subscription" — mirrors the SQL
// find_usable_subscription() helper so client and server stay in sync.
function usableSubscriptionFilter(today: string): string {
  // For times cards: remaining_credits > 0 is sufficient (depleted cards have 0).
  // For monthly: must be active and within validity period.
  return `and(type.in.(5_times,10_times),remaining_credits.gt.0),and(type.eq.monthly,status.eq.active,end_date.gte.${today})`;
}

function formatSubDetails(sub: {
  type: string;
  remaining_credits: number;
  end_date: string;
}): SubscriptionDetails {
  return {
    type: sub.type,
    remainingCredits:
      sub.type === '5_times' || sub.type === '10_times'
        ? sub.remaining_credits
        : undefined,
    endDate: sub.type === 'monthly' ? sub.end_date : undefined,
  };
}

/**
 * Single server action that fetches everything the scanner needs after a QR scan:
 * profile, repeat-checkin status, booking info, and subscription info.
 * Runs all independent queries in parallel — one HTTP round-trip instead of 3-4.
 */
export async function getCheckinContext(
  userId: string,
  courseId: string
): Promise<CheckinContext> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // Run all independent queries in parallel
  const [profileResult, checkinResult, bookingResult, subscriptionResult] =
    await Promise.all([
      // 1. User profile
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, dob, member_type')
        .eq('id', userId)
        .single(),
      // 2. Already checked in for this course?
      supabase
        .from('checkins')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .limit(1),
      // 3. Existing confirmed booking (with linked subscription)
      supabase
        .from('bookings')
        .select(`
          id, booking_type, subscription_id,
          subscription:subscriptions(id, status, type, remaining_credits, end_date)
        `)
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('status', 'confirmed')
        .maybeSingle(),
      // 4. Best usable subscription (independent of any booking)
      supabase
        .from('subscriptions')
        .select('id, status, type, remaining_credits, end_date')
        .eq('user_id', userId)
        .or(usableSubscriptionFilter(today))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // Profile is required
  if (profileResult.error || !profileResult.data) {
    return {
      success: false,
      message: profileResult.error?.code === 'PGRST116'
        ? 'Member not found'
        : profileResult.error?.message || 'Failed to fetch member profile',
      isRepeatCheckin: false,
      hasBooking: false,
    };
  }

  const profile = profileResult.data;
  const isRepeatCheckin = !!(checkinResult.data && checkinResult.data.length > 0);
  const booking = bookingResult.data;
  const usableSub = subscriptionResult.data;

  // No booking — return profile + subscription info (for drop-in/capacity-override dialogs)
  if (!booking) {
    return {
      success: true,
      profile: {
        id: profile.id,
        full_name: profile.full_name || 'Unknown',
        avatar_url: profile.avatar_url,
        dob: profile.dob,
        member_type: profile.member_type,
      },
      isRepeatCheckin,
      hasBooking: false,
      bookingType: usableSub ? 'subscription' : 'single',
      subscriptionDetails: usableSub ? formatSubDetails(usableSub) : undefined,
    };
  }

  // Has booking — determine effective booking type
  let bookingType: 'subscription' | 'single' | 'drop_in' = booking.booking_type;
  let subDetails: SubscriptionDetails | undefined;

  if (booking.booking_type === 'subscription' && booking.subscription_id) {
    // Check if the linked subscription is still usable
    const linkedSub = unwrapSupabaseRelation(booking.subscription);
    if (linkedSub) {
      const linkedUsable =
        ((linkedSub.type === '5_times' || linkedSub.type === '10_times') &&
          linkedSub.remaining_credits > 0) ||
        (linkedSub.type === 'monthly' && linkedSub.end_date >= today);

      if (linkedUsable) {
        subDetails = formatSubDetails(linkedSub);
      }
    }
    // Linked sub is depleted/expired/missing — fall through to check usableSub
    if (!subDetails && usableSub) {
      subDetails = formatSubDetails(usableSub);
    }
    // If no usable sub at all, downgrade display to 'single'
    if (!subDetails) {
      bookingType = 'single';
    }
  } else {
    // Booking is single/drop_in — check if user has since acquired a subscription
    if (usableSub) {
      bookingType = 'subscription';
      subDetails = formatSubDetails(usableSub);
    }
  }

  return {
    success: true,
    profile: {
      id: profile.id,
      full_name: profile.full_name || 'Unknown',
      avatar_url: profile.avatar_url,
      dob: profile.dob,
      member_type: profile.member_type,
    },
    isRepeatCheckin,
    hasBooking: true,
    bookingType,
    subscriptionDetails: subDetails,
  };
}

export async function getTodaysCourses(): Promise<CourseWithBookingCount[]> {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      instructor:profiles!courses_instructor_id_fkey(id, full_name, avatar_url),
      booking_count:bookings(count)
    `)
    .eq('scheduled_date', today)
    .eq('status', 'scheduled')
    .order('start_time', { ascending: true });

  if (error) {
    return [];
  }

  return (data || []).map((course) => ({
    ...course,
    booking_count: Array.isArray(course.booking_count)
      ? course.booking_count.length
      : 0,
    instructor: unwrapSupabaseRelation(course.instructor),
  })) as CourseWithBookingCount[];
}

export async function getCourseCheckins(courseId: string): Promise<CheckinWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('checkins')
    .select(`
      id,
      created_at,
      booking_type,
      user:profiles!checkins_user_id_fkey(id, full_name, avatar_url)
    `)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    created_at: item.created_at,
    booking_type: item.booking_type,
    user: unwrapSupabaseRelation(item.user),
  })) as CheckinWithUser[];
}

/**
 * Checks if a user has any usable subscription.
 * Used by the legacy (non-course) QR scanner to auto-select the 'abo' payment method.
 */
export async function getUserActiveSubscription(
  userId: string
): Promise<{
  hasSubscription: boolean;
  subscriptionDetails?: SubscriptionDetails;
}> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status, type, remaining_credits, end_date')
    .eq('user_id', userId)
    .or(usableSubscriptionFilter(today))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { hasSubscription: false };
  }

  return {
    hasSubscription: true,
    subscriptionDetails: formatSubDetails(data),
  };
}

export type PaymentMethod = 'cash' | 'twint' | 'abo';

export async function performCourseCheckin(
  userId: string,
  courseId: string,
  isDropIn: boolean = false,
  paymentMethod: PaymentMethod
): Promise<CourseCheckinResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    const { data, error } = await supabase.rpc('perform_course_checkin', {
      p_user_id: userId,
      p_course_id: courseId,
      p_admin_id: user.id,
      p_is_drop_in: isDropIn,
      p_payment_method: paymentMethod,
    });

    if (error) {
      console.error('perform_course_checkin RPC error:', error);
      const errorMessage = error.message || error.details || 'Database error occurred';
      return {
        success: false,
        message: errorMessage
      };
    }

    if (!data) {
      return {
        success: false,
        message: 'No response from server'
      };
    }

    return data as CourseCheckinResponse;
  } catch (error) {
    const errorMessage = getErrorMessage(error, 'Failed to perform check-in');
    console.error('performCourseCheckin error:', errorMessage, error);
    return {
      success: false,
      message: errorMessage
    };
  }
}
