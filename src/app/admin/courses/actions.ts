'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  CreateCourseInput,
  BatchCreateCoursesInput,
  BatchCreateResponse,
  CourseWithDetails,
  PaymentMethod,
} from '@/types/courses';

export async function createCourse(input: CreateCourseInput) {
  const supabase = await createClient();
  
  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized');
  }
  
  const { data, error } = await supabase
    .from('courses')
    .insert([input])
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  
  return data;
}

export async function batchCreateCourses(
  input: BatchCreateCoursesInput
): Promise<BatchCreateResponse> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('batch_create_courses', {
    p_year: input.year,
    p_month: input.month,
    p_dance_style: input.dance_style,
    p_instructor_id: input.instructor_id,
    p_location: input.location,
    p_start_time: input.start_time,
    p_duration_minutes: input.duration_minutes,
    p_capacity: input.capacity
  });
  
  if (error) throw error;
  
  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  
  return data as BatchCreateResponse;
}

export async function updateCourse(
  courseId: string, 
  updates: Partial<CreateCourseInput>
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', courseId)
    .select()
    .single();
  
  if (error) throw error;
  
  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  
  return data;
}

export async function deleteCourse(courseId: string) {
  const supabase = await createClient();
  
  // Check if course has bookings
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);
  
  if (count && count > 0) {
    throw new Error('Cannot delete course with existing bookings');
  }
  
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);
  
  if (error) throw error;
  
  revalidatePath('/admin/courses');
  revalidatePath('/courses');
}

export async function getCourseDetails(courseId: string): Promise<CourseWithDetails> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      instructor:profiles!courses_instructor_id_fkey(id, full_name, avatar_url),
      bookings(
        *,
        user:profiles!bookings_user_id_fkey(id, full_name, avatar_url)
      ),
      checkins(
        id,
        user_id,
        booking_type,
        created_at,
        user:profiles!checkins_user_id_fkey(id, full_name, avatar_url)
      )
    `)
    .eq('id', courseId)
    .single();
  
  if (error) throw error;
  
  return data as CourseWithDetails;
}

export async function deleteCheckin(
  checkinId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('delete_course_checkin', {
    p_checkin_id: checkinId,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/admin/courses');
  return data as { success: boolean; message: string };
}

export async function manualCheckin(
  userId: string,
  courseId: string,
  paymentMethod: PaymentMethod
): Promise<{ success: boolean; message: string; booking_type?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Not authenticated' };
  }

  const { data, error } = await supabase.rpc('perform_course_checkin', {
    p_user_id: userId,
    p_course_id: courseId,
    p_admin_id: user.id,
    p_is_drop_in: true,
    p_payment_method: paymentMethod,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/admin/courses');
  return data as { success: boolean; message: string; booking_type?: string };
}

export async function searchUsers(query: string): Promise<Array<{
  id: string;
  full_name: string;
  avatar_url: string | null;
}>> {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .ilike('full_name', `%${query}%`)
    .order('full_name')
    .limit(10);

  if (error) return [];
  return data || [];
}

export async function getInstructors() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('role', 'instructor')
    .order('full_name');
  
  if (error) throw error;
  
  return data || [];
}
