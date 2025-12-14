# Dance Group Check-in System - Specification Document

## 1. Project Overview

### 1.1 Purpose

A mobile-first web application for managing dance group member check-ins, subscriptions, and profiles.

### 1.2 Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **UI Library**: Shadcn UI, Tailwind CSS
- **Authentication & Database**: Supabase (Auth, PostgreSQL)
- **Deployment**: Vercel
- **QR Code**: react-qr-code
- **QR Scanner**: react-qr-scanner or qr-scanner

## 2. User Roles & Permissions

### 2.1 User Types

- **Admin**: Full system access (user management, subscription assignment, check-in scanning, student verification)
- **Member (Adult)**: Regular adult member (default upon registration)
- **Member (Student)**: Student member (requires verification)

### 2.2 Role Permissions Matrix

| Feature | Admin | Member (Adult/Student) |
|---------|-------|------------------------|
| Register/Login | ✓ | ✓ |
| View own profile | ✓ | ✓ |
| Edit own profile | ✓ | ✓ |
| Upload student card | ✓ | ✓ |
| Generate QR code | ✓ | ✓ |
| View own subscription status | ✓ | ✓ |
| View own check-in history | ✓ | ✓ |
| Manage all users | ✓ | ✗ |
| Verify student status | ✓ | ✗ |
| Assign subscriptions | ✓ | ✗ |
| Scan QR for check-in | ✓ | ✗ |
| View all users' info | ✓ | ✗ |
| View check-in analytics | ✓ | ✗ |

## 3. User Authentication & Registration

### 3.1 Registration Flow

1. User navigates to registration page
2. Enters email and password (Supabase Auth)
3. Receives verification email
4. After email verification, redirected to complete profile:
   - Full name (required)
   - Profile picture upload (required)
   - Date of birth (required)
   - User type: Adult (default, automatic)
5. Profile completion triggers account activation
6. User is registered as Adult member by default

### 3.2 Student Verification Process

1. User navigates to profile settings
2. Clicks "Apply for Student Status"
3. Uploads student card/ID image
4. Submission creates a verification request with status "pending"
5. Admin receives notification/sees pending requests
6. Admin reviews student card image
7. Admin approves or rejects:
   - **Approve**: User type changes to "Student"
   - **Reject**: User remains "Adult", can resubmit
8. User sees verification status on profile

### 3.3 Login Options

- **Email/Password**: Standard Supabase authentication
- **Google OAuth**: Supabase Google provider

After first Google login, users still need to complete profile (name, profile pic, DOB). Default user type: Adult.

### 3.4 Profile Management

**Users can update:**

- Profile picture
- Full name
- Date of birth
- Password (via Supabase)
- Apply for/reapply for student status

**Users cannot change:**

- Email (managed through Supabase)
- User type directly (must go through verification)

## 4. Subscription System

### 4.1 Subscription Types

#### Monthly Card

- **Duration**: 30 days from admin-selected start date
- **Start Date**: Admin selects the start date when assigning (can be past, present, or future date)
- **End Date**: Automatically calculated as start_date + 30 days
- **Usage**: Unlimited check-ins within valid period
- **Expiration**: Automatically expires 30 days after start date

#### 5-Times Card

- **Usage**: 5 check-in sessions
- **Counter**: Decrements by 1 per check-in
- **Expiration**: When counter reaches 0
- **No expiration date**: Valid until all sessions are used

#### 10-Times Card

- **Usage**: 10 check-in sessions
- **Counter**: Decrements by 1 per check-in
- **Expiration**: When counter reaches 0
- **No expiration date**: Valid until all sessions are used

### 4.2 Subscription Rules

- Users can only have ONE active subscription at a time
- Only admins can assign subscriptions to users
- When a new subscription is assigned, it becomes the active subscription
- Previous subscription (if any) is archived in history

### 4.3 Subscription History

Track for each subscription:

- Subscription type
- Start date
- End date (for monthly) or remaining sessions (for count-based)
- Status: Active, Expired, or Depleted
- Assigned by (admin user ID)
- Assigned date
- Total check-ins used

## 5. QR Code System

### 5.1 QR Code Generation

- **Library**: react-qr-code
- Each user has a unique identifier (user ID from Supabase)
- QR code encodes: `{"userId": "uuid", "timestamp": "ISO8601"}`
- QR code displayed on user profile page via button/toggle
- QR code can be displayed in full-screen modal for easier scanning

### 5.2 QR Code Display

- Accessible from main profile page
- "Show QR Code" button
- Modal/full-screen view with:
  - User's name
  - QR code (large, centered, minimum 256x256px)
  - Current subscription status indicator
  - Option to close/hide
- High contrast for better scanning
- White background, black QR code

## 6. Check-in System

### 6.1 QR Scanner Implementation

- **Library**: react-qr-scanner or qr-scanner
- Mobile camera access required
- Continuous scanning mode
- Auto-focus and auto-detect

### 6.2 Check-in Flow (Admin)

1. Admin clicks "Scan for Check-in" button
2. Camera opens with QR scanner overlay
3. Admin scans user's QR code
4. System validates:
   - User exists
   - User has active subscription
   - Subscription is valid (not expired/depleted)
5. **If valid:**
   - Record check-in with timestamp
   - Decrement counter (for 5/10-times cards)
   - Show success message with user info
   - Show updated remaining sessions/days
6. **If invalid:**
   - Show error message with reason (no subscription, expired, depleted)
   - Display user name if found

### 6.3 Check-in Validation Rules

**Monthly Card:**

- Current date must be >= start_date AND <= end_date
- end_date = start_date + 30 days

**5/10-Times Card:**

- Remaining sessions > 0

### 6.4 Check-in Record

Each check-in stores:

- User ID
- Check-in timestamp
- Subscription ID (which subscription was used)
- Checked in by (admin user ID)
- Subscription type at time of check-in
- Remaining sessions/days after check-in

## 7. Admin Features

### 7.1 User Management Dashboard

#### User List View:

- Searchable/filterable table of all users
- Display columns:
  - Profile picture (thumbnail)
  - Name
  - Email
  - User type (Adult/Student) with badge
  - Subscription status (Active/Expired/None)
  - Subscription type
  - Remaining sessions/days
  - Last check-in date
- Filter options:
  - User type (All/Adult/Student)
  - Subscription status
  - Subscription type
- Actions: View details, Edit, Assign subscription

#### User Detail View:

- Full profile information
- Current subscription details
- Subscription history
- Check-in history (paginated table)
- Student verification status (if applicable)
- Quick actions: Assign new subscription, Edit profile

### 7.2 Student Verification Management

#### Pending Verifications List:

- Shows all pending student verification requests
- Display:
  - User name and profile picture
  - Submission date
  - Student card image (thumbnail, clickable for full view)
- Actions: View details, Approve, Reject

#### Verification Detail View:

- Full-size student card image
- User profile information
- Date of birth verification
- Approve/Reject buttons with optional notes
- Rejection reason field (required on reject)

#### Verification Actions:

**Approve:**

- Changes user_type to 'student'
- Updates verification status to 'approved'
- Timestamp of approval

**Reject:**

- Keeps user_type as 'adult'
- Updates verification status to 'rejected'
- Stores rejection reason
- User can resubmit

### 7.3 Subscription Assignment

Admin can assign subscription via:

1. Select user
2. Choose subscription type (Monthly/5-Times/10-Times)
3. **For Monthly:**
   - Select start date (date picker)
   - End date auto-calculated and displayed (start_date + 30 days)
   - Can select past, present, or future dates
4. **For count-based:**
   - Automatically set total_sessions and remaining_sessions
   - No date selection needed
5. Confirm assignment
6. Previous active subscription automatically archived

### 7.4 Check-in Interface

- Dedicated "Check-in" page with camera scanner
- Recent check-ins list (today's check-ins)
- Quick stats: Total check-ins today
- Scanner overlay with guidelines for QR code positioning
- Success/error feedback animations

### 7.5 Analytics/Reports (Optional for MVP)

- Total active members
- Adult vs Student member count
- Check-ins today/this week/this month
- Subscription type distribution
- Expiring subscriptions (next 7 days)
- Pending student verifications count
