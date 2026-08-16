'use server';

import { createClient } from '@/lib/supabase/server';
import { getZurichToday } from '@/lib/utils/date-helpers';
import type { 
  CourseWithBookingCount, 
  Booking,
  BookingWithCourse,
  CourseAttendance,
  CourseStatistics,
  CheckinWithCourseQuery,
  CheckinWithCourseForStats
} from '@/types/courses';
import { unwrapSupabaseRelation } from '@/lib/utils/supabase-helpers';

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

  const courseIds = (courses || []).map((c) => c.id);

  // Batch 1: booking + check-in counts for ALL courses in one round trip
  // (replaces the previous ~2 queries per course). checkin_count is only
  // populated for admins (the RPC gates it).
  const countMap = new Map<string, { booking_count: number; checkin_count: number }>();
  if (courseIds.length > 0) {
    const { data: counts, error: countError } = await supabase.rpc('get_course_counts', {
      p_course_ids: courseIds,
    });
    if (!countError) {
      for (const row of (counts as Array<{ course_id: string; booking_count: number; checkin_count: number }>) || []) {
        countMap.set(row.course_id, {
          booking_count: row.booking_count ?? 0,
          checkin_count: row.checkin_count ?? 0,
        });
      }
    }
  }

  // Batch 2: current user's confirmed bookings for these courses in one query
  const { data: { user } } = await supabase.auth.getUser();

  const bookingMap = new Map<string, Booking>();
  if (user && courseIds.length > 0) {
    const { data: userBookings } = await supabase
      .from('bookings')
      .select('*')
      .in('course_id', courseIds)
      .eq('user_id', user.id)
      .eq('status', 'confirmed');
    for (const b of (userBookings as Booking[] | null) || []) {
      bookingMap.set(b.course_id, b);
    }
  }

  // Assemble — no per-course round trips remain
  return (courses || []).map((course) => {
    const counts = countMap.get(course.id) ?? { booking_count: 0, checkin_count: 0 };
    return {
      ...course,
      booking_count: counts.booking_count,
      checkin_count: counts.checkin_count,
      user_booking: bookingMap.get(course.id) ?? null,
    };
  });
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
    .gte('course.scheduled_date', getZurichToday())
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
  
  return (data || []).map((item: CheckinWithCourseQuery) => {
    const course = unwrapSupabaseRelation(item.course);
    let instructorName: string | null = null;
    if (course?.instructor) {
      const instructor = unwrapSupabaseRelation(course.instructor);
      instructorName = instructor?.full_name || null;
    }
    
    return {
      course_id: item.course_id!,
      dance_style: course?.dance_style || '',
      scheduled_date: course?.scheduled_date || '',
      instructor_name: instructorName,
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
    .not('course_id', 'is', null)
    .returns<CheckinWithCourseForStats[]>();
  
  if (error) throw error;
  
  const total_attended = checkins?.length || 0;
  
  // Count this month
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const this_month = (checkins || []).filter((c: CheckinWithCourseForStats) => {
    const course = unwrapSupabaseRelation(c.course);
    return course?.scheduled_date?.startsWith(currentMonth);
  }).length;
  
  // Find favorite style
  const styleCounts: Record<string, number> = {};
  (checkins || []).forEach((c: CheckinWithCourseForStats) => {
    const course = unwrapSupabaseRelation(c.course);
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

/**
 * Batch version of canCancelBooking — one RPC for all bookings instead of one
 * round trip per booking (the courses page previously fired N RPCs per render,
 * multiplied by the 10s poll).
 */
export async function canCancelBookings(
  bookingIds: string[]
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (bookingIds.length === 0) return result;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc('can_cancel_bookings', {
    p_booking_ids: bookingIds
  });

  if (error) {
    // Fall back to per-booking checks so the UI still works if the batch
    // RPC is missing from the DB (migration not yet applied).
    const fallback = await Promise.all(
      bookingIds.map(async (id) => {
        try {
          return [id, await canCancelBooking(id)] as const;
        } catch {
          return [id, false] as const;
        }
      })
    );
    for (const [id, can] of fallback) result.set(id, can);
    return result;
  }

  for (const row of (data as Array<{ booking_id: string; can_cancel: boolean }>) || []) {
    result.set(row.booking_id, !!row.can_cancel);
  }
  return result;
}
