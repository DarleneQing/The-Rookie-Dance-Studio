'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/utils/admin-guard';
import { getZurichToday } from '@/lib/utils/date-helpers';
import type { CheckinResponse } from '@/types/courses';

export async function getTodaysCourse() {
  const supabase = await createClient();

  const admin = await requireAdmin();
  if (!admin) return null;

  const today = getZurichToday();
  
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      instructor:profiles!courses_instructor_id_fkey(full_name, avatar_url)
    `)
    .eq('scheduled_date', today)
    .eq('status', 'scheduled')
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching today\'s course:', error);
    return null;
  }
  
  return data;
}

export async function performCourseCheckin(
  userId: string,
  courseId: string,
  isDropIn: boolean = false
): Promise<CheckinResponse> {
  const supabase = await createClient();
  const admin = await requireAdmin();
  
  if (!admin) {
    return { success: false, message: 'Unauthorized' };
  }
  
  try {
    const { data, error } = await supabase.rpc('perform_course_checkin', {
      p_user_id: userId,
      p_course_id: courseId,
      p_admin_id: admin.id,
      p_is_drop_in: isDropIn
    });
    
    if (error) throw error;
    
    revalidatePath('/admin/scanner');
    
    return data as CheckinResponse;
  } catch (error) {
    console.error('Check-in error:', error);
    return { success: false, message: 'Failed to check in' };
  }
}

export async function hasBookingForCourse(userId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient();

  const admin = await requireAdmin();
  if (!admin) return false;

  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'confirmed')
    .maybeSingle();
  
  if (error) {
    console.error('Error checking booking:', error);
    return false;
  }
  
  return !!data;
}
