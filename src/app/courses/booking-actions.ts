'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { BookCourseResponse, CancelBookingResponse } from '@/types/courses';

export async function bookCourse(courseId: string): Promise<BookCourseResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, message: 'Not authenticated' };
  }
  
  try {
    // Check user's subscription status before booking
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log('=== BOOKING DEBUG ===');
    console.log('User ID:', user.id);
    console.log('User Email:', user.email);
    console.log('Course ID:', courseId);
    console.log('Active Subscriptions Found:', subscriptions?.length || 0);
    if (subscriptions && subscriptions.length > 0) {
      console.log('Subscription Details:', JSON.stringify(subscriptions[0], null, 2));
    }
    console.log('Subscription Query Error:', subError);
    
    const { data, error } = await supabase.rpc('book_course', {
      p_user_id: user.id,
      p_course_id: courseId
    });
    
    console.log('Booking Result:', JSON.stringify(data, null, 2));
    console.log('Booking Error:', error);
    console.log('=== END DEBUG ===');
    
    if (error) throw error;
    
    revalidatePath('/courses');
    
    return data as BookCourseResponse;
  } catch (error) {
    console.error('Booking error:', error);
    return { success: false, message: 'Failed to book course' };
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
    console.error('Cancellation error:', error);
    return { success: false, message: 'Failed to cancel booking' };
  }
}
