// Enums matching database
export type CourseStatus = 'scheduled' | 'completed' | 'cancelled';
export type BookingStatus = 'confirmed' | 'cancelled';
export type BookingType = 'subscription' | 'single' | 'drop_in';

// Base types matching database tables
export interface Course {
  id: string;
  dance_style: string;
  instructor_id: string | null;
  location: string;
  scheduled_date: string; // ISO date string
  start_time: string; // HH:MM:SS format
  duration_minutes: number;
  capacity: number;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  course_id: string;
  subscription_id: string | null;
  booking_type: BookingType;
  status: BookingStatus;
  created_at: string;
  cancelled_at: string | null;
}

// Extended types with relations
export interface CourseWithInstructor extends Course {
  instructor: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface CourseWithBookingCount extends CourseWithInstructor {
  booking_count: number;
  user_booking: Booking | null; // Current user's booking if exists
}

export interface BookingWithCourse extends Booking {
  course: CourseWithInstructor;
}

export interface CourseWithDetails extends CourseWithInstructor {
  bookings: Array<Booking & {
    user: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  }>;
  checkins: Array<{
    id: string;
    user_id: string;
    booking_type: BookingType;
    created_at: string;
    user: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  }>;
}

// Form input types
export interface CreateCourseInput {
  dance_style: string;
  instructor_id: string | null;
  location: string;
  scheduled_date: string;
  start_time: string;
  duration_minutes: number;
  capacity: number;
}

export interface BatchCreateCoursesInput {
  year: number;
  month: number;
  dance_style: string;
  instructor_id: string | null;
  location: string;
  start_time: string;
  duration_minutes: number;
  capacity: number;
}

// API response types
export interface BookCourseResponse {
  success: boolean;
  message: string;
  booking_id?: string;
  booking_type?: BookingType;
  current_capacity?: number;
  max_capacity?: number;
}

export interface CancelBookingResponse {
  success: boolean;
  message: string;
}

export interface CheckinResponse {
  success: boolean;
  message: string;
  checkin_id?: string;
  booking_type?: BookingType;
  current_attendance?: number;
  capacity?: number;
  remaining?: number;
}

export interface BatchCreateResponse {
  success: boolean;
  created_count: number;
  skipped_count: number;
  created_dates: string[];
  skipped_dates: string[];
}

// Course history for member profile
export interface CourseAttendance {
  course_id: string;
  dance_style: string;
  scheduled_date: string;
  instructor_name: string | null;
  booking_type: BookingType;
  checked_in_at: string;
}

export interface CourseStatistics {
  total_attended: number;
  this_month: number;
  favorite_style: string | null;
  favorite_style_count: number;
}
