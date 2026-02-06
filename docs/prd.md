# Product Requirements Document (PRD)

## The Rookie Dance Studio - Member Management System

**Version**: 1.0  
**Last Updated**: February 6, 2026  
**Document Owner**: Development Team  
**Product Type**: Mobile-First Web Application  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Technical Architecture](#3-technical-architecture)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Functional Requirements](#5-functional-requirements)
6. [Data Model & Database Schema](#6-data-model--database-schema)
7. [User Interface & Design System](#7-user-interface--design-system)
8. [Security & Privacy](#8-security--privacy)
9. [Performance Requirements](#9-performance-requirements)
10. [Deployment & Infrastructure](#10-deployment--infrastructure)
11. [Success Metrics](#11-success-metrics)
12. [Course Booking & Attendance System](#12-course-booking--attendance-system)
13. [Appendices](#13-appendices)

---

## 1. Executive Summary

### 1.1 Product Vision

The Rookie Dance Studio Member Management System is a mobile-first web application designed to streamline dance studio operations by providing an efficient, QR code-based check-in system, flexible subscription management, and comprehensive member profile administration.

### 1.2 Problem Statement

Traditional dance studios face operational challenges:
- Manual attendance tracking is time-consuming and error-prone
- Subscription management requires significant administrative overhead
- Student verification processes are cumbersome
- Limited real-time visibility into member status and subscription validity

### 1.3 Solution Overview

A comprehensive web application that:
- Enables instant QR code-based member check-ins
- Automates subscription tracking and validation
- Streamlines student verification workflows
- Provides real-time member and subscription management
- Offers role-based access control for admins and members

### 1.4 Target Users

- **Primary**: Dance studio administrators managing member check-ins and subscriptions
- **Secondary**: Dance studio members (adults and students) managing their profiles and subscriptions
- **Scale**: Single studio deployment with 50-500 active members

---

## 2. Product Overview

### 2.1 Core Value Propositions

#### For Administrators
- **Efficiency**: Reduce check-in time from 30+ seconds to under 5 seconds per member
- **Accuracy**: Eliminate manual errors in attendance tracking
- **Visibility**: Real-time subscription status and usage analytics
- **Control**: Centralized user and subscription management

#### For Members
- **Convenience**: Contactless check-in via personal QR code
- **Transparency**: Real-time visibility into subscription status and check-in history
- **Self-Service**: Profile management and student verification requests

### 2.2 Key Features

1. **Authentication & User Management**
   - Email/password and Google OAuth authentication
   - Role-based access control (Admin, Adult Member, Student Member)
   - Profile management with avatar upload
   - Student status verification workflow

2. **Subscription Management**
   - Three subscription types: Monthly, 5-Times, 10-Times cards
   - Automated expiration and depletion tracking
   - Subscription history and archival
   - Admin-only subscription assignment

3. **QR Code Check-In System**
   - Member QR code generation
   - Admin QR code scanning
   - Real-time subscription validation
   - Automated credit/time deduction

4. **Administrative Dashboard**
   - User management interface
   - Student verification approval workflow
   - Subscription assignment and tracking
   - Check-in history and analytics

### 2.3 Out of Scope (Current Version)

- Multi-studio/multi-location support
- Payment processing and online purchases
- Marketing and communication tools
- Mobile native applications (iOS/Android)
- Automated email/SMS notifications
- Waitlist management for courses

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Frontend Framework** | Next.js (App Router) | 14.2.15 | React framework with SSR |
| **Language** | TypeScript | 5.x | Type-safe development |
| **UI Library** | React | 18.x | Component-based UI |
| **Styling** | Tailwind CSS | 3.4.1 | Utility-first CSS framework |
| **UI Components** | Shadcn UI (Radix UI) | Latest | Accessible primitives |
| **Backend/Database** | Supabase | Latest | PostgreSQL + Auth + Storage |
| **Form Handling** | React Hook Form | 7.68.0 | Form state management |
| **Validation** | Zod | 4.1.13 | Schema validation |
| **QR Generation** | react-qr-code | 2.0.18 | QR code rendering |
| **QR Scanning** | @yudiel/react-qr-scanner | 2.4.1 | Camera-based QR scanning |
| **Icons** | Lucide React | 0.561.0 | Icon library |
| **Notifications** | Sonner | 2.0.7 | Toast notifications |
| **Image Processing** | react-easy-crop | 5.5.6 | Avatar cropping |
| **Analytics** | Vercel Analytics | 1.6.1 | Usage tracking |
| **Performance** | Vercel Speed Insights | 1.3.1 | Performance monitoring |

### 3.2 Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Next.js 14 App (React + TypeScript)        │     │
│  │  ┌──────────────┐  ┌──────────────┐               │     │
│  │  │  Client Side │  │ Server Side  │               │     │
│  │  │  Components  │  │ Components   │               │     │
│  │  └──────────────┘  └──────────────┘               │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │         Middleware (Auth)                │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Platform                         │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │ PostgreSQL  │  │  Auth       │  │   Storage    │       │
│  │  Database   │  │  Service    │  │   (Images)   │       │
│  └─────────────┘  └─────────────┘  └──────────────┘       │
│  ┌──────────────────────────────────────────────────┐      │
│  │         Row Level Security (RLS)                 │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin-only routes
│   │   ├── scanner/             # QR scanner page
│   │   ├── users/               # User management
│   │   ├── verifications/       # Student verifications
│   │   ├── page.tsx            # Admin dashboard
│   │   └── actions.ts          # Admin server actions
│   ├── auth/
│   │   ├── callback/           # OAuth callback
│   │   └── actions.ts          # Auth server actions
│   ├── login/                  # Login page
│   ├── register/               # Registration page
│   ├── profile/                # User profile
│   │   ├── page.tsx
│   │   └── actions.ts
│   ├── verify-email/           # Email verification
│   ├── reset-password/         # Password reset
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   └── globals.css             # Global styles
│
├── components/                  # React components
│   ├── admin/                  # Admin components
│   │   ├── assign-subscription-dialog.tsx
│   │   ├── qr-scanner.tsx
│   │   ├── users-table.tsx
│   │   ├── verifications-table.tsx
│   │   ├── verification-detail-dialog.tsx
│   │   ├── checkin-history-card.tsx
│   │   ├── user-stats-dialog.tsx
│   │   ├── today-checkins-dialog.tsx
│   │   ├── active-subscriptions-dialog.tsx
│   │   └── request-reverification-dialog.tsx
│   ├── auth/                   # Auth UI components
│   │   ├── auth-form.tsx
│   │   ├── auth-input.tsx
│   │   ├── register-form.tsx
│   │   ├── floating-elements.tsx
│   │   ├── orbital-ring.tsx
│   │   └── sparkle.tsx
│   ├── profile/                # Profile components
│   │   ├── qr-code-display.tsx
│   │   ├── avatar-upload-dialog.tsx
│   │   ├── student-verification-dialog.tsx
│   │   ├── subscription-history-dialog.tsx
│   │   ├── checkin-history-dialog.tsx
│   │   └── logout-button.tsx
│   ├── ui/                     # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── avatar.tsx
│   │   └── textarea.tsx
│   └── footer.tsx
│
├── lib/                         # Utilities
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── middleware.ts       # Session handler
│   ├── utils/
│   │   ├── image-compression.ts
│   │   ├── date-helpers.ts
│   │   └── streak-calculator.ts
│   └── utils.ts                # General utilities
│
├── types/
│   └── auth.ts                 # Type definitions
│
└── middleware.ts                # Route protection

docs/
├── schema.sql                   # Database schema
├── storage-policies.sql         # Storage RLS
├── spec.md                      # Feature specs
├── brandbook.md                 # Design system
├── prd.md                       # This document
└── README.md                    # Setup guide
```

### 3.4 Deployment Architecture

- **Hosting**: Vercel (serverless deployment)
- **Database**: Supabase PostgreSQL (managed)
- **Storage**: Supabase Storage (for avatars and student cards)
- **CDN**: Vercel Edge Network
- **SSL**: Automatic via Vercel

---

## 4. User Roles & Permissions

### 4.1 User Role Definitions

#### 4.1.1 Admin
**Description**: Studio staff with full system access for managing members, subscriptions, check-ins, and courses.

**Capabilities**:
- View and manage all user profiles
- Assign and modify subscriptions for any user
- Perform QR code scanning for check-ins
- Review and approve/reject student verification requests
- Create, edit, and delete courses
- View all course bookings and attendance
- Override course capacity limits (with warning)
- Access system-wide analytics and reports
- View all check-in history across members

**Restrictions**:
- Cannot delete user accounts (only modify)
- Cannot bypass subscription validation rules
- No personal profile page (admin-only dashboard)

#### 4.1.2 Member - Adult
**Description**: Default member type for all registered users aged 18+ or unverified students.

**Capabilities**:
- Register and log in
- View and edit own profile (name, avatar, date of birth)
- Generate personal QR code for check-in
- View own subscription status and details
- Browse and book courses
- Cancel course bookings (up to 3 hours before start)
- View own check-in history and course attendance
- Apply for student status verification
- Change password

**Restrictions**:
- Cannot access admin features
- Cannot view other members' information
- Cannot assign or modify subscriptions
- Cannot perform check-ins (scanning)
- Cannot create or manage courses

#### 4.1.3 Member - Student
**Description**: Verified student member with approved student status (typically under 18 or with valid student ID).

**Capabilities**:
- All Adult member capabilities
- Student status badge on profile
- Eligible for student-specific subscription pricing (future feature)

**Requirements**:
- Must upload valid student card/ID
- Requires admin approval
- Can be reverted to Adult status by admin

#### 4.1.4 Instructor
**Description**: Teaching staff assigned to courses, no member privileges.

**Capabilities**:
- Assigned to teach specific courses by admin
- Profile picture displayed on course information
- No login or system access (managed by admin)

**Restrictions**:
- Cannot book courses as member
- Cannot access any member features
- Cannot create or manage courses
- Profile managed entirely by admin

### 4.2 Permission Matrix

| Feature | Admin | Member (Adult) | Member (Student) | Instructor |
|---------|-------|----------------|------------------|------------|
| **Authentication** |
| Register/Login | ✓ | ✓ | ✓ | ✗ |
| Google OAuth | ✓ | ✓ | ✓ | ✗ |
| Password Reset | ✓ | ✓ | ✓ | ✗ |
| **Profile Management** |
| View Own Profile | ✗ | ✓ | ✓ | ✗ |
| Edit Own Profile | ✗ | ✓ | ✓ | ✗ |
| Upload Avatar | ✗ | ✓ | ✓ | ✓* |
| View All Profiles | ✓ | ✗ | ✗ | ✗ |
| Edit Other Profiles | ✓ | ✗ | ✗ | ✗ |
| **Student Verification** |
| Apply for Student Status | ✗ | ✓ | ✓ | ✗ |
| Upload Student Card | ✗ | ✓ | ✓ | ✗ |
| Approve/Reject Verifications | ✓ | ✗ | ✗ | ✗ |
| Request Re-verification | ✓ | ✗ | ✗ | ✗ |
| **Subscriptions** |
| View Own Subscription | ✗ | ✓ | ✓ | ✗ |
| View Own History | ✗ | ✓ | ✓ | ✗ |
| View All Subscriptions | ✓ | ✗ | ✗ | ✗ |
| Assign Subscriptions | ✓ | ✗ | ✗ | ✗ |
| Modify Subscriptions | ✓ | ✗ | ✗ | ✗ |
| **Check-ins** |
| Generate QR Code | ✗ | ✓ | ✓ | ✗ |
| View Own Check-ins | ✗ | ✓ | ✓ | ✗ |
| Scan QR Codes | ✓ | ✗ | ✗ | ✗ |
| Perform Check-ins | ✓ | ✗ | ✗ | ✗ |
| View All Check-ins | ✓ | ✗ | ✗ | ✗ |
| **Courses** |
| Browse Courses | ✓ | ✓ | ✓ | ✗ |
| Book Courses | ✗ | ✓ | ✓ | ✗ |
| Cancel Bookings | ✗ | ✓ | ✓ | ✗ |
| View Own Bookings | ✗ | ✓ | ✓ | ✗ |
| Create/Edit Courses | ✓ | ✗ | ✗ | ✗ |
| Delete Courses | ✓ | ✗ | ✗ | ✗ |
| View All Bookings | ✓ | ✗ | ✗ | ✗ |
| Assign Instructors | ✓ | ✗ | ✗ | ✗ |
| Override Capacity | ✓ | ✗ | ✗ | ✗ |
| **Analytics & Reports** |
| View Dashboard | ✓ | ✗ | ✗ | ✗ |
| Today's Check-ins | ✓ | ✗ | ✗ | ✗ |
| Subscription Stats | ✓ | ✗ | ✗ | ✗ |
| Member Analytics | ✓ | ✗ | ✗ | ✗ |
| Course Analytics | ✓ | ✗ | ✗ | ✗ |

*Instructor avatar managed by admin

### 4.3 Role Assignment Rules

1. **Default Role**: All new registrations default to `role: member`, `member_type: adult`
2. **Admin Creation**: Admin role must be manually assigned via database (security measure)
3. **Instructor Creation**: Instructor role assigned manually by admin via user management interface
4. **Student Verification**: Member type changes from `adult` to `student` only after admin approval
5. **Role Persistence**: User roles persist across sessions and cannot be self-modified
6. **Single Role**: Each user has exactly one role and one member type at any time
7. **Instructor Exclusivity**: Instructors cannot have member privileges; separate user account needed if instructor wants to book courses

---

## 5. Functional Requirements

### 5.1 Authentication & Registration

#### FR-AUTH-001: User Registration
**Priority**: P0 (Critical)

**Requirements**:
- System MUST support email/password registration via Supabase Auth
- System MUST require email verification before profile completion
- System MUST validate email format and password strength (min 6 characters)
- Users MUST provide full name, date of birth, and profile picture during registration
- System MUST default all new users to `role: member` and `member_type: adult`
- Registration MUST create a profile record linked to auth.users table

**Acceptance Criteria**:
- User receives verification email within 60 seconds
- Profile cannot be completed until email is verified
- All required fields validated before submission
- Profile picture upload supports JPEG, PNG, WebP formats up to 5MB

#### FR-AUTH-002: Google OAuth
**Priority**: P1 (High)

**Requirements**:
- System MUST support Google OAuth via Supabase Google provider
- Google login MUST redirect to profile completion if first-time user
- System MUST extract full name from Google profile if available
- OAuth users MUST still complete date of birth and avatar upload

**Acceptance Criteria**:
- Google login completes in under 5 seconds
- User redirected to profile completion after first OAuth login
- Subsequent logins redirect to user dashboard/profile

#### FR-AUTH-003: Login
**Priority**: P0 (Critical)

**Requirements**:
- System MUST support email/password login
- System MUST support Google OAuth login
- System MUST maintain session across browser refreshes
- System MUST redirect authenticated users away from login page
- System MUST show appropriate error messages for invalid credentials

**Acceptance Criteria**:
- Login completes within 3 seconds
- Session persists for 7 days by default
- Failed login shows clear error message
- Users redirected based on role (admin → dashboard, member → profile)

#### FR-AUTH-004: Password Reset
**Priority**: P1 (High)

**Requirements**:
- System MUST provide "Forgot Password" functionality
- System MUST send password reset email via Supabase
- Reset link MUST expire after 1 hour
- System MUST validate new password meets strength requirements
- System MUST confirm password reset success

**Acceptance Criteria**:
- Reset email arrives within 60 seconds
- Reset link works on first click
- Expired links show appropriate error message
- Password successfully updated and user can log in

#### FR-AUTH-005: Session Management
**Priority**: P0 (Critical)

**Requirements**:
- System MUST use middleware to refresh sessions automatically
- System MUST protect routes based on authentication status
- System MUST protect admin routes from non-admin users
- System MUST handle session expiration gracefully
- System MUST redirect unauthenticated users to login

**Acceptance Criteria**:
- Session refresh happens silently without user action
- Expired sessions redirect to login with return URL
- Admin pages return 404 for non-admin users
- Authentication state consistent across tabs

### 5.2 Profile Management

#### FR-PROFILE-001: Profile Viewing
**Priority**: P0 (Critical)

**Requirements**:
- Users MUST be able to view their complete profile information
- Profile MUST display: avatar, full name, email, date of birth, member type
- Profile MUST show current subscription status
- Profile MUST display verification status for student applications
- All users MUST be able to view other users' basic public profile (name, avatar)

**Acceptance Criteria**:
- Profile page loads within 2 seconds
- All profile fields displayed correctly
- Subscription status updates in real-time
- Public profiles show only non-sensitive information

#### FR-PROFILE-002: Profile Editing
**Priority**: P0 (Critical)

**Requirements**:
- Users MUST be able to update: full name, avatar, date of birth
- Users CANNOT change: email, role, member type directly
- System MUST validate all input fields before saving
- System MUST show success/error feedback
- Profile updates MUST persist immediately

**Acceptance Criteria**:
- Profile updates save within 2 seconds
- Validation errors shown inline
- Success notification displayed after save
- Changes visible immediately after save

#### FR-PROFILE-003: Avatar Upload
**Priority**: P1 (High)

**Requirements**:
- System MUST support avatar image upload
- System MUST support JPEG, PNG, WebP formats
- System MUST limit file size to 5MB
- System MUST provide image cropping interface
- System MUST compress images before upload
- System MUST store avatars in Supabase Storage
- System MUST generate public URLs for avatars

**Acceptance Criteria**:
- Upload completes within 10 seconds
- Cropping interface allows square crop
- Compressed images maintain acceptable quality
- Avatar displays immediately after upload
- Old avatars replaced (not duplicated)

#### FR-PROFILE-004: Password Change
**Priority**: P1 (High)

**Requirements**:
- Users MUST be able to change password from profile
- System MUST require current password verification
- System MUST validate new password strength
- System MUST confirm password change success
- System MUST maintain session after password change

**Acceptance Criteria**:
- Password change requires current password
- New password meets strength requirements (min 6 chars)
- Success message shown after change
- User remains logged in after change

### 5.3 Student Verification System

#### FR-VERIFY-001: Student Verification Application
**Priority**: P1 (High)

**Requirements**:
- Adult members MUST be able to apply for student status
- Application MUST require student card/ID image upload
- System MUST support JPEG, PNG, WebP formats up to 5MB
- Application MUST create verification request with status "pending"
- Users MUST be able to view their verification status
- Users with rejected applications MUST be able to resubmit

**Acceptance Criteria**:
- Upload completes within 10 seconds
- Verification request created successfully
- Status shown as "pending" immediately
- Resubmission allowed after rejection

#### FR-VERIFY-002: Admin Verification Review
**Priority**: P1 (High)

**Requirements**:
- Admins MUST see list of pending verification requests
- Admins MUST be able to view full-size student card images
- Admins MUST be able to view applicant profile information
- Admins MUST be able to approve or reject applications
- Rejection MUST require a reason/note
- System MUST update member_type to "student" upon approval
- System MUST keep member_type as "adult" upon rejection

**Acceptance Criteria**:
- Pending requests shown in dedicated admin page
- Student card image viewable at full resolution
- Approval updates member_type within 2 seconds
- Rejection reason required before submission
- Status updated immediately after admin action

#### FR-VERIFY-003: Verification Status Tracking
**Priority**: P1 (High)

**Requirements**:
- System MUST track verification status: none, pending, approved, rejected, reupload_required
- Users MUST be notified of status changes (via UI notification)
- System MUST timestamp all verification actions
- Rejected applications MUST show rejection reason
- System MUST maintain verification history

**Acceptance Criteria**:
- Status visible on user profile
- Timestamps accurate and timezone-aware
- Rejection reason displayed to user
- History accessible to admins

#### FR-VERIFY-004: Re-verification Requests
**Priority**: P2 (Medium)

**Requirements**:
- Admins MUST be able to request re-verification from students
- Re-verification request MUST set status to "reupload_required"
- Students MUST be notified of re-verification requirement
- Students MUST be able to upload new student card

**Acceptance Criteria**:
- Admin can trigger re-verification from user profile
- Status changes to "reupload_required"
- User sees notification on profile
- New upload resets status to "pending"

### 5.4 Subscription Management

#### FR-SUB-001: Subscription Types
**Priority**: P0 (Critical)

**Requirements**:
- System MUST support three subscription types:
  1. **Monthly Card**: 30-day validity from admin-selected start date
  2. **5-Times Card**: 5 check-in sessions, no expiration date
  3. **10-Times Card**: 10 check-in sessions, no expiration date

**Monthly Card Specifications**:
- Admin selects start date (can be past, present, or future)
- End date automatically calculated as start_date + 30 days
- Unlimited check-ins within valid period
- Automatically expires at end_date

**Times Card Specifications**:
- Counter initialized to total credits (5 or 10)
- Decrements by 1 per check-in
- Automatically depleted when remaining_credits reaches 0
- No expiration date

**Acceptance Criteria**:
- All three types assignable by admins
- Date calculations accurate for monthly cards
- Credit tracking accurate for times cards
- Status updates automatic based on validity

#### FR-SUB-002: Single Active Subscription Rule
**Priority**: P0 (Critical)

**Requirements**:
- Users MUST have at most ONE active subscription at any time
- Assigning new subscription MUST automatically archive previous active subscription
- Archived subscriptions MUST retain all historical data
- System MUST enforce uniqueness via database constraint

**Acceptance Criteria**:
- Database prevents multiple active subscriptions per user
- New assignment archives old subscription within same transaction
- Archived subscriptions visible in history
- No data loss during archival

#### FR-SUB-003: Admin Subscription Assignment
**Priority**: P0 (Critical)

**Requirements**:
- Only admins MUST be able to assign subscriptions
- Assignment interface MUST show:
  - User selection (searchable)
  - Subscription type selection
  - Start date picker (for monthly only)
  - Auto-calculated end date display (for monthly)
- System MUST validate all required fields
- System MUST record assigning admin ID and timestamp
- Confirmation MUST be required before assignment

**Acceptance Criteria**:
- Non-admins cannot access assignment interface
- Date picker allows past, present, future dates
- End date displays correctly based on start date
- Assignment creates subscription record within 2 seconds
- Assigning admin ID tracked correctly

#### FR-SUB-004: Subscription Status Tracking
**Priority**: P0 (Critical)

**Requirements**:
- System MUST maintain subscription status: active, expired, depleted, archived
- System MUST automatically update status based on:
  - Monthly: current_date > end_date → expired
  - Times: remaining_credits = 0 → depleted
  - New assignment → previous status = archived
- Status MUST be checked at check-in time
- Users and admins MUST see current status

**Acceptance Criteria**:
- Status automatically updates without manual intervention
- Expired monthly cards cannot be used for check-in
- Depleted times cards cannot be used for check-in
- Status visible on user profile and admin dashboard

#### FR-SUB-005: Subscription History
**Priority**: P1 (High)

**Requirements**:
- System MUST maintain complete subscription history per user
- History MUST include: type, start/end dates, credits used, status, assigned by, assigned date
- Users MUST be able to view their own subscription history
- Admins MUST be able to view any user's subscription history
- History MUST be paginated for users with many subscriptions

**Acceptance Criteria**:
- All historical subscriptions retrievable
- History sorted by creation date (newest first)
- Pagination shows 10 records per page
- Details include all relevant fields

#### FR-SUB-006: Subscription Validation
**Priority**: P0 (Critical)

**Requirements**:
- System MUST validate subscription before allowing check-in
- Validation MUST check:
  1. Active subscription exists
  2. For monthly: current_date >= start_date AND current_date <= end_date
  3. For times: remaining_credits > 0
- Invalid subscriptions MUST prevent check-in with clear error message
- Validation MUST happen in real-time during QR scan

**Acceptance Criteria**:
- Validation completes within 1 second
- Clear error messages for each failure reason
- No check-in recorded for invalid subscriptions
- User status shown to admin during scan

### 5.5 QR Code System

#### FR-QR-001: QR Code Generation
**Priority**: P0 (Critical)

**Requirements**:
- System MUST generate unique QR code for each user
- QR code MUST encode: `{"userId": "uuid", "timestamp": "ISO8601"}`
- QR code MUST be displayed on user profile page
- QR code MUST be at least 256x256px for reliable scanning
- QR code MUST have high contrast (white background, black code)
- QR code MUST be displayable in full-screen modal

**Acceptance Criteria**:
- QR code generates within 1 second
- QR code scannable by standard QR readers
- Encoded data includes user ID and timestamp
- Full-screen view optimized for scanning
- Modal closeable by user

#### FR-QR-002: QR Code Display
**Priority**: P0 (Critical)

**Requirements**:
- Profile page MUST have "Show QR Code" button
- Click MUST open full-screen modal with:
  - User's full name
  - Large QR code (minimum 256x256px, responsive)
  - Current subscription status indicator
  - Close/dismiss option
- Modal MUST be optimized for mobile display
- QR code MUST remain static (no animations)

**Acceptance Criteria**:
- Modal opens within 500ms
- QR code clearly visible on all screen sizes
- Subscription status accurate and current
- Modal dismissible via close button or backdrop click

#### FR-QR-003: QR Code Scanning
**Priority**: P0 (Critical)

**Requirements**:
- Admin scanner page MUST activate device camera
- System MUST use continuous scanning mode
- System MUST support auto-focus and auto-detect
- System MUST parse scanned QR data
- System MUST validate QR code format
- Invalid QR codes MUST show error message
- System MUST work on mobile devices (primary use case)

**Acceptance Criteria**:
- Camera activates within 2 seconds
- QR codes detected within 1 second of focus
- Invalid formats show clear error
- Scanning works on iOS and Android browsers
- Camera permissions requested properly

### 5.6 Check-In System

#### FR-CHECKIN-001: Check-In Flow
**Priority**: P0 (Critical)

**Requirements**:
- Admin MUST scan user's QR code via scanner page
- System MUST validate QR code format and extract user ID
- System MUST validate subscription (see FR-SUB-006)
- If valid:
  - Record check-in with timestamp
  - Decrement remaining_credits (for times cards)
  - Update subscription status if depleted
  - Show success message with user info
  - Display remaining sessions/days
- If invalid:
  - Show error message with reason
  - Display user name if found
  - Do NOT record check-in

**Acceptance Criteria**:
- Complete flow finishes within 3 seconds
- Success message includes user name and remaining subscription
- Error messages specific to failure reason
- Credits decremented atomically with check-in recording

#### FR-CHECKIN-002: Check-In Validation
**Priority**: P0 (Critical)

**Requirements**:
- System MUST check user exists
- System MUST check active subscription exists
- System MUST validate subscription based on type:
  - **Monthly**: current_date >= start_date AND current_date <= end_date
  - **5/10-Times**: remaining_credits > 0
- System MUST prevent check-in if validation fails
- Each validation failure MUST return specific error message

**Error Messages**:
- "User not found" - Invalid user ID
- "No active subscription" - No active subscription
- "Subscription expired" - Monthly card past end date
- "Subscription not started" - Monthly card before start date
- "No credits remaining" - Times card depleted

**Acceptance Criteria**:
- All validation checks complete within 1 second
- Appropriate error message shown for each case
- No partial check-ins recorded

#### FR-CHECKIN-003: Check-In Recording
**Priority**: P0 (Critical)

**Requirements**:
- System MUST record each successful check-in with:
  - User ID (member checking in)
  - Subscription ID (used for check-in)
  - Admin ID (admin performing check-in)
  - Timestamp (check-in time, timezone-aware)
- System MUST update subscription:
  - Decrement remaining_credits (for times cards)
  - Set status to "depleted" if remaining_credits reaches 0
- Recording MUST be atomic (all-or-nothing transaction)
- System MUST prevent duplicate check-ins within same day (optional)

**Acceptance Criteria**:
- Check-in record created successfully
- Subscription updated in same transaction
- Transaction rolls back if any step fails
- Timestamp accurate to timezone (Europe/Zurich)

#### FR-CHECKIN-004: Check-In History
**Priority**: P1 (High)

**Requirements**:
- Users MUST be able to view their own check-in history
- Admins MUST be able to view all check-ins
- History MUST display: date/time, subscription type used, admin name
- History MUST be sorted by date (newest first)
- History MUST be paginated (20 records per page)
- History MUST be filterable by date range

**Acceptance Criteria**:
- User sees their complete check-in history
- Admin sees all check-ins with user names
- Pagination works correctly
- Date filter applies accurately
- History loads within 2 seconds

#### FR-CHECKIN-005: Duplicate Check-In Prevention
**Priority**: P2 (Medium)

**Requirements**:
- System MUST detect if user already checked in today (Zurich timezone)
- System SHOULD warn admin but ALLOW duplicate check-in (studio policy)
- Warning MUST show time of previous check-in today
- Admin MUST confirm to proceed with duplicate check-in

**Acceptance Criteria**:
- Duplicate detection accurate to Zurich timezone
- Warning shows previous check-in time
- Admin can proceed after confirmation
- Both check-ins recorded if confirmed

### 5.7 Admin Dashboard & Management

#### FR-ADMIN-001: User Management Interface
**Priority**: P1 (High)

**Requirements**:
- Admin MUST see searchable/filterable table of all users
- Table MUST display columns:
  - Profile picture (thumbnail)
  - Full name
  - Email
  - Member type (Adult/Student) with badge
  - Subscription status (Active/Expired/None)
  - Subscription type
  - Remaining sessions/days
  - Last check-in date
- Search MUST work on: name, email
- Filters MUST include:
  - Member type (All/Adult/Student)
  - Subscription status (All/Active/Expired/None)
  - Subscription type (All/Monthly/5-Times/10-Times)
- Table MUST support sorting by columns
- Actions per user: View details, Assign subscription

**Acceptance Criteria**:
- Table loads within 3 seconds
- Search results update within 500ms
- Filters apply correctly
- Sorting works on all columns
- Actions accessible from each row

#### FR-ADMIN-002: User Detail View
**Priority**: P2 (Medium)

**Requirements**:
- Clicking user MUST show detailed view with:
  - Full profile information
  - Current subscription details
  - Subscription history (paginated)
  - Check-in history (paginated)
  - Student verification status
- Quick actions MUST be available:
  - Assign new subscription
  - Request re-verification (for students)
- View MUST be modal or separate page

**Acceptance Criteria**:
- Detail view loads within 2 seconds
- All histories paginated properly
- Quick actions work correctly
- View closeable/navigable back

#### FR-ADMIN-003: Student Verification Dashboard
**Priority**: P1 (High)

**Requirements**:
- Admin MUST see dedicated verification management page
- Page MUST show pending verification requests
- Each request MUST display:
  - User name and avatar
  - Submission date
  - Student card thumbnail (clickable for full view)
- Actions MUST include: View details, Approve, Reject
- Approved verifications MUST change member_type to "student"
- Rejected verifications MUST require rejection reason

**Acceptance Criteria**:
- Pending requests shown in table
- Student card viewable at full size
- Approval updates member_type within 2 seconds
- Rejection requires reason input
- Requests removed from pending list after action

#### FR-ADMIN-004: Scanner Interface
**Priority**: P0 (Critical)

**Requirements**:
- Dedicated scanner page MUST activate camera
- Page MUST show:
  - Live camera feed with QR detection overlay
  - Recent check-ins list (today's check-ins)
  - Quick stats: total check-ins today
- Scanner MUST provide visual/audio feedback on successful scan
- Success feedback MUST show user info and subscription status
- Error feedback MUST show specific error reason

**Acceptance Criteria**:
- Camera activates within 2 seconds
- QR codes detected reliably
- Success/error feedback clear and immediate
- Today's check-ins update in real-time
- Stats accurate and current

#### FR-ADMIN-005: Dashboard Analytics
**Priority**: P2 (Medium)

**Requirements**:
- Admin dashboard MUST show key metrics:
  - Total active members
  - Adult vs Student member count
  - Check-ins today/this week/this month
  - Subscription type distribution
  - Expiring subscriptions (next 7 days)
  - Pending student verifications count
- Metrics MUST update in real-time
- Dashboard MUST load within 3 seconds

**Acceptance Criteria**:
- All metrics display correctly
- Counts accurate to current data
- Visual representation (cards/charts)
- Dashboard responsive on mobile

---

## 6. Data Model & Database Schema

### 6.1 Database Technology

- **RDBMS**: PostgreSQL 14+ (via Supabase)
- **Extensions**: uuid-ossp (UUID generation)
- **Security**: Row Level Security (RLS) enabled on all tables
- **Functions**: PL/pgSQL stored procedures for complex operations

### 6.2 Enumerations

#### user_role
```sql
CREATE TYPE user_role AS ENUM ('admin', 'member', 'instructor');
```
- **Values**: admin, member, instructor
- **Purpose**: Define user access level

#### member_type
```sql
CREATE TYPE member_type AS ENUM ('adult', 'student');
```
- **Values**: adult, student
- **Purpose**: Member category for verification and pricing

#### verification_status
```sql
CREATE TYPE verification_status AS ENUM (
  'none', 
  'pending', 
  'approved', 
  'rejected', 
  'reupload_required'
);
```
- **Values**: none, pending, approved, rejected, reupload_required
- **Purpose**: Track student verification workflow

#### subscription_type
```sql
CREATE TYPE subscription_type AS ENUM ('monthly', '5_times', '10_times');
```
- **Values**: monthly, 5_times, 10_times
- **Purpose**: Define subscription variants

#### subscription_status
```sql
CREATE TYPE subscription_status AS ENUM (
  'active', 
  'expired', 
  'depleted', 
  'archived'
);
```
- **Values**: active, expired, depleted, archived
- **Purpose**: Track subscription lifecycle

#### booking_type
```sql
CREATE TYPE booking_type AS ENUM ('subscription', 'single', 'drop_in');
```
- **Values**: subscription, single, drop_in
- **Purpose**: Distinguish booking types for courses

#### booking_status
```sql
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled');
```
- **Values**: confirmed, cancelled
- **Purpose**: Track booking lifecycle

#### course_status
```sql
CREATE TYPE course_status AS ENUM ('scheduled', 'completed', 'cancelled');
```
- **Values**: scheduled, completed, cancelled
- **Purpose**: Track course lifecycle

### 6.3 Tables

#### 6.3.1 profiles

**Purpose**: Store user profile information and preferences

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | User ID from Supabase Auth |
| full_name | TEXT | | User's full name |
| avatar_url | TEXT | | URL to profile picture in Supabase Storage |
| role | user_role | NOT NULL, DEFAULT 'member' | User access role |
| member_type | member_type | NOT NULL, DEFAULT 'adult' | Member category |
| verification_status | verification_status | NOT NULL, DEFAULT 'none' | Student verification status |
| student_card_url | TEXT | | URL to student card image |
| rejection_reason | TEXT | | Admin note for rejected verification |
| dob | DATE | | Date of birth |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**:
- Primary key on `id`
- Index on `role` for admin queries
- Index on `verification_status` for pending requests

**RLS Policies**:
- Public profiles viewable by everyone (SELECT)
- Users can insert their own profile (INSERT)
- Users can update their own profile (UPDATE)
- Admins can update any profile (UPDATE)

#### 6.3.2 subscriptions

**Purpose**: Track subscription assignments and status

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Subscription ID |
| user_id | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | Owner of subscription |
| type | subscription_type | NOT NULL | Subscription variant |
| status | subscription_status | NOT NULL, DEFAULT 'active' | Current status |
| start_date | DATE | | Monthly card start date |
| end_date | DATE | | Monthly card end date (start + 30 days) |
| total_credits | INTEGER | | Initial credits (5 or 10) |
| remaining_credits | INTEGER | | Current credits remaining |
| assigned_by | UUID | REFERENCES profiles(id) | Admin who assigned subscription |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Assignment timestamp |

**Constraints**:
- `valid_monthly_dates`: If type = 'monthly', start_date and end_date must not be null
- `valid_credits`: If type in ('5_times', '10_times'), credits must not be null
- Unique index `one_active_sub_per_user` on (user_id) WHERE status = 'active'

**Indexes**:
- Primary key on `id`
- Unique partial index on `user_id` where `status = 'active'`
- Index on `user_id` for user subscription queries
- Index on `status` for active subscription queries

**RLS Policies**:
- Users can view own subscriptions (SELECT)
- Admins can view all subscriptions (SELECT)
- Admins can insert subscriptions (INSERT)
- Admins can update subscriptions (UPDATE)

#### 6.3.3 checkins

**Purpose**: Record attendance and subscription usage

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Check-in ID |
| user_id | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | Member who checked in |
| subscription_id | UUID | REFERENCES subscriptions(id) | Subscription used (NULL for non-subscription users) |
| course_id | UUID | REFERENCES courses(id) | Course attended (NULL for non-course check-ins) |
| admin_id | UUID | NOT NULL, REFERENCES profiles(id) | Admin who performed check-in |
| booking_type | booking_type | | Type of booking (subscription, single, drop_in) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Check-in timestamp |

**Indexes**:
- Primary key on `id`
- Index on `user_id` for user history queries
- Index on `course_id` for course attendance queries
- Index on `created_at` for date-range queries
- Composite index on `(user_id, created_at)` for user history sorting
- Composite index on `(course_id, created_at)` for course history

**RLS Policies**:
- Users can view own check-ins (SELECT)
- Admins can view all check-ins (SELECT)
- Admins can insert check-ins (INSERT)

#### 6.3.4 courses

**Purpose**: Store course/class schedule and details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Course ID |
| dance_style | TEXT | NOT NULL | Dance style name (e.g., "Girls Kpop") |
| instructor_id | UUID | REFERENCES profiles(id) | Assigned instructor |
| location | TEXT | NOT NULL | Studio location/room |
| scheduled_date | DATE | NOT NULL | Course date |
| start_time | TIME | NOT NULL | Start time (default 15:00) |
| duration | INTERVAL | NOT NULL | Duration (default 90 minutes) |
| capacity | INTEGER | NOT NULL, DEFAULT 25 | Maximum participants |
| status | course_status | NOT NULL, DEFAULT 'scheduled' | Course status |
| description | TEXT | | Additional course details |
| created_by | UUID | NOT NULL, REFERENCES profiles(id) | Admin who created course |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Constraints**:
- Unique index on `(scheduled_date, start_time)` to prevent double-booking same time slot

**Indexes**:
- Primary key on `id`
- Index on `scheduled_date` for date-range queries
- Index on `instructor_id` for instructor course queries
- Index on `status` for filtering active courses
- Composite index on `(scheduled_date, start_time)` for schedule queries

**RLS Policies**:
- All authenticated users can view courses (SELECT)
- Admins can insert courses (INSERT)
- Admins can update courses (UPDATE)
- Admins can delete courses (DELETE)

#### 6.3.5 bookings

**Purpose**: Track course registrations and reservations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Booking ID |
| user_id | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | User who booked |
| course_id | UUID | NOT NULL, REFERENCES courses(id) ON DELETE CASCADE | Booked course |
| booking_type | booking_type | NOT NULL | Type of booking |
| status | booking_status | NOT NULL, DEFAULT 'confirmed' | Booking status |
| booked_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Booking timestamp |
| cancelled_at | TIMESTAMPTZ | | Cancellation timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |

**Constraints**:
- Unique index on `(user_id, course_id, status)` WHERE status = 'confirmed' to prevent duplicate active bookings

**Indexes**:
- Primary key on `id`
- Index on `user_id` for user booking queries
- Index on `course_id` for course booking queries
- Index on `status` for filtering active bookings
- Composite index on `(course_id, status)` for capacity calculations

**RLS Policies**:
- Users can view own bookings (SELECT)
- Admins can view all bookings (SELECT)
- Authenticated users can insert own bookings (INSERT)
- Users can update own bookings (UPDATE, for cancellation)
- Admins can insert any booking (INSERT)
- Admins can update any booking (UPDATE)

### 6.4 Database Functions

#### 6.4.1 is_admin()

**Purpose**: Helper function to check if current user is admin

```sql
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
```

**Returns**: TRUE if auth.uid() has role 'admin', FALSE otherwise

**Security**: SECURITY DEFINER

**Usage**: Used in RLS policies for admin-only operations

#### 6.4.2 handle_new_user()

**Purpose**: Automatically create profile when user registers

**Trigger**: AFTER INSERT on auth.users

**Logic**:
- Extracts full_name and dob from user metadata
- Creates profile record with default role 'member'
- Links profile.id to auth.users.id

**Security**: SECURITY DEFINER

#### 6.4.3 assign_subscription()

**Purpose**: Create new subscription and archive existing one

```sql
CREATE OR REPLACE FUNCTION assign_subscription(
  p_user_id UUID,
  p_type subscription_type,
  p_start_date DATE DEFAULT NULL,
  p_admin_id UUID DEFAULT auth.uid()
) RETURNS UUID
```

**Parameters**:
- `p_user_id`: User receiving subscription
- `p_type`: Subscription type (monthly, 5_times, 10_times)
- `p_start_date`: Start date for monthly (defaults to CURRENT_DATE)
- `p_admin_id`: Admin assigning (defaults to current user)

**Logic**:
1. Verify caller is admin (else raise exception)
2. Archive current active subscription (set status = 'archived')
3. Calculate dates/credits based on type
4. Insert new subscription with status 'active'
5. Return new subscription ID

**Returns**: UUID of newly created subscription

**Security**: SECURITY DEFINER, requires admin

#### 6.4.4 perform_checkin()

**Purpose**: Validate and record check-in

```sql
CREATE OR REPLACE FUNCTION perform_checkin(
  p_user_id UUID,
  p_admin_id UUID DEFAULT auth.uid()
) RETURNS JSONB
```

**Parameters**:
- `p_user_id`: User checking in
- `p_admin_id`: Admin performing check-in

**Logic**:
1. Verify caller is admin (else raise exception)
2. Find active subscription for user
3. Validate subscription:
   - Monthly: current_date between start_date and end_date
   - Times: remaining_credits > 0
4. If valid:
   - Insert check-in record
   - Decrement remaining_credits (for times cards)
   - Update status to 'depleted' if credits = 0
   - Return success with remaining balance
5. If invalid:
   - Return error with specific reason

**Returns**: JSONB object with:
- `success`: boolean
- `message`: string
- `checkin_id`: UUID (if successful)
- `remaining`: integer (days or credits remaining)

**Security**: SECURITY DEFINER, requires admin

#### 6.4.5 has_checked_in_today()

**Purpose**: Check if user already checked in today (Zurich timezone)

```sql
CREATE OR REPLACE FUNCTION has_checked_in_today(
  p_user_id UUID
) RETURNS BOOLEAN
```

**Parameters**:
- `p_user_id`: User to check

**Logic**:
- Checks if checkins record exists for user where created_at (in Zurich time) equals today (in Zurich time)

**Returns**: TRUE if checked in today, FALSE otherwise

**Security**: SECURITY DEFINER, requires admin

#### 6.4.6 create_course_booking()

**Purpose**: Create a course booking with capacity validation

```sql
CREATE OR REPLACE FUNCTION create_course_booking(
  p_user_id UUID,
  p_course_id UUID,
  p_booking_type booking_type DEFAULT 'single'
) RETURNS UUID
```

**Parameters**:
- `p_user_id`: User booking the course
- `p_course_id`: Course to book
- `p_booking_type`: Type of booking (subscription, single, drop_in)

**Logic**:
1. Lock course row (FOR UPDATE)
2. Check current confirmed bookings count
3. Verify capacity not exceeded
4. Check for existing confirmed booking by user for this course
5. If valid, insert booking record
6. Return booking ID

**Returns**: UUID of newly created booking

**Errors**:
- "Course at capacity" if full
- "Already booked" if user has existing confirmed booking

**Security**: SECURITY DEFINER, requires authentication

#### 6.4.7 cancel_course_booking()

**Purpose**: Cancel a course booking with time window validation

```sql
CREATE OR REPLACE FUNCTION cancel_course_booking(
  p_booking_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
```

**Parameters**:
- `p_booking_id`: Booking to cancel
- `p_user_id`: User cancelling (for authorization)

**Logic**:
1. Verify booking belongs to user (or user is admin)
2. Get course start time
3. Calculate cancellation deadline (start_time - 3 hours)
4. Verify current time < deadline
5. Update booking status to 'cancelled', set cancelled_at timestamp
6. Return success

**Returns**: TRUE if successful

**Errors**:
- "Booking not found" if invalid ID
- "Unauthorized" if not owner/admin
- "Cannot cancel within 3 hours of start" if too late

**Security**: SECURITY DEFINER, requires authentication

#### 6.4.8 perform_course_checkin()

**Purpose**: Check in user for a course with booking/capacity validation

```sql
CREATE OR REPLACE FUNCTION perform_course_checkin(
  p_user_id UUID,
  p_course_id UUID,
  p_admin_id UUID DEFAULT auth.uid(),
  p_create_booking BOOLEAN DEFAULT FALSE
) RETURNS JSONB
```

**Parameters**:
- `p_user_id`: User checking in
- `p_course_id`: Course to check in for
- `p_admin_id`: Admin performing check-in
- `p_create_booking`: If TRUE, create booking for drop-in user

**Logic**:
1. Verify caller is admin
2. Check if user has confirmed booking for course
3. If no booking and p_create_booking = TRUE:
   - Create drop-in booking
4. If no booking and p_create_booking = FALSE:
   - Return error with confirmation prompt
5. Find active subscription (if exists)
6. Validate subscription (if exists)
7. Check for duplicate check-in for same course
8. Insert check-in record with booking_type
9. Decrement subscription credits if applicable
10. Return success with details

**Returns**: JSONB object with:
- `success`: boolean
- `message`: string
- `checkin_id`: UUID (if successful)
- `booking_type`: string
- `needs_confirmation`: boolean (if drop-in without booking)

**Security**: SECURITY DEFINER, requires admin

### 6.5 Storage Buckets

#### avatars
- **Purpose**: Store user profile pictures
- **Access**: Public read, authenticated write (own files only)
- **File Types**: image/jpeg, image/png, image/webp
- **Max Size**: 5MB
- **Naming**: `{user_id}.{ext}`

#### student-cards
- **Purpose**: Store student verification documents
- **Access**: Authenticated read (own files + admins), authenticated write (own files only)
- **File Types**: image/jpeg, image/png, image/webp
- **Max Size**: 5MB
- **Naming**: `{user_id}_{timestamp}.{ext}`

### 6.6 Entity Relationships

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
└────────┬────────┘
         │ 1
         │
         │ 1
┌────────▼────────┐
│    profiles     │◄───────────┐
│                 │            │
│  - id (PK)      │            │ assigned_by/created_by
│  - full_name    │            │ admin_id/instructor_id
│  - role         │            │
│  - member_type  │            │
└────┬────┬───┬───┘            │
     │ 1  │ 1 │ 1              │
     │    │   │                │
     │ *  │ * │ *         ┌────┴──────────┐
┌────▼────▼───▼──┐        │               │
│ subscriptions  │        │    courses    │◄────┐
│                │        │               │     │
│  - id (PK)     │        │  - id (PK)    │     │
│  - user_id (FK)│        │  - instructor │     │
│  - type        │        │  - date       │     │
│  - status      │        │  - time       │     │
│  - assigned_by │        │  - capacity   │     │
└────────┬───────┘        └───────┬───────┘     │
         │ 1                      │ 1           │
         │                        │             │
         │ *                      │ *           │
┌────────▼────────┐       ┌───────▼──────┐      │
│    checkins     │       │   bookings   │      │
│                 │◄──────┤              │      │
│  - id (PK)      │       │  - id (PK)   │      │
│  - user_id (FK) │   *   │  - user_id   │      │
│  - subscription │   1   │  - course_id │──────┘
│  - course_id(FK)│       │  - type      │
│  - admin_id (FK)│       │  - status    │
│  - booking_type │       └──────────────┘
└─────────────────┘
```

**Relationships**:
1. **auth.users → profiles**: One-to-one (cascade delete)
2. **profiles → subscriptions**: One-to-many (user_id, cascade delete)
3. **profiles → subscriptions**: One-to-many (assigned_by, no cascade)
4. **profiles → courses**: One-to-many (instructor_id, no cascade)
5. **profiles → courses**: One-to-many (created_by, no cascade)
6. **profiles → bookings**: One-to-many (user_id, cascade delete)
7. **courses → bookings**: One-to-many (course_id, cascade delete)
8. **subscriptions → checkins**: One-to-many (subscription_id, nullable, no cascade)
9. **courses → checkins**: One-to-many (course_id, nullable, no cascade)
10. **profiles → checkins**: One-to-many (user_id, cascade delete)
11. **profiles → checkins**: One-to-many (admin_id, no cascade)
12. **bookings → checkins**: One-to-one (implicit via user_id + course_id)

---

## 7. User Interface & Design System

### 7.1 Design Philosophy

**Brand Personality**: Energetic, playful, slightly futuristic, friendly, youth-oriented

**Visual Theme**: "Glow in the dark" vibe with confident contrast, soft gradients, and sparkles

**Design Approach**: Mobile-first, dark UI with purple/lavender accents, rounded corners, minimal animations

### 7.2 Color System

#### Core Colors
- **Space Black**: `#000000` - Primary background
- **Deep Violet**: `#433467` - Secondary background, panels
- **Cosmic Purple**: `#5A448A` - Primary brand color

#### Accent Colors
- **Neon Lavender**: `#B0AFDD` - Glows, highlights, borders
- **Electric Periwinkle**: `#6F6DAD` - Links, secondary CTA
- **Pink Aura**: `#BB77A1` - Special highlights, badges
- **Soft Blush**: `#EFD5E0` - Light surfaces on dark backgrounds

#### Gradients
- **Aurora Glow**: `#B0AFDD → #5A448A` (hero, primary CTA)
- **Purple Pop**: `#6F6DAD → #BB77A1` (section headers)
- **Soft Highlight**: `#EFD5E0 → #B0AFDD` (subtle shine)

#### Usage Rules
- Keep most pages dark (Space Black / Deep Violet)
- Use gradients only on key moments (hero, CTA, headers, active states)
- Maximum 1 strong gradient per screen section
- Near-white text on dark backgrounds (avoid pure white glare)

### 7.3 Typography

**Font Family**: Clean, modern rounded sans-serif (system fonts)

#### Mobile Scale
- **H1**: 28-32px, line-height 1.15-1.25
- **H2**: 22-24px, line-height 1.15-1.25
- **H3**: 18-20px, line-height 1.15-1.25
- **Body**: 16px, line-height 1.4-1.6
- **Caption**: 12-13px, line-height 1.4-1.6

### 7.4 Spacing & Layout

#### Base Spacing Scale
4px scale: 4, 8, 12, 16, 24, 32

#### Page Layout
- **Page padding**: 16px (all screens)
- **Content max-width**: 600-720px (centered on tablet/desktop)

#### Breakpoints (Mobile-First)
- **360-430px**: Primary design target
- **768px**: Tablet adjustments
- **1024px+**: Enhanced layout (do not redesign)

### 7.5 Components

#### Buttons
- **Height**: Minimum 44px (tap target)
- **Padding**: 16px horizontal, 12px vertical
- **Border Radius**: 8px (rounded)
- **Primary**: Aurora Glow gradient, white text
- **Secondary**: Transparent with Neon Lavender border
- **Hover**: Soft glow effect (lavender-tinted)
- **Focus**: 2px Neon Lavender focus ring

#### Cards
- **Background**: Deep Violet with 1px border (Cosmic Purple, low opacity)
- **Border Radius**: 12px
- **Padding**: 16-24px
- **Shadow**: Subtle (low opacity, large blur)
- **Hover**: Slight glow (lavender-tinted, medium blur)

#### Input Fields
- **Height**: 44px
- **Padding**: 12px
- **Border**: 1px Cosmic Purple (low opacity)
- **Border Radius**: 8px
- **Background**: Deep Violet
- **Focus**: 2px Neon Lavender border
- **Text**: Near-white

#### Tables
- **Header**: Deep Violet background, near-white text
- **Rows**: Alternating subtle backgrounds
- **Borders**: 1px Cosmic Purple (low opacity)
- **Hover**: Slight highlight (Neon Lavender tint)

#### Modals/Dialogs
- **Backdrop**: Space Black at 80% opacity
- **Container**: Deep Violet, 12px border radius
- **Max Width**: 90vw (mobile), 600px (desktop)
- **Padding**: 24px
- **Close Button**: Top-right, visible focus ring

#### Badges
- **Height**: 24px
- **Padding**: 8px horizontal
- **Border Radius**: 12px (pill shape)
- **Student**: Pink Aura background
- **Active**: Neon Lavender background
- **Expired**: Soft Blush background with reduced opacity

### 7.6 Iconography

- **Style**: Simple outline icons, 1.5px stroke, rounded caps
- **Size**: 20-24px standard, 32px for primary actions
- **Library**: Lucide React
- **Glow**: On hover only (not default)
- **Star/Sparkle Motif**: Sparingly used as decorations

### 7.7 Accessibility

#### Focus States
- **Focus Ring**: 2px Neon Lavender, always visible for keyboard users
- Applied to: buttons, links, inputs, filters, carousel controls

#### Tap Targets
- **Minimum**: 44px height for all interactive elements

#### Contrast
- Body text near-white on dark (WCAG AA minimum)
- Avoid low-contrast purple text on dark surfaces
- Interactive elements have clear visual states

#### Motion
- Minimal animations to protect performance
- Glow effects only on interaction (button press, selected chip)
- Respect `prefers-reduced-motion` setting

### 7.8 Key UI Screens

#### Landing Page
- Hero section with Aurora Glow gradient
- "Log in" and "Sign Up" CTA buttons
- Minimal text, focused on primary actions

#### Login/Register
- Centered form on dark background
- Floating elements (orbits, sparkles) for visual interest
- Email/password fields + Google OAuth button
- Clear error messaging inline

#### Profile Page (Member)
- Avatar at top (editable)
- Profile information fields
- "Show QR Code" prominent button
- Current subscription status card
- Subscription and check-in history sections

#### QR Code Modal
- Full-screen modal
- User name at top
- Large QR code (centered, 256x256px+)
- Subscription status indicator
- Close button (top-right)

#### Admin Dashboard
- Quick stats cards at top (check-ins, members, pending verifications)
- Navigation to: Users, Scanner, Verifications
- Clean card-based layout

#### User Management (Admin)
- Search bar at top
- Filter chips (member type, subscription status)
- Table with user information
- Action buttons per row (assign subscription, view details)

#### QR Scanner (Admin)
- Full-screen camera view
- QR detection overlay
- Success/error feedback area
- Recent check-ins list below scanner
- Today's check-in count

#### Student Verifications (Admin)
- Pending requests table
- Student card thumbnail per row
- Approve/Reject actions
- Detail modal with full-size image

---

## 8. Security & Privacy

### 8.1 Authentication Security

#### Password Requirements
- Minimum 6 characters (Supabase default)
- No maximum length restriction
- Special characters recommended but not required

#### Session Management
- Sessions managed by Supabase Auth
- JWT tokens stored in HTTP-only cookies
- Automatic session refresh via middleware
- Default session expiry: 7 days
- Refresh token rotation enabled

#### OAuth Security
- Google OAuth via Supabase provider
- PKCE (Proof Key for Code Exchange) enabled
- Redirect URI validation
- State parameter for CSRF protection

### 8.2 Authorization

#### Row Level Security (RLS)
- Enabled on all tables: profiles, subscriptions, checkins
- Policies enforce user/admin access control
- Database-level security (cannot be bypassed via API)

#### Role-Based Access Control
- Roles stored in database (not JWT claims)
- Admin status verified server-side on every request
- Middleware protects admin routes at application level
- 404 response for unauthorized admin access (security through obscurity)

#### API Security
- Supabase anonymous key used (public exposure safe)
- RLS policies protect data access
- Server actions verify authentication
- Admin-only functions check `is_admin()` in database

### 8.3 Data Privacy

#### Personal Data Storage
- Full name, email, date of birth, avatar image
- Student card images (for verification only)
- Check-in timestamps (attendance records)

#### Data Access
- Users can view/edit only own profile
- Users can view only own subscriptions and check-ins
- Admins can view all user data (operational necessity)
- Public profile view limited to name and avatar

#### Data Retention
- Profiles deleted on user account deletion (CASCADE)
- Check-in history retained for archived users (operational records)
- Student card images retained with profile

#### GDPR Considerations
- User can request account deletion via admin
- Deletion cascades to subscriptions and check-ins
- Avatars and student cards removed from storage
- No automatic data export (manual admin process)

### 8.4 File Upload Security

#### Allowed File Types
- Avatars: JPEG, PNG, WebP only
- Student cards: JPEG, PNG, WebP only
- MIME type validation on upload

#### File Size Limits
- Maximum 5MB per file
- Enforced at application and storage policy level

#### File Storage
- Supabase Storage with RLS policies
- Avatars bucket: public read, authenticated write (own files)
- Student-cards bucket: authenticated read (own + admin), authenticated write (own files)

#### File Naming
- Avatars: `{user_id}.{ext}` (prevents path traversal)
- Student cards: `{user_id}_{timestamp}.{ext}`
- No user-provided filenames accepted

### 8.5 QR Code Security

#### QR Code Content
- Contains only: user ID (UUID) and timestamp
- No sensitive information (passwords, tokens)
- Timestamp for freshness validation (future feature)

#### Scanning Security
- Admin authentication required to access scanner
- QR validation checks user existence before processing
- Invalid QR codes rejected with error (no check-in)

#### Replay Attack Prevention
- Current: None (QR codes reusable)
- Future: Timestamp validation, expiring QR codes

### 8.6 Input Validation

#### Client-Side Validation
- React Hook Form + Zod schemas
- Immediate feedback on invalid input
- Prevents submission of invalid data

#### Server-Side Validation
- All server actions validate input
- Database constraints enforce data integrity
- Type safety via TypeScript

#### SQL Injection Prevention
- Parameterized queries via Supabase client
- No raw SQL from user input
- ORM-style query building

#### XSS Prevention
- React automatic escaping of user content
- No `dangerouslySetInnerHTML` used
- Content Security Policy headers (Vercel default)

### 8.7 Audit & Monitoring

#### Activity Logging
- Check-ins record admin_id (who performed action)
- Subscriptions record assigned_by (who assigned)
- Timestamps on all records (created_at)

#### Error Logging
- Vercel automatic error tracking
- Supabase database logs
- No sensitive data in error messages

#### Access Monitoring
- Vercel Analytics tracks page views
- No user-level activity tracking (privacy)

---

## 9. Performance Requirements

### 9.1 Page Load Performance

#### Target Metrics
- **First Contentful Paint (FCP)**: < 1.5 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **Time to Interactive (TTI)**: < 3.5 seconds
- **Cumulative Layout Shift (CLS)**: < 0.1

#### Optimization Strategies
- Next.js automatic code splitting
- Static generation for public pages
- Server-side rendering for authenticated pages
- Image optimization via Next.js Image component
- Lazy loading for modals and dialogs

### 9.2 Runtime Performance

#### Target Metrics
- **QR Code Scan Response**: < 3 seconds (validation + check-in)
- **Search/Filter Response**: < 500ms
- **Form Submission**: < 2 seconds
- **Page Navigation**: < 1 second

#### Optimization Strategies
- Database function for check-in (single query)
- Indexed columns for search/filter queries
- Client-side caching of user profile
- Optimistic UI updates with rollback

### 9.3 Database Performance

#### Query Optimization
- Indexes on frequently queried columns (user_id, status, created_at)
- Composite indexes for common query patterns
- Database functions reduce round-trips

#### Connection Management
- Supabase connection pooling
- Automatic connection scaling

### 9.4 Network Performance

#### Data Transfer
- Minimal payload sizes via API
- GZIP compression (Vercel default)
- CDN for static assets (Vercel Edge Network)

#### Image Optimization
- Avatar compression before upload
- WebP format support
- Responsive image sizes

### 9.5 Mobile Performance

#### Targets
- Smooth scrolling (60fps)
- Fast tap response (< 100ms visual feedback)
- Camera activation < 2 seconds

#### Optimizations
- Minimal animations (respect battery)
- Lazy load camera (only when scanner opened)
- Reduced motion support

### 9.6 Scalability

#### Current Capacity
- **Users**: 50-500 active members
- **Check-ins**: 100-500 per day
- **Concurrent Users**: 5-20 simultaneous

#### Database Scaling
- Supabase handles scaling automatically
- Postgres performance adequate for target scale

#### Application Scaling
- Vercel serverless functions auto-scale
- No server state (stateless architecture)

---

## 10. Deployment & Infrastructure

### 10.1 Hosting

#### Application Hosting
- **Platform**: Vercel
- **Region**: Auto (closest to users)
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

#### Database Hosting
- **Platform**: Supabase
- **Region**: Configurable (recommend EU for Zurich studio)
- **Tier**: Free tier sufficient for current scale
- **Backups**: Automatic daily backups (Supabase managed)

### 10.2 Environment Configuration

#### Environment Variables

**Required for Production**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

**Variable Sources**:
- Supabase Dashboard → Settings → API
- Stored in Vercel project settings
- Never committed to repository

#### Build Configuration
- **Node Version**: 18.x or higher
- **Package Manager**: npm
- **Install Command**: `npm install`
- **Framework Detection**: Automatic (Next.js)

### 10.3 Deployment Process

#### Continuous Deployment
1. Push to `main` branch → Production deployment
2. Push to other branches → Preview deployment
3. Pull requests → Automatic preview URLs

#### Deployment Steps (Automatic)
1. Vercel pulls latest code
2. Installs dependencies (`npm install`)
3. Runs build (`npm run build`)
4. Deploys to Edge Network
5. Updates DNS (automatic)

#### Rollback Process
- Vercel dashboard: Instant rollback to previous deployment
- No database migration rollbacks (manual)

### 10.4 Database Deployment

#### Schema Deployment
1. Access Supabase SQL Editor
2. Copy schema from `docs/schema.sql`
3. Execute in SQL Editor
4. Verify tables/functions created

#### Storage Deployment
1. Access Supabase Storage
2. Create buckets: `avatars`, `student-cards`
3. Apply RLS policies from `docs/storage-policies.sql`
4. Verify bucket configuration

#### First Admin User
1. Register normal account via application
2. Access Supabase SQL Editor
3. Manually update: `UPDATE profiles SET role = 'admin' WHERE id = '[user-id]';`
4. User gains admin access on next login

### 10.5 Monitoring & Analytics

#### Application Monitoring
- **Vercel Analytics**: Page views, user sessions
- **Vercel Speed Insights**: Core Web Vitals tracking
- **Dashboard**: Vercel project dashboard

#### Database Monitoring
- **Supabase Dashboard**: Query performance, connection stats
- **Logs**: Real-time database logs
- **Alerts**: Automatic alerts for downtime (Supabase managed)

#### Error Tracking
- Vercel automatic error logging
- Runtime errors visible in Vercel dashboard
- No third-party error tracking (Sentry, etc.)

### 10.6 Backup & Recovery

#### Database Backups
- **Frequency**: Daily automatic (Supabase Free tier)
- **Retention**: 7 days
- **Recovery**: Point-in-time restore via Supabase dashboard

#### Storage Backups
- **Avatars**: No automatic backup (user can re-upload)
- **Student Cards**: No automatic backup (can request re-verification)
- **Recommendation**: Manual periodic backup for production

#### Application Backup
- **Code**: Git repository (GitHub)
- **Deployments**: Vercel retains deployment history
- **Recovery**: Redeploy from Git or previous Vercel deployment

### 10.7 SSL & Domain

#### SSL Certificate
- Automatic via Vercel (Let's Encrypt)
- Auto-renewal
- HTTPS enforced

#### Custom Domain
- Configure in Vercel project settings
- DNS managed via domain registrar
- Vercel provides DNS instructions

---

## 11. Success Metrics

### 11.1 User Adoption Metrics

#### Target Metrics (First 3 Months)
- **Active Members**: 100+ registered users
- **Active Subscriptions**: 80% of registered users
- **Check-in Rate**: 70% of active subscription holders check in weekly

#### Measurement
- Query `profiles` table for total users
- Query `subscriptions` table for active subscriptions
- Query `checkins` table grouped by week

### 11.2 Operational Efficiency Metrics

#### Check-in Efficiency
- **Target**: Average check-in time < 5 seconds (scan to confirmation)
- **Baseline**: 30+ seconds (manual paper-based)
- **Improvement**: 83% reduction in check-in time

#### Admin Time Savings
- **Target**: Reduce admin time on check-ins by 50%
- **Baseline**: 15 minutes per session (30 members)
- **Goal**: 7.5 minutes per session

#### Subscription Management
- **Target**: 100% of subscriptions tracked digitally
- **Error Reduction**: 95% reduction in manual tracking errors

### 11.3 System Performance Metrics

#### Uptime
- **Target**: 99.5% uptime (Vercel + Supabase SLA)
- **Measurement**: Vercel/Supabase status dashboards

#### Response Time
- **Target**: 95% of requests complete in < 3 seconds
- **Measurement**: Vercel Speed Insights

#### Error Rate
- **Target**: < 1% of requests result in errors
- **Measurement**: Vercel error logs

### 11.4 User Satisfaction Metrics

#### Member Satisfaction
- **QR Code Usage**: 90% of members successfully use QR code on first attempt
- **Profile Completion**: 95% of registered users complete profile
- **Support Requests**: < 5% of users require support for basic features

#### Admin Satisfaction
- **Scanner Reliability**: 95% of QR scans successful on first attempt
- **User Management**: Admins can complete subscription assignment in < 30 seconds
- **Verification Workflow**: Student verifications processed within 24 hours

### 11.5 Feature Adoption Metrics

#### Student Verification
- **Application Rate**: 20% of members apply for student status
- **Approval Rate**: 80% of applications approved
- **Re-verification Rate**: < 5% require re-upload

#### Subscription Types
- **Monthly**: 40% of active subscriptions
- **5-Times**: 30% of active subscriptions
- **10-Times**: 30% of active subscriptions

### 11.6 Technical Health Metrics

#### Code Quality
- **TypeScript Coverage**: 100% (enforced)
- **Build Success Rate**: > 99%
- **Linting Errors**: 0 on production builds

#### Database Health
- **Query Performance**: 95% of queries < 500ms
- **Connection Errors**: < 0.1%
- **Storage Usage**: Monitor avatar/student-card bucket growth

---

## 12. Course Booking & Attendance System

### 12.1 Feature Overview

#### 12.1.1 Business Context

The Course Booking & Attendance System extends the existing member management platform to support scheduled Saturday dance courses. This feature addresses the need to:
- Manage course capacity and scheduling
- Allow both subscription and non-subscription members to book courses
- Track course-specific attendance alongside general check-ins
- Handle drop-in participants efficiently at the door
- Provide instructors with course assignments and visibility

#### 12.1.2 Value Proposition

**For Studio Operations:**
- Structured course scheduling with capacity management
- Clear visibility into course popularity and attendance patterns
- Automated capacity tracking prevents overbooking
- Flexible handling of subscription vs single-booking users
- Streamlined drop-in check-in process

**For Members:**
- Easy course discovery and booking
- Guaranteed spot reservation (no uncertainty about space availability)
- Flexible cancellation policy (up to 3 hours before class)
- Clear attendance history per course
- Seamless integration with existing subscription system

**For Instructors:**
- Clear course assignments
- Visibility into expected attendance
- Professional profile display to members

#### 12.1.3 Integration with Existing System

The Course Booking system integrates seamlessly with existing features:
- **Subscription System**: Subscription holders still get unlimited access but must book to reserve spots
- **QR Check-in**: Extended to validate course bookings and create drop-in bookings on-the-fly
- **User Profiles**: Members view course bookings and attendance history alongside subscription info
- **Admin Dashboard**: Course management integrated into existing admin workflows

### 12.2 Course Management

#### 12.2.1 Course Structure

**Course Definition:**
A course represents a specific dance class scheduled for a particular date and time. Each course includes:
- Dance style (e.g., "Girls Kpop", "Contemporary", "Hip-Hop Beginner")
- Assigned instructor
- Location/studio room
- Scheduled date (typically Saturday)
- Start time (default: 15:00 / 3:00 PM)
- Duration (default: 90 minutes)
- Capacity (default: 25 participants, adjustable by admin)
- Status (scheduled, completed, cancelled)

**Course Templates:**
Default values streamline course creation:
- **Default Dance Style**: "Girls Kpop"
- **Default Location**: Studio address (configured by admin)
- **Default Time**: 15:00 (3:00 PM)
- **Default Duration**: 90 minutes
- **Default Capacity**: 25

#### 12.2.2 Course Creation Workflows

**Single Course Creation:**
Admin creates one course at a time with the following flow:
1. Navigate to Courses → Create Course
2. Fill in course details (defaults pre-populated)
3. Select instructor from dropdown (optional, can be assigned later)
4. Choose date (typically next Saturday)
5. Adjust capacity if needed
6. Submit to create course

**Batch Course Creation:**
Admin creates multiple courses for all Saturdays in a month:
1. Navigate to Courses → Create Course
2. Toggle "Batch Mode"
3. Select target month (e.g., February 2026)
4. System displays all Saturdays: Feb 8, 15, 22
5. System checks for existing courses on those dates
6. Shows preview:
   - ✓ Feb 15 (new) - will create
   - ✓ Feb 22 (new) - will create
   - ⊘ Feb 8 (skipped) - already has course
7. Admin fills in template details (dance style, instructor, etc.)
8. Confirm → creates courses for available dates
9. Skipped dates shown in notification

**Batch Creation Rules:**
- Skip Saturdays that already have any course scheduled
- All created courses use same template (dance style, time, instructor, capacity)
- Individual courses can be edited afterward
- Notification shows how many courses created and how many skipped

#### 12.2.3 Course Editing and Management

**Admin Capabilities:**
- Edit course details (dance style, instructor, time, capacity)
- Change course status (scheduled → completed/cancelled)
- View booking list for each course
- View attendance/check-in list for each course
- Delete courses (only if no bookings exist)

**Course Display:**
- List view shows all upcoming courses sorted by date
- Past courses visible in history with attendance stats
- Filter by instructor, date range, dance style
- Search by course name/style

### 12.3 Booking System

#### 12.3.1 Booking Types

The system supports three distinct booking types:

**1. Subscription Booking**
- User has active subscription (monthly, 5-times, or 10-times)
- Books course to reserve spot within capacity
- No additional payment required
- Check-in uses subscription credits/validity
- `booking_type: 'subscription'`

**2. Single Booking**
- User has NO active subscription
- Books course individually (drop-in pre-booking)
- Uses existing booking system for capacity management
- No payment integration (handled outside system)
- Check-in recorded without subscription reference
- `booking_type: 'single'`

**3. Drop-in Booking**
- User arrives without prior booking
- Admin creates booking during check-in process
- System prompts admin with confirmation dialog
- Booking + check-in created atomically
- `booking_type: 'drop_in'`

#### 12.3.2 Booking Flow (Member)

**Booking a Course:**
1. Member navigates to Courses page
2. Views list of upcoming courses with:
   - Dance style and instructor
   - Date and time
   - Current capacity (e.g., "18/25 spots")
   - Book button (if space available)
3. Member clicks "Book Now"
4. System validates:
   - User authenticated
   - Course not at capacity
   - User doesn't already have confirmed booking
   - Course hasn't started yet
5. System determines booking_type:
   - Has active subscription → 'subscription'
   - No active subscription → 'single'
6. Booking created with status 'confirmed'
7. Success message displayed
8. Course shows "Booked" badge and capacity updated

**View Bookings:**
- Courses page shows two tabs:
  - "Your Bookings" (upcoming courses user is registered for)
  - "All Courses" (browse all available courses)
- Each booked course displays cancel button (if within cancellation window)

#### 12.3.3 Cancellation Policy

**Cancellation Window:**
- Members can cancel up to 3 hours before course start time
- Cancellations within 3 hours of start time are not allowed
- All times calculated in Zurich timezone (Europe/Zurich)

**Cancellation Flow:**
1. Member views booked courses
2. Clicks "Cancel" button on a booking
3. System calculates: `current_time < (course_start_time - 3 hours)`
4. If within window:
   - Confirmation dialog appears
   - Member confirms cancellation
   - Booking status changed to 'cancelled'
   - Cancelled_at timestamp recorded
   - Capacity freed up (available for others to book)
   - Success message displayed
5. If outside window:
   - "Cancel" button disabled
   - Message shows "Cannot cancel within 3 hours of start"

**Late Cancellation:**
- Members who don't cancel must still attend or will be marked as no-show
- No-show tracking available to admin but no automatic penalties

#### 12.3.4 Capacity Management

**Capacity Rules:**
- Each course has maximum capacity (default 25, adjustable by admin)
- Confirmed bookings count toward capacity
- Cancelled bookings do not count toward capacity
- Admin can override capacity during check-in (with warning)

**Capacity Display:**
- Real-time capacity shown as "18/25 spots"
- Course at capacity shows "FULL" badge
- Book button disabled when at capacity
- Members see accurate capacity before booking

**Concurrency Control:**
- Database-level pessimistic locking during booking creation
- Course row locked (FOR UPDATE) during capacity check
- Transaction prevents race conditions
- If two users book simultaneously, one succeeds, one gets "Course full" error

**Capacity Calculation:**
```sql
SELECT COUNT(*) 
FROM bookings 
WHERE course_id = $course_id 
  AND status = 'confirmed'
```

### 12.4 Check-in System Integration

#### 12.4.1 Extended Check-in Flow

The existing QR check-in system is extended to support course bookings:

**Check-in for Booked User (Subscription):**
1. Admin scans user's QR code
2. System identifies:
   - User exists ✓
   - User has confirmed booking for today's course ✓
   - User has active subscription ✓
3. System validates subscription (as before)
4. Check-in recorded with:
   - user_id, course_id, subscription_id
   - booking_type: 'subscription'
   - Credits decremented (if times card)
5. Success shown: "John Doe checked in (Subscription) - 18/25 attended"

**Check-in for Booked User (Single):**
1. Admin scans user's QR code
2. System identifies:
   - User exists ✓
   - User has confirmed booking for today's course ✓
   - User has NO active subscription
3. Check-in recorded with:
   - user_id, course_id, subscription_id: NULL
   - booking_type: 'single'
4. Success shown: "Sarah Chen checked in (Single) - 19/25 attended"

**Check-in for Unbooked User (Drop-in):**
1. Admin scans user's QR code
2. System identifies:
   - User exists ✓
   - User has NO booking for today's course
   - Course exists for today ✓
3. System shows confirmation dialog:

```
┌─────────────────────────────────┐
│  ⚠️ Drop-in Check-in            │
├─────────────────────────────────┤
│  [Avatar] Sarah Chen            │
│  Subscription: None             │
│                                 │
│  No booking found for:          │
│  Girls Kpop - Today 3:00 PM     │
│                                 │
│  Current: 18/25 capacity        │
│                                 │
│  Add to course and check in?    │
│                                 │
│  [Cancel]  [Confirm & Check-in] │
└─────────────────────────────────┘
```

4. Admin clicks "Confirm & Check-in"
5. Backend atomically:
   - Creates booking: {user_id, course_id, type: 'drop_in', status: 'confirmed'}
   - Creates check-in: {user_id, course_id, subscription_id: NULL, booking_type: 'drop_in'}
6. Success shown: "Sarah Chen checked in (Drop-in) - 19/25 attended"

#### 12.4.2 Capacity Override

**At-Capacity Scenario:**
When course is at 25/25 and admin scans an unbooked user:

```
┌─────────────────────────────────┐
│  ⚠️ Capacity Exceeded           │
├─────────────────────────────────┤
│  [Avatar] Sarah Chen            │
│                                 │
│  Course at full capacity!       │
│  Girls Kpop - Today 3:00 PM     │
│                                 │
│  Current: 25/25 (FULL)          │
│                                 │
│  Override and check in anyway?  │
│                                 │
│  [Cancel]  [Override & Check-in]│
└─────────────────────────────────┘
```

Admin can:
- Cancel → user not checked in
- Override → user checked in, capacity shows "26/25" with warning indicator

**Override Tracking:**
- System logs capacity overrides for admin review
- No hard limit on overrides (admin discretion)
- Capacity display shows warning color when exceeded

#### 12.4.3 Duplicate Check-in Prevention

**Existing Behavior (Maintained):**
- System checks if user already checked in today (Zurich timezone)
- Shows warning but ALLOWS duplicate check-in after admin confirmation
- Useful for users attending multiple sessions same day

**Extended for Courses:**
- System checks if user already checked in for THIS SPECIFIC COURSE
- If already checked in for same course: PREVENTS duplicate
- Prevents accidental double-scanning same person same course
- Different courses same day allowed (future multi-course days)

**Check Logic:**
```sql
-- Check for duplicate for same course
SELECT COUNT(*) FROM checkins 
WHERE user_id = $user_id 
  AND course_id = $course_id;
-- If > 0, show error: "Already checked in for this course"

-- Check for any check-in today (existing)
SELECT COUNT(*) FROM checkins 
WHERE user_id = $user_id 
  AND DATE(created_at AT TIME ZONE 'Europe/Zurich') = CURRENT_DATE;
-- If > 0, show warning but allow (different course)
```

### 12.5 Instructor Management

#### 12.5.1 Instructor Role

**Role Definition:**
- New user_role enum value: 'instructor'
- Instructor accounts managed entirely by admin
- No login/self-service capabilities for instructors
- Instructors cannot book courses as members

**Instructor Profile:**
- Basic profile information (name, avatar)
- Avatar displayed on course cards
- No access to member features
- Separate user account required if instructor wants to attend courses as member

**Creating Instructors:**
1. Admin navigates to User Management
2. Creates new user with role 'instructor'
3. Enters name and uploads profile picture
4. No email/password required (no login)
5. Instructor available for course assignment

**Small Team Scenario:**
- Studio has 3-5 instructors
- Simple dropdown selection when creating/editing courses
- Instructor list shows name and avatar
- Option to leave instructor unassigned

#### 12.5.2 Instructor Assignment

**Assigning to Courses:**
- Admin selects instructor from dropdown when creating course
- Instructor can be changed when editing course
- One instructor per course
- Instructor field optional (can remain unassigned)

**Instructor Display:**
- Course cards show instructor avatar and name
- "Instructor: [Name]" with small circular avatar
- Members see instructor info before booking
- No instructor profile page (avatar and name only)

### 12.6 User Interface Specifications

#### 12.6.1 Navigation Structure

**Member Navigation (Bottom Nav):**

```
┌─────────────────────────────────┐
│  📅 Courses                      │
│  Browse courses, book, cancel   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  👤 Profile                      │
│  QR code, subscription, history │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  ⚙️ Settings                     │
│  Edit profile, preferences      │
└─────────────────────────────────┘
```

**Admin Navigation (Bottom Nav):**

```
┌─────────────────────────────────┐
│  📅 Courses                      │
│  Manage courses and bookings    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  📷 Scanner                      │
│  QR check-in for courses        │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  📊 Dashboard                    │
│  Users, subscriptions, stats    │
└─────────────────────────────────┘
```

**Login Redirect:**
- Members → `/profile` (then navigate to Courses)
- Admins → `/admin/dashboard`

#### 12.6.2 Courses Page (Member)

**Layout:**

```
┌─────────────────────────────────┐
│  📅 Upcoming Courses            │
├─────────────────────────────────┤
│  [Your Bookings] [All Courses]  │  ← Tabs
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ Girls Kpop              │   │
│  │ Sat, Feb 8 • 3:00 PM    │   │
│  │ [Avatar] Jane Kim       │   │
│  │ Studio A • 90 min       │   │
│  │ 18/25 spots             │   │
│  │                         │   │
│  │ [✓ Booked] [Cancel]     │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Contemporary            │   │
│  │ Sat, Feb 15 • 3:00 PM   │   │
│  │ [Avatar] Mike Lee       │   │
│  │ Studio A • 90 min       │   │
│  │ 12/25 spots             │   │
│  │                         │   │
│  │ [Book Now]              │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Hip-Hop Beginner        │   │
│  │ Sat, Feb 22 • 3:00 PM   │   │
│  │ [Avatar] Unassigned     │   │
│  │ Studio A • 90 min       │   │
│  │ 25/25 spots • FULL      │   │
│  │                         │   │
│  │ [Full - Cannot Book]    │   │
│  └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  📅    👤    ⚙️                  │
└─────────────────────────────────┘
```

**Component Details:**

**Course Card:**
- Dance style (large, bold text)
- Date and time (formatted: "Sat, Feb 8 • 3:00 PM")
- Instructor avatar (small circular image) + name
- Location and duration
- Capacity indicator:
  - Green text if < 80% capacity
  - Orange text if 80-100% capacity
  - Red "FULL" badge if at capacity
- Action button:
  - "Book Now" (primary button, enabled)
  - "✓ Booked" (success badge) + "Cancel" (secondary button)
  - "Full - Cannot Book" (disabled button)

**Your Bookings Tab:**
- Shows only courses user has confirmed bookings for
- Sorted by date (earliest first)
- Past bookings shown with "Attended" or "Missed" status
- Cancel button visible only if > 3 hours until start

**All Courses Tab:**
- Shows all upcoming courses
- User's booked courses marked with "✓ Booked" badge
- Sorted by date (earliest first)
- Filter options: Date range, Dance style, Instructor

#### 12.6.3 Courses Page (Admin)

**Layout:**

```
┌─────────────────────────────────┐
│  📅 Course Management           │
│  [+ Create Course] [📅 Batch]   │
├─────────────────────────────────┤
│  Filter: [All] [Scheduled] ...  │
│  Search: [____________] 🔍      │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ Girls Kpop              │   │
│  │ Sat, Feb 8 • 3:00 PM    │   │
│  │ Instructor: Jane Kim    │   │
│  │ Bookings: 18/25         │   │
│  │ Checked-in: 16          │   │
│  │                         │   │
│  │ [Edit] [View Bookings]  │   │
│  │ [View Attendance]       │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Contemporary            │   │
│  │ Sat, Feb 15 • 3:00 PM   │   │
│  │ Instructor: Unassigned  │   │
│  │ Bookings: 12/25         │   │
│  │ Checked-in: 0           │   │
│  │                         │   │
│  │ [Edit] [View Bookings]  │   │
│  │ [Delete]                │   │
│  └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  📅    📷    📊                  │
└─────────────────────────────────┘
```

**Create Course Dialog:**

```
┌─────────────────────────────────┐
│  Create Course                  │
├─────────────────────────────────┤
│  Mode:                          │
│  ● Single Course                │
│  ○ Batch (Monthly)              │
│                                 │
│  Dance Style:                   │
│  [Girls Kpop________]           │
│                                 │
│  Instructor:                    │
│  [Select instructor  ▼]         │
│  Options: Jane Kim, Mike Lee... │
│                                 │
│  Date:                          │
│  [Feb 8, 2026  📅]              │
│                                 │
│  Time:         Duration:        │
│  [15:00]       [90 min]         │
│                                 │
│  Location:                      │
│  [Studio A__________]           │
│                                 │
│  Capacity:                      │
│  [25]                           │
│                                 │
│  [Cancel]     [Create Course]   │
└─────────────────────────────────┘
```

**Batch Create Dialog:**

```
┌─────────────────────────────────┐
│  Batch Create Courses           │
├─────────────────────────────────┤
│  Mode:                          │
│  ○ Single Course                │
│  ● Batch (Monthly)              │
│                                 │
│  Month:                         │
│  [February 2026  ▼]             │
│                                 │
│  → Saturdays found:             │
│     ✓ Feb 8  (new)              │
│     ✓ Feb 15 (new)              │
│     ✓ Feb 22 (new)              │
│                                 │
│  Dance Style:                   │
│  [Girls Kpop________]           │
│                                 │
│  Instructor:                    │
│  [Select instructor  ▼]         │
│                                 │
│  Time:         Duration:        │
│  [15:00]       [90 min]         │
│                                 │
│  Location:     Capacity:        │
│  [Studio A__]  [25]             │
│                                 │
│  [Cancel]     [Create 3 Courses]│
└─────────────────────────────────┘
```

#### 12.6.4 Scanner Page Updates

**Enhanced Scanner Interface:**

```
┌─────────────────────────────────┐
│  📷 QR Scanner                  │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │   [Camera View]         │   │
│  │                         │   │
│  │   [QR Detection Box]    │   │
│  │                         │   │
│  │   Position QR code      │   │
│  │   within frame          │   │
│  └─────────────────────────┘   │
│                                 │
│  Today's Course:                │
│  Girls Kpop • 3:00 PM           │
│  Checked in: 16/25              │
│                                 │
├─────────────────────────────────┤
│  Recent Check-ins (Today)       │
├─────────────────────────────────┤
│  3:05 PM - John Doe (Sub)       │
│  3:06 PM - Sarah Chen (Single)  │
│  3:08 PM - Mike Park (Drop-in)  │
│  3:10 PM - Lisa Wong (Sub)      │
│                                 │
├─────────────────────────────────┤
│  📅    📷    📊                  │
└─────────────────────────────────┘
```

**Success Feedback:**

```
┌─────────────────────────────────┐
│  ✓ Check-in Successful          │
├─────────────────────────────────┤
│  [Avatar] Sarah Chen            │
│                                 │
│  Girls Kpop - Today 3:00 PM     │
│  Type: Single (No subscription) │
│                                 │
│  Course Attendance: 17/25       │
│                                 │
│  [OK]                           │
└─────────────────────────────────┘
```

**Drop-in Confirmation (already shown in 12.4.1):**

### 12.7 Data & Analytics

#### 12.7.1 Admin Analytics

**Course-Specific Metrics:**
- Total courses created
- Average capacity utilization (booked/capacity)
- Average attendance rate (checked-in/booked)
- No-show rate per course
- Most popular dance styles
- Most popular time slots
- Instructor performance (attendance rates)

**Booking Analytics:**
- Total bookings this month/week
- Subscription vs single vs drop-in breakdown
- Cancellation rate
- Late cancellations (within 3 hours)
- Average booking lead time (days before course)

**Member Insights:**
- Most active members (courses attended)
- Booking patterns (early vs late bookers)
- Cancellation patterns per member
- Drop-in frequency

#### 12.7.2 Member Statistics

**Member Dashboard (Profile Page):**
- Total courses attended (all-time)
- Courses attended this month
- Upcoming bookings count
- Favorite dance style (most attended)
- Attendance streak (consecutive weeks)

**Course History:**
- List of past courses attended
- Date, dance style, instructor
- Check-in time
- Booking type (subscription/single/drop-in)

### 12.8 Business Rules Summary

#### 12.8.1 Booking Rules
1. Users must be authenticated to book courses
2. Users can book multiple upcoming courses simultaneously
3. Users cannot book the same course twice (one confirmed booking per user per course)
4. Bookings created immediately upon confirmation (no pending state)
5. Capacity enforced at booking time (database-level concurrency control)
6. Booking type automatically determined by subscription status at booking time
7. Past courses cannot be booked

#### 12.8.2 Cancellation Rules
1. Bookings can be cancelled up to 3 hours before course start time
2. Cancellations within 3-hour window not allowed (frontend and backend validation)
3. Cancelled bookings free up capacity immediately
4. Cancelled bookings cannot be reinstated (must create new booking)
5. No cancellation fees or penalties (policy managed outside system)

#### 12.8.3 Check-in Rules
1. Only admins can perform check-ins via QR scanner
2. Users must have confirmed booking OR admin approval (drop-in) to check in
3. Check-in creates booking automatically for drop-in users (with admin confirmation)
4. Duplicate check-ins for same course prevented
5. Duplicate check-ins for different courses same day allowed (with warning)
6. Admin can override capacity during check-in (with warning dialog)
7. Check-in records booking type for analytics

#### 12.8.4 Course Management Rules
1. Only admins can create, edit, delete courses
2. Courses cannot be deleted if bookings exist (safety measure)
3. Batch creation skips dates with existing courses
4. Instructor assignment optional (can be unassigned)
5. Course capacity adjustable by admin even after bookings exist
6. Past courses automatically marked 'completed' (future enhancement)

### 12.9 Technical Implementation Notes

#### 12.9.1 Timezone Handling

**Storage:**
- All timestamps stored in UTC (TIMESTAMPTZ in PostgreSQL)
- Supabase automatically handles UTC conversion

**Display:**
- All times displayed in Europe/Zurich timezone
- JavaScript: `Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich' })`
- PostgreSQL: `AT TIME ZONE 'Europe/Zurich'`

**Cancellation Window Calculation:**
```javascript
// Example calculation
const courseStartTime = new Date('2026-02-08T15:00:00+01:00'); // 3 PM Zurich
const cancellationDeadline = new Date(courseStartTime.getTime() - (3 * 60 * 60 * 1000));
const now = new Date();
const canCancel = now < cancellationDeadline;
```

**Critical Times:**
- Course start times stored as TIME type (hour:minute)
- Dates stored as DATE type (YYYY-MM-DD)
- Check-in timestamps stored as TIMESTAMPTZ (with timezone)

#### 12.9.2 Database Constraints

**Unique Constraints:**
- `(scheduled_date, start_time)` on courses - prevents double-booking time slots
- `(user_id, course_id, status)` WHERE status='confirmed' on bookings - prevents duplicate active bookings

**Check Constraints:**
- `capacity >= 0` - capacity must be non-negative
- `duration > INTERVAL '0'` - duration must be positive
- `start_time BETWEEN '00:00:00' AND '23:59:59'` - valid time range

**Foreign Key Constraints:**
- All foreign keys use appropriate cascade rules:
  - user_id in bookings → CASCADE DELETE (remove bookings when user deleted)
  - course_id in bookings → CASCADE DELETE (remove bookings when course deleted)
  - instructor_id in courses → SET NULL (keep course if instructor removed)

#### 12.9.3 Performance Considerations

**Indexing Strategy:**
- `scheduled_date` on courses - fast date range queries
- `(course_id, status)` on bookings - fast capacity calculations
- `(user_id, course_id)` on bookings - fast duplicate checks
- `course_id` on checkins - fast attendance queries

**Query Optimization:**
- Capacity calculation uses indexed COUNT with status filter
- Booking list queries use pagination (20 per page)
- Course list queries limited to next 90 days by default

**Caching:**
- Course list cached on frontend with revalidation on booking/cancellation
- Capacity recalculated on each booking attempt (cannot cache due to concurrency)
- Instructor list cached (updates infrequent)

### 12.10 Security Considerations

#### 12.10.1 Authorization

**Booking Authorization:**
- Users can only book for themselves (user_id from authenticated session)
- Admins can create bookings for any user (drop-in scenario)
- Booking cancellation requires ownership verification (user_id match or admin role)

**Course Management Authorization:**
- Only admins can create/edit/delete courses
- RLS policies enforce admin-only write operations
- Course viewing public to all authenticated users

**Check-in Authorization:**
- Only admins can perform check-ins
- Admin role verified server-side on every check-in request
- User attempting self-check-in rejected at API level

#### 12.10.2 Data Validation

**Input Validation:**
- Dance style: max 100 characters, trimmed
- Instructor selection: must reference existing instructor profile
- Date: must be future date (cannot create course in past)
- Time: valid HH:MM format (00:00 to 23:59)
- Duration: positive integer minutes
- Capacity: positive integer, max 1000 (safety limit)

**Business Logic Validation:**
- Booking: verify capacity available (atomic transaction)
- Cancellation: verify within 3-hour window
- Check-in: verify booking exists or admin approval
- Batch creation: verify Saturdays don't have existing courses

### 12.11 Migration Strategy

#### 12.11.1 Database Migration

**Schema Updates:**
1. Add new enums: booking_type, booking_status, course_status
2. Update user_role enum: add 'instructor'
3. Create courses table with indexes
4. Create bookings table with indexes
5. Alter checkins table: add course_id, booking_type columns (nullable for backward compatibility)
6. Create new database functions: create_course_booking(), cancel_course_booking(), perform_course_checkin()

**Data Migration:**
- No existing data migration needed (new feature)
- Existing check-ins remain valid (course_id NULL = non-course check-in)

#### 12.11.2 Frontend Changes

**New Pages:**
- `/courses` - Course browsing and booking (member)
- `/admin/courses` - Course management (admin)
- `/admin/courses/create` - Course creation form (admin)

**Updated Pages:**
- `/admin/scanner` - Enhanced with course context
- `/profile` - Add course attendance history section

**New Components:**
- CourseCard - Display course information
- CourseBookingDialog - Booking confirmation
- CourseCancellationDialog - Cancellation confirmation
- CourseCreationForm - Single/batch course creation
- DropInConfirmationDialog - Drop-in check-in approval
- CapacityOverrideDialog - Capacity override warning
- BookingsList - User's upcoming bookings
- CourseAttendanceList - Admin view of course check-ins

#### 12.11.3 Rollout Plan

**Phase 1: Infrastructure (Week 1)**
- Database schema updates
- Backend API endpoints
- Database functions and RLS policies

**Phase 2: Admin Features (Week 2)**
- Course creation UI (single and batch)
- Course management UI
- Updated scanner with course support

**Phase 3: Member Features (Week 3)**
- Course browsing UI
- Booking/cancellation flows
- Profile updates (attendance history)

**Phase 4: Testing & Launch (Week 4)**
- End-to-end testing
- Admin training
- Soft launch with first courses
- Monitor and iterate

### 12.12 Future Enhancements (Out of Current Scope)

#### Phase 2 Features
- **Automated Notifications**: Email/SMS for booking confirmations, reminders, cancellations
- **Waitlist System**: Automatic waitlist when course full, auto-promotion on cancellation
- **Recurring Course Templates**: Auto-create courses for next N weeks
- **Instructor Portal**: Limited login for instructors to view their courses and attendance
- **Member Reviews**: Allow members to rate courses and instructors
- **Multi-course Days**: Support multiple courses per day at different times
- **Class Series**: Link related courses (e.g., 4-week beginner program)
- **Payment Integration**: Online payment for single bookings
- **Mobile App**: Native iOS/Android for better course discovery and booking

#### Advanced Analytics
- Predictive attendance modeling
- Optimal capacity recommendations per style
- Member engagement scoring
- Automated instructor performance reports
- Revenue forecasting (when payment integrated)

---

## 13. Appendices

### 13.1 Glossary

| Term | Definition |
|------|------------|
| **Active Subscription** | Subscription with status 'active' and valid for check-ins |
| **Adult Member** | Default member type for all users, regardless of actual age |
| **Admin** | User with role 'admin', full system access |
| **Booking** | Reservation for a specific course, counts toward capacity |
| **Capacity** | Maximum number of participants allowed in a course |
| **Check-in** | Attendance record created when member's QR code is scanned |
| **Course** | Scheduled dance class on a specific date and time |
| **Depleted** | Subscription status when times card reaches 0 remaining credits |
| **Drop-in** | User who attends course without prior booking, added by admin during check-in |
| **Expired** | Subscription status when monthly card passes end date |
| **Instructor** | User with role 'instructor', assigned to teach courses |
| **Member** | User with role 'member', standard access level |
| **Monthly Card** | Time-based subscription valid for 30 days from start date |
| **RLS** | Row Level Security - Postgres feature for access control |
| **Single Booking** | Course booking by user without active subscription |
| **Student Member** | Member type 'student' after admin verification approval |
| **Subscription Booking** | Course booking by user with active subscription |
| **Times Card** | Usage-based subscription (5 or 10 check-ins) |
| **Verification** | Process of confirming student status via ID/card upload |

### 13.2 Acronyms

| Acronym | Full Term |
|---------|-----------|
| **API** | Application Programming Interface |
| **CLS** | Cumulative Layout Shift |
| **CRUD** | Create, Read, Update, Delete |
| **CSRF** | Cross-Site Request Forgery |
| **CSS** | Cascading Style Sheets |
| **CTA** | Call to Action |
| **FCP** | First Contentful Paint |
| **GDPR** | General Data Protection Regulation |
| **HTTP** | Hypertext Transfer Protocol |
| **HTTPS** | HTTP Secure |
| **JWT** | JSON Web Token |
| **LCP** | Largest Contentful Paint |
| **OAuth** | Open Authorization |
| **ORM** | Object-Relational Mapping |
| **PKCE** | Proof Key for Code Exchange |
| **PRD** | Product Requirements Document |
| **QR** | Quick Response (code) |
| **RDBMS** | Relational Database Management System |
| **RLS** | Row Level Security |
| **SQL** | Structured Query Language |
| **SSR** | Server-Side Rendering |
| **SSL** | Secure Sockets Layer |
| **TTI** | Time to Interactive |
| **UI** | User Interface |
| **UUID** | Universally Unique Identifier |
| **WCAG** | Web Content Accessibility Guidelines |
| **XSS** | Cross-Site Scripting |

### 13.3 References

#### Technical Documentation
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com)
- [React Hook Form](https://react-hook-form.com)
- [Zod Validation](https://zod.dev)

#### Project Files
- `README.md` - Setup and development guide
- `docs/spec.md` - Original feature specifications
- `docs/brandbook.md` - Design system and brand guidelines
- `docs/schema.sql` - Complete database schema
- `docs/storage-policies.sql` - Storage RLS policies

#### External Resources
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Core Web Vitals](https://web.dev/vitals/)

### 13.4 Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-06 | Development Team | Initial comprehensive PRD created from existing system |
| 1.1 | 2026-02-06 | Development Team | Added Course Booking & Attendance System (Section 12) |

### 13.5 Future Considerations (Out of Scope)

#### Phase 2 Features (Potential)
- **Payment Integration**: Online subscription and single course purchases
- **Multi-Location**: Support multiple studio locations
- **Mobile Apps**: Native iOS/Android applications
- **Email Notifications**: Automated emails for bookings, reminders, subscription expiry
- **SMS Notifications**: Text reminders for courses and cancellations
- **Reporting Dashboard**: Advanced analytics and export capabilities
- **Student Pricing**: Different pricing tiers for students vs adults
- **Waitlist Management**: Automatic waitlist and promotion system
- **Recurring Course Templates**: Auto-create courses for next N weeks
- **Instructor Portal**: Limited login for instructors to view courses
- **Member Reviews**: Course and instructor ratings
- **Multi-course Days**: Multiple courses per day at different times
- **Class Series**: Linked course sequences (e.g., 4-week programs)

#### Technical Improvements
- **QR Code Expiry**: Time-limited QR codes for enhanced security
- **Offline Mode**: PWA with offline check-in capability
- **Advanced Search**: Fuzzy search, autocomplete, filter combinations
- **Bulk Operations**: Bulk subscription assignment, bulk course creation
- **API Endpoints**: Public API for third-party integrations
- **Webhook Support**: Real-time notifications to external systems
- **Automated Course Completion**: Auto-mark courses as completed after end time
- **Predictive Analytics**: Attendance forecasting and capacity optimization

---

**End of Product Requirements Document**

**For questions or clarifications, contact the development team.**
