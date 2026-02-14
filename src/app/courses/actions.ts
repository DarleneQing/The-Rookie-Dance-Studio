'use server';

import { createClient } from '@/lib/supabase/server';
import type { 
  CourseWithBookingCount, 
  BookingWithCourse,
  CourseAttendance,
  CourseStatistics 
} from '@/types/courses';

export async function getCourses(filters?: {
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<CourseWithBookingCount[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('courses')
    .select(`
      *,
      instructor:profiles!courses_instructor_id_fkey(id, full_name, avatar_url)
    `)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true });
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.fromDate) {
    query = query.gte('scheduled_date', filters.fromDate);
  }
  
  if (filters?.toDate) {
    query = query.lte('scheduled_date', filters.toDate);
  }
  
  const { data: courses, error } = await query;
  
  if (error) throw error;
  
  // Get current user's bookings
  const { data: { user } } = await supabase.auth.getUser();
  
  // Transform data to include booking count, check-in count, and user's booking
  const coursesWithBookings = await Promise.all(
    (courses || []).map(async (course) => {
      // Get booking count
      const { count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id)
        .eq('status', 'confirmed');
      
      // Get check-in count
      const { count: checkinCount } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id);
      
      let userBooking = null;
      if (user) {
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .eq('course_id', course.id)
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .maybeSingle();
        userBooking = data;
      }
      
      return {
        ...course,
        booking_count: bookingCount || 0,
        checkin_count: checkinCount || 0,
        user_booking: userBooking
      };
    })
  );
  
  return coursesWithBookings;
}

export async function getUserBookings(): Promise<BookingWithCourse[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      course:courses(
        *,
        instructor:profiles!courses_instructor_id_fkey(id, full_name, avatar_url)
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .gte('course.scheduled_date', new Date().toISOString().split('T')[0])
    .order('course(scheduled_date)', { ascending: true });
  
  if (error) throw error;
  
  return data || [];
}

export async function getCourseHistory(): Promise<CourseAttendance[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('checkins')
    .select(`
      course_id,
      booking_type,
      created_at,
      course:courses(
        dance_style,
        scheduled_date,
        instructor:profiles!courses_instructor_id_fkey(full_name)
      )
    `)
    .eq('user_id', user.id)
    .not('course_id', 'is', null)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(item => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const course = item.course as any;
    
    return {
      course_id: item.course_id!,
      dance_style: course?.dance_style || '',
      scheduled_date: course?.scheduled_date || '',
      instructor_name: course?.instructor?.full_name || null,
      booking_type: item.booking_type!,
      checked_in_at: item.created_at
    };
  });
}

export async function getCourseStatistics(): Promise<CourseStatistics> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');
  
  // Get all course check-ins
  const { data: checkins, error } = await supabase
    .from('checkins')
    .select(`
      course:courses(dance_style, scheduled_date)
    `)
    .eq('user_id', user.id)
    .not('course_id', 'is', null);
  
  if (error) throw error;
  
  const total_attended = checkins?.length || 0;
  
  // Count this month
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const this_month = (checkins || []).filter(c => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const course = c.course as any;
    return course?.scheduled_date?.startsWith(currentMonth);
  }).length;
  
  // Find favorite style
  const styleCounts: Record<string, number> = {};
  (checkins || []).forEach(c => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const course = c.course as any;
    const style = course?.dance_style;
    if (style) {
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    }
  });
  
  let favorite_style = null;
  let favorite_style_count = 0;
  Object.entries(styleCounts).forEach(([style, count]) => {
    if (count > favorite_style_count) {
      favorite_style = style;
      favorite_style_count = count;
    }
  });
  
  return {
    total_attended,
    this_month,
    favorite_style,
    favorite_style_count
  };
}

export async function canCancelBooking(bookingId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('can_cancel_booking', {
    p_booking_id: bookingId
  });
  
  if (error) throw error;
  
  return data || false;
}
