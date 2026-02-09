'use server';

import { createClient } from '@/lib/supabase/server';
import type { CourseWithBookingCount } from '@/types/courses';

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
    console.error('Error fetching today\'s courses:', error);
    return [];
  }
  
  return (data || []).map((course) => ({
    ...course,
    booking_count: Array.isArray(course.booking_count) 
      ? course.booking_count.length 
      : 0,
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
    console.error('Error fetching course check-ins:', error);
    return [];
  }
  
  // Transform the data to match CheckinWithUser type
  return (data || []).map((item) => ({
    id: item.id,
    created_at: item.created_at,
    booking_type: item.booking_type,
    user: Array.isArray(item.user) ? item.user[0] : item.user,
  })) as CheckinWithUser[];
}

export async function getUserBookingForCourse(
  userId: string, 
  courseId: string
): Promise<{ 
  hasBooking: boolean; 
  bookingType?: string;
  subscriptionDetails?: {
    type: string;
    remainingCredits?: number;
    endDate?: string;
  };
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, 
      booking_type, 
      subscription_id,
      subscription:subscriptions(id, status, type, remaining_credits, end_date)
    `)
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'confirmed')
    .maybeSingle();
  
  if (error) {
    console.error('Error checking user booking:', error);
    return { hasBooking: false };
  }
  
  if (!data) {
    return { hasBooking: false };
  }
  
  // If booking type is subscription, validate the subscription is still active
  if (data.booking_type === 'subscription' && data.subscription_id) {
    const sub = Array.isArray(data.subscription) ? data.subscription[0] : data.subscription;
    
    // Check if subscription exists and is active
    if (!sub || sub.status !== 'active') {
      return { hasBooking: true, bookingType: 'single' };
    }
    
    // Validate credits for times-based subscriptions
    if (sub.type === '5_times' || sub.type === '10_times') {
      if (sub.remaining_credits <= 0) {
        return { hasBooking: true, bookingType: 'single' };
      }
    }
    
    // Validate end date for monthly subscriptions
    if (sub.type === 'monthly') {
      if (new Date(sub.end_date) < new Date()) {
        return { hasBooking: true, bookingType: 'single' };
      }
    }
    
    // Subscription is valid - return with details
    return { 
      hasBooking: true, 
      bookingType: 'subscription',
      subscriptionDetails: {
        type: sub.type,
        remainingCredits: sub.type === '5_times' || sub.type === '10_times' 
          ? sub.remaining_credits 
          : undefined,
        endDate: sub.type === 'monthly' ? sub.end_date : undefined,
      }
    };
  }
  
  // For non-subscription bookings (single or drop-in)
  return {
    hasBooking: true,
    bookingType: data.booking_type,
  };
}

export async function checkUserAlreadyCheckedIn(
  userId: string,
  courseId: string
): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .limit(1);
  
  if (error) {
    console.error('Error checking if user already checked in:', error);
    return false;
  }
  
  return data && data.length > 0;
}

export async function getUserActiveSubscription(
  userId: string
): Promise<{ 
  hasSubscription: boolean;
  subscriptionDetails?: {
    type: string;
    remainingCredits?: number;
    endDate?: string;
  };
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, status, type, remaining_credits, end_date')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching user subscription:', error);
    return { hasSubscription: false };
  }
  
  if (!data) {
    return { hasSubscription: false };
  }
  
  // Validate subscription is still valid
  if (data.type === '5_times' || data.type === '10_times') {
    if (data.remaining_credits <= 0) {
      return { hasSubscription: false };
    }
  } else if (data.type === 'monthly') {
    if (new Date(data.end_date) < new Date()) {
      return { hasSubscription: false };
    }
  }
  
  return {
    hasSubscription: true,
    subscriptionDetails: {
      type: data.type,
      remainingCredits: data.type === '5_times' || data.type === '10_times' 
        ? data.remaining_credits 
        : undefined,
      endDate: data.type === 'monthly' ? data.end_date : undefined,
    }
  };
}

export async function performCourseCheckin(
  userId: string,
  courseId: string,
  isDropIn: boolean = false
): Promise<CourseCheckinResponse> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase.rpc('perform_course_checkin', {
      p_user_id: userId,
      p_course_id: courseId,
      p_is_drop_in: isDropIn,
    });
    
    if (error) throw error;
    
    return data as CourseCheckinResponse;
  } catch (error) {
    console.error('Check-in error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to perform check-in' 
    };
  }
}
