'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { BookCourseResponse, CancelBookingResponse } from '@/types/courses';
import { getErrorMessage } from '@/lib/utils/error-helpers';

export async function bookCourse(courseId: string): Promise<BookCourseResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, message: 'Not authenticated' };
  }
  
  try {
    const { data, error } = await supabase.rpc('book_course', {
      p_user_id: user.id,
      p_course_id: courseId
    });
    
    if (error) throw error;
    
    revalidatePath('/courses');
    
    return data as BookCourseResponse;
  } catch (error) {
    return { 
      success: false, 
      message: getErrorMessage(error, 'Failed to book course')
    };
  }
}

export async function cancelBooking(bookingId: string): Promise<CancelBookingResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, message: 'Not authenticated' };
  }
  
  try {
    const { data, error } = await supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_user_id: user.id
    });
    
    if (error) throw error;
    
    revalidatePath('/courses');
    
    return data as CancelBookingResponse;
  } catch (error) {
    return { 
      success: false, 
      message: getErrorMessage(error, 'Failed to cancel booking')
    };
  }
}
