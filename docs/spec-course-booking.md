# Feature Specification: Course Booking & Attendance System

**Feature Branch**: `feature/course-booking-system`  
**Created**: February 6, 2026  
**Status**: Draft  
**Input**: Extend dance studio platform to support Saturday course scheduling, booking, and attendance tracking with instructor assignment

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Creates Weekly Saturday Course (Priority: P1)

Admin needs to create a dance course for next Saturday, as part of the weekly course offering cycle.

**Why this priority**: Core functionality required before any booking or attendance can occur. Without courses, the entire feature is non-functional.

**Independent Test**: Can be fully tested by creating a course and verifying it appears in the system with correct details. Delivers immediate value by establishing the course schedule.

**Acceptance Scenarios**:

1. **Given** admin is logged in and navigates to Courses section, **When** admin clicks "Create Course" and fills in details (dance style "Girls Kpop", date Feb 8 2026, time 15:00, capacity 25, instructor Jane Kim), **Then** course is created successfully and appears in course list with all details correct

2. **Given** admin creates course with default values (style "Girls Kpop", time 15:00, duration 90min, capacity 25), **When** course is saved, **Then** all default values are applied correctly and course is in "scheduled" status

3. **Given** admin attempts to create course for a past date, **When** form is submitted, **Then** validation error appears: "Cannot create course for past date"

4. **Given** admin leaves instructor unassigned during course creation, **When** course is saved, **Then** course is created successfully with "Unassigned" shown as instructor

5. **Given** course already exists for Feb 8 at 15:00, **When** admin attempts to create another course for same date/time, **Then** database constraint prevents duplicate and error message shows: "Time slot already booked"

---

### User Story 2 - Member with Subscription Books Course (Priority: P1)

Member with active subscription wants to guarantee their spot in Saturday's Girls Kpop course by booking in advance.

**Why this priority**: Primary user flow for existing subscription holders. Essential for capacity management and member experience.

**Independent Test**: Can be tested end-to-end by having a subscription user book a course and verify booking confirmation. Delivers immediate value by allowing members to secure their spot.

**Acceptance Scenarios**:

1. **Given** member has active monthly subscription and views upcoming courses, **When** member clicks "Book Now" on Girls Kpop Feb 8, **Then** booking is confirmed immediately, button changes to "✓ Booked", and capacity updates from 18/25 to 19/25

2. **Given** member has active 5-times card subscription (3 sessions remaining) and books course, **When** booking is confirmed, **Then** booking type is recorded as "subscription" and subscription remains unchanged (credits decremented at check-in, not booking)

3. **Given** member attempts to book same course twice, **When** second booking attempt occurs, **Then** error message appears: "You already have a booking for this course"

4. **Given** member views booked courses in "Your Bookings" tab, **When** tab is opened, **Then** all confirmed bookings are listed with course details, date, time, and "Cancel" button visible

5. **Given** course is at full capacity (25/25), **When** member views course card, **Then** "FULL" badge is displayed and "Book Now" button is disabled with text "Full - Cannot Book"

---

### User Story 3 - Admin Checks In User with Booking (Priority: P1)

Admin scans member's QR code during Saturday class to record attendance. Member has pre-booked the course.

**Why this priority**: Core check-in flow that validates the booking system works end-to-end. Essential operational feature for class day.

**Independent Test**: Can be tested by scanning QR code of user with booking and verifying check-in is recorded correctly. Delivers immediate value by tracking attendance.

**Acceptance Scenarios**:

1. **Given** member Sarah has booked Girls Kpop course and has active subscription, **When** admin scans Sarah's QR code at 15:00 on course day, **Then** check-in is successful, displays "Sarah Chen checked in (Subscription) - 19/25 attended", and subscription credits are decremented if applicable

2. **Given** member John has booked course but subscription expired yesterday, **When** admin scans QR code, **Then** check-in fails with error: "Subscription expired" and user name is displayed

3. **Given** member Lisa has booked course and has 10-times card with 1 session remaining, **When** admin scans QR code successfully, **Then** check-in is recorded, remaining sessions decremented to 0, subscription status changes to "depleted", and success message shows "1 session remaining → 0"

4. **Given** admin scans QR code of member who already checked in for this course, **When** duplicate scan occurs, **Then** error message appears: "Already checked in for this course" and no duplicate check-in is created

5. **Given** scanner page shows today's check-ins list, **When** new check-in occurs, **Then** list updates immediately showing latest check-in with timestamp, name, and booking type (Subscription/Single/Drop-in)

---

### User Story 4 - Non-Subscription User Books Course as Single (Priority: P2)

Member without active subscription wants to attend Saturday's course and books it as a single class.

**Why this priority**: Extends functionality to non-subscription users. Important for growing member base but not critical for core operations (subscription users are primary).

**Independent Test**: Can be tested by having a non-subscription user book course and verify booking type is "single". Delivers value by opening courses to all members.

**Acceptance Scenarios**:

1. **Given** member Alex has no active subscription and views upcoming courses, **When** Alex clicks "Book Now" on Contemporary Feb 15, **Then** booking is confirmed with booking_type "single" and capacity updates

2. **Given** member Alex (single booking) arrives at course, **When** admin scans Alex's QR code, **Then** check-in succeeds, displays "Alex Park checked in (Single) - 12/25 attended", and subscription_id is NULL in check-in record

3. **Given** member who previously had subscription (now expired) books new course, **When** booking is created, **Then** booking_type is "single" (not subscription) and member can still book successfully

4. **Given** member with expired subscription views their course history, **When** history is displayed, **Then** past bookings show whether they were "subscription" or "single" type based on status at booking time

---

### User Story 5 - Member Cancels Booking Within Window (Priority: P2)

Member realizes they cannot attend Saturday's course and wants to cancel their booking, freeing up the spot for someone else.

**Why this priority**: Important for capacity optimization and user experience but not critical for launch (members can simply not show up).

**Independent Test**: Can be tested by booking a course and cancelling it 4+ hours before start, verifying spot is freed. Delivers value by maximizing course utilization.

**Acceptance Scenarios**:

1. **Given** member has booked Girls Kpop for Feb 8 15:00 and current time is Feb 7 18:00 (21 hours before), **When** member clicks "Cancel" button and confirms, **Then** booking status changes to "cancelled", capacity decreases from 19/25 to 18/25, and success message appears

2. **Given** member attempts to cancel booking at Feb 8 13:00 (2 hours before 15:00 start), **When** cancel button is clicked, **Then** button is disabled and message shows "Cannot cancel within 3 hours of start"

3. **Given** member cancelled booking yesterday, **When** member views course list today, **Then** previously booked course now shows "Book Now" button again (allowing re-booking if desired)

4. **Given** member cancels booking at exactly 3 hours before start (Feb 8 12:00:00), **When** cancellation is attempted, **Then** system allows cancellation (inclusive boundary) and booking is cancelled successfully

5. **Given** member views "Your Bookings" tab after cancelling, **When** tab loads, **Then** cancelled booking is removed from upcoming bookings list

---

### User Story 6 - Admin Checks In Drop-in User Without Booking (Priority: P2)

Member arrives at Saturday class without prior booking. Admin needs to quickly add them to the course and check them in.

**Why this priority**: Handles real-world flexibility scenario but not essential for minimum viable system (members can book in advance).

**Independent Test**: Can be tested by scanning QR of user without booking, confirming drop-in dialog, and verifying both booking and check-in are created. Delivers value by supporting walk-ins.

**Acceptance Scenarios**:

1. **Given** member Sarah arrives without booking and admin scans QR code, **When** scan is detected, **Then** confirmation dialog appears showing: "⚠️ Drop-in Check-in - Sarah Chen - No booking found for Girls Kpop - Today 3:00 PM - Current: 18/25 capacity"

2. **Given** drop-in confirmation dialog is shown, **When** admin clicks "Confirm & Check-in", **Then** system atomically creates booking (type: drop_in, status: confirmed) and check-in record, displays success message "Sarah Chen checked in (Drop-in) - 19/25 attended"

3. **Given** drop-in confirmation dialog is shown, **When** admin clicks "Cancel", **Then** dialog closes, no booking or check-in is created, and scanner returns to ready state

4. **Given** member has no subscription and arrives as drop-in, **When** check-in is confirmed, **Then** check-in record has subscription_id: NULL and booking_type: "drop_in"

5. **Given** admin views course attendance list after drop-in check-in, **When** list is displayed, **Then** drop-in user appears with type indicator "Drop-in" distinguished from pre-booked users

---

### User Story 7 - Admin Batch Creates Courses for Month (Priority: P3)

Admin needs to set up courses for all Saturdays in February to save time instead of creating them one by one.

**Why this priority**: Productivity enhancement for admin but not critical for launch (single course creation works fine).

**Independent Test**: Can be tested by selecting February in batch mode, verifying preview of Saturdays, and confirming all courses are created. Delivers value by reducing admin workload.

**Acceptance Scenarios**:

1. **Given** admin navigates to Create Course and toggles "Batch Mode", **When** admin selects "February 2026" from month dropdown, **Then** system displays all Saturdays: "✓ Feb 8 (new), ✓ Feb 15 (new), ✓ Feb 22 (new)" with preview of 3 courses to be created

2. **Given** course already exists for Feb 8 and admin selects February for batch creation, **When** preview is generated, **Then** system shows: "⊘ Feb 8 (skipped - already exists), ✓ Feb 15 (new), ✓ Feb 22 (new)" and "Create 2 Courses" button

3. **Given** admin fills in batch template (Girls Kpop, Jane Kim, 15:00, 90min, 25 capacity) and clicks "Create 2 Courses", **When** batch creation executes, **Then** 2 courses are created with identical details except date, and notification shows "Successfully created 2 courses. Skipped 1 existing."

4. **Given** admin selects month with no Saturdays having courses, **When** batch preview loads, **Then** all Saturdays show as "new" with green checkmarks

5. **Given** batch creation completes, **When** admin views course list, **Then** all newly created courses appear sorted by date with correct details and "scheduled" status

---

### User Story 8 - Admin Overrides Capacity During Check-in (Priority: P3)

Course is at full capacity (25/25) but admin wants to accommodate one more member who arrived without booking.

**Why this priority**: Edge case handling for operational flexibility. Not essential for launch but improves real-world usability.

**Independent Test**: Can be tested by checking in user when course is at 25/25 capacity, confirming override dialog, and verifying check-in succeeds with 26/25 displayed. Delivers value by preventing member turn-aways.

**Acceptance Scenarios**:

1. **Given** course has 25 confirmed bookings and member Mike arrives as drop-in, **When** admin scans QR code, **Then** warning dialog appears: "⚠️ Capacity Exceeded - Course at full capacity! - Current: 25/25 (FULL) - Override and check in anyway?"

2. **Given** capacity override dialog is shown, **When** admin clicks "Override & Check-in", **Then** booking and check-in are created successfully, capacity displays "26/25" with orange warning indicator

3. **Given** capacity override dialog is shown, **When** admin clicks "Cancel", **Then** dialog closes and no booking/check-in is created

4. **Given** course shows 26/25 capacity after override, **When** members view course card, **Then** course still shows as "FULL" with disabled booking button (prevents self-service overbooking)

5. **Given** admin views course details with overridden capacity, **When** details page loads, **Then** warning indicator appears showing "Capacity exceeded: 26/25" to alert admin

---

### User Story 9 - Member Views Course Attendance History (Priority: P3)

Member wants to see all the courses they've attended in the past to track their progress and favorite styles.

**Why this priority**: Nice-to-have feature for member engagement. Not critical for core operations but enhances user experience.

**Independent Test**: Can be tested by viewing member's profile/history page and verifying past course check-ins are listed. Delivers value by increasing member engagement.

**Acceptance Scenarios**:

1. **Given** member Sarah has attended 5 courses in the past, **When** Sarah views "Course History" section on profile, **Then** all 5 courses are listed with date, dance style, instructor name, and booking type

2. **Given** member views course history sorted by date, **When** list is displayed, **Then** most recent courses appear first (descending order)

3. **Given** member has attended both subscription and single bookings, **When** history is displayed, **Then** each course shows indicator badge: "Subscription" or "Single" or "Drop-in"

4. **Given** member views profile dashboard, **When** page loads, **Then** statistics show: "Total courses attended: 12 - This month: 3 - Favorite style: Girls Kpop (6 times)"

5. **Given** member has no course attendance yet, **When** course history section is viewed, **Then** empty state displays: "You haven't attended any courses yet. Book your first course!" with link to courses page

---

### Edge Cases

- **What happens when member books course then subscription expires before course date?**
  - Check-in validation will fail with "Subscription expired" error
  - Admin can create drop-in booking manually to allow check-in
  - Member should renew subscription or cancel booking

- **What happens when instructor is deleted/removed from course?**
  - Foreign key set to NULL (SET NULL on instructor_id)
  - Course shows "Unassigned" instructor
  - Course remains valid and bookings unaffected

- **What happens when course is cancelled after bookings exist?**
  - Admin sets course status to "cancelled" (not deleted)
  - All bookings remain in database for records
  - Frontend shows "CANCELLED" badge on course
  - Members notified manually (automated notification out of scope)

- **What happens when two members book simultaneously for last spot?**
  - Database pessimistic locking (FOR UPDATE) during booking transaction
  - First transaction to acquire lock succeeds
  - Second transaction gets "Course is full" error
  - No race condition due to transactional capacity check

- **What happens when member tries to cancel exactly at 3-hour boundary (12:00:00 for 15:00 course)?**
  - Cancellation allowed (inclusive boundary: `current_time < deadline`)
  - Backend validates timestamp with microsecond precision
  - If user attempts at 12:00:01, cancellation fails

- **What happens when admin creates batch for month with 5 Saturdays?**
  - System identifies all 5 Saturdays in month
  - Each Saturday checked for existing course
  - New courses created only for Saturdays without courses
  - Notification shows count: "Created 3, Skipped 2"

- **What happens when member has booking but doesn't show up?**
  - No automatic penalty or status change
  - Check-in record not created for that course
  - Admin can see no-show in attendance report (booked but not checked in)
  - No-show tracking available for admin analytics

- **What happens when admin scans QR code for wrong course date?**
  - System identifies no booking for today's course
  - Drop-in confirmation dialog appears
  - If member meant to attend different course, admin cancels dialog
  - Future enhancement: show upcoming bookings in dialog

---

## Requirements *(mandatory)*

### Functional Requirements

#### Course Management

- **FR-COURSE-001**: System MUST allow admins to create courses with dance style, instructor, date, time, duration, location, and capacity
- **FR-COURSE-002**: System MUST provide default values for course creation (style: "Girls Kpop", time: 15:00, duration: 90min, capacity: 25)
- **FR-COURSE-003**: System MUST support batch course creation for all Saturdays in a selected month
- **FR-COURSE-004**: System MUST skip dates with existing courses during batch creation and notify admin of skipped dates
- **FR-COURSE-005**: System MUST prevent duplicate courses for same date and time via database constraint
- **FR-COURSE-006**: System MUST allow admins to edit course details (style, instructor, time, capacity) after creation
- **FR-COURSE-007**: System MUST prevent course creation for past dates
- **FR-COURSE-008**: System MUST support instructor assignment with option to leave unassigned
- **FR-COURSE-009**: System MUST display course list to all authenticated users sorted by date (upcoming first)
- **FR-COURSE-010**: System MUST allow admins to view booking list and attendance list per course

#### Booking Management

- **FR-BOOKING-001**: System MUST allow authenticated members to book upcoming courses if capacity available
- **FR-BOOKING-002**: System MUST determine booking type automatically based on user's subscription status at booking time (subscription/single)
- **FR-BOOKING-003**: System MUST prevent duplicate bookings by same user for same course via database constraint
- **FR-BOOKING-004**: System MUST enforce capacity limit during booking with pessimistic database locking
- **FR-BOOKING-005**: System MUST display real-time capacity on course cards (e.g., "18/25 spots")
- **FR-BOOKING-006**: System MUST allow members to view their upcoming bookings in "Your Bookings" tab
- **FR-BOOKING-007**: System MUST allow members to cancel bookings if current time is more than 3 hours before course start
- **FR-BOOKING-008**: System MUST prevent cancellation within 3 hours of course start with validation on frontend and backend
- **FR-BOOKING-009**: System MUST free up capacity immediately when booking is cancelled (status changed to 'cancelled')
- **FR-BOOKING-010**: System MUST support three booking types: subscription, single, drop_in

#### Check-in Integration

- **FR-CHECKIN-001**: System MUST extend existing QR check-in to validate course bookings before check-in
- **FR-CHECKIN-002**: System MUST check in users with confirmed bookings successfully (subscription or single type)
- **FR-CHECKIN-003**: System MUST show drop-in confirmation dialog when user without booking is scanned
- **FR-CHECKIN-004**: System MUST atomically create booking (type: drop_in) and check-in when admin confirms drop-in
- **FR-CHECKIN-005**: System MUST prevent duplicate check-ins for same course (stricter than general daily check-in)
- **FR-CHECKIN-006**: System MUST allow admin to override capacity during check-in with warning dialog
- **FR-CHECKIN-007**: System MUST record booking type (subscription/single/drop_in) in check-in record for analytics
- **FR-CHECKIN-008**: System MUST display current attendance count after each check-in (e.g., "19/25 attended")
- **FR-CHECKIN-009**: System MUST validate subscription for subscription-type bookings during check-in (existing logic)
- **FR-CHECKIN-010**: System MUST decrement subscription credits at check-in time (not booking time)

#### Instructor Management

- **FR-INSTRUCTOR-001**: System MUST support 'instructor' as new user role in database
- **FR-INSTRUCTOR-002**: System MUST allow admins to create instructor profiles with name and avatar
- **FR-INSTRUCTOR-003**: System MUST display instructor avatar and name on course cards
- **FR-INSTRUCTOR-004**: System MUST prevent instructors from booking courses (no member privileges)
- **FR-INSTRUCTOR-005**: System MUST maintain instructor assignment even if instructor is removed from system (SET NULL)

#### User Interface

- **FR-UI-001**: System MUST provide separate bottom navigation for members (Courses/Profile/Settings) and admins (Courses/Scanner/Dashboard)
- **FR-UI-002**: System MUST display course cards with style, date, time, instructor, location, duration, and capacity
- **FR-UI-003**: System MUST show "Book Now" button when capacity available and "Full - Cannot Book" when at capacity
- **FR-UI-004**: System MUST display "✓ Booked" badge and "Cancel" button for user's confirmed bookings
- **FR-UI-005**: System MUST disable "Cancel" button and show tooltip when within 3-hour cancellation window
- **FR-UI-006**: System MUST show course history on member profile with date, style, instructor, and booking type
- **FR-UI-007**: System MUST provide single and batch course creation forms for admins
- **FR-UI-008**: System MUST display batch creation preview showing which Saturdays will be created vs skipped
- **FR-UI-009**: System MUST update scanner interface to show today's course info and attendance count
- **FR-UI-010**: System MUST redirect members to /profile and admins to /admin/dashboard after login

#### Data & Analytics

- **FR-DATA-001**: System MUST track booking history per user (all bookings with status and timestamps)
- **FR-DATA-002**: System MUST track check-in history per course (all attendees with booking type)
- **FR-DATA-003**: System MUST calculate and display member statistics (total courses attended, this month, favorite style)
- **FR-DATA-004**: System MUST provide admin analytics for courses (booking rate, attendance rate, no-show rate)
- **FR-DATA-005**: System MUST distinguish booking types in all reports and analytics (subscription/single/drop_in)

### Key Entities *(include if feature involves data)*

- **Course**: Represents a scheduled dance class with specific date, time, style, instructor, and capacity. Status can be scheduled/completed/cancelled.

- **Booking**: Links a user to a course, representing their reservation. Type can be subscription (user has subscription), single (no subscription), or drop_in (created during check-in). Status can be confirmed or cancelled.

- **Check-in (Extended)**: Existing entity extended with course_id and booking_type fields to link attendance to specific courses and distinguish check-in types.

- **Instructor**: User role for teaching staff, no member privileges, only assigned to courses for display purposes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can create a single course in under 30 seconds using default template values
- **SC-002**: Admins can batch create courses for entire month (4-5 Saturdays) in under 2 minutes
- **SC-003**: Members can book a course in under 10 seconds from viewing course list to confirmation
- **SC-004**: Members can cancel booking in under 10 seconds if within cancellation window
- **SC-005**: Admin can check in user with booking in under 5 seconds (same speed as existing check-in)
- **SC-006**: Admin can check in drop-in user in under 10 seconds (including confirmation dialog)
- **SC-007**: System handles 25 concurrent booking attempts for same course without race conditions (last booker gets "full" error)
- **SC-008**: Capacity updates in real-time across all clients within 2 seconds of booking/cancellation
- **SC-009**: Course list page loads within 2 seconds showing all upcoming courses with accurate capacity
- **SC-010**: 90% of members successfully book their first course on first attempt without errors
- **SC-011**: Cancellation window enforcement has 100% accuracy (no late cancellations allowed)
- **SC-012**: Zero duplicate bookings occur due to concurrent access (database constraint enforcement)
- **SC-013**: Drop-in check-in flow completes successfully 95% of the time (handles capacity and booking creation)
- **SC-014**: Member course history displays correctly with all past attendances and accurate booking types
- **SC-015**: Admin analytics show accurate booking rates, attendance rates, and no-show rates per course

---

**End of Feature Specification**

**For questions or technical clarification, refer to PRD Section 12: Course Booking & Attendance System**
