# Context
File name: 2025-12-16_2_code-quality-improvements.md
Created at: 2025-12-16
Created by: Assistant
Main branch: main
Task Branch: task/code-quality-improvements_2025-12-16_1
Yolo Mode: Off

# Task Description
Comprehensive code quality audit and improvements across the entire codebase. Check for and fix:
1. Structural and Organization Errors (Large files, Global variables, Inconsistent styles)
2. Redundancy and Maintenance Errors (Duplicate logic, Commented-out code, Outdated comments)
3. Resource and Performance Errors (Resource leaks, Poor performance)
4. Security and Data Errors (Loose constraints, Hallucinations, Missing validation, Hardcoded secrets)
5. Dependency Errors (Outdated/Zombie dependencies)

# Project Overview
Next.js 14 application with TypeScript, Supabase backend, and React components. The codebase includes authentication, profile management, admin tools, and QR code scanning features.

⚠️ WARNING: NEVER MODIFY THIS SECTION ⚠️
1.  **Stop and Think**: Always pause to analyze before acting.
2.  **Mode Declaration**: Start every response with the current mode (e.g., [MODE: RESEARCH]).
3.  **Task File Management**: Create and maintain a task file for every task.
4.  **Protocol Adherence**: Follow the defined steps for each mode (Research -> Innovate -> Plan -> Execute -> Review).
5.  **Code References**: Use correct citation format for existing code.
⚠️ WARNING: NEVER MODIFY THIS SECTION ⚠️

# Analysis

## Findings Summary

### 1. Structural and Organization Errors

**Large Files:**
- `src/app/profile/page.tsx`: 470 lines - Contains complex logic that should be extracted:
  - Date/timezone calculation helpers (lines 15-56)
  - Multiple sequential database queries
  - Complex streak calculation logic
  - Extensive JSX rendering
- Status: Within acceptable range (<800 lines) but could benefit from refactoring

**Global Variable Abuse:**
- No global variables found - Code properly uses module scoping and React hooks

**Inconsistent Styles:**
- Generally consistent camelCase naming
- Mixed use of single/double quotes (both acceptable in TypeScript)
- Consistent TypeScript usage throughout

### 2. Redundancy and Maintenance Errors

**Duplicate Logic:**
- No duplicate function versions (v1, v2, etc.) found
- Some repeated patterns in error handling that could be extracted to utilities

**Commented-Out Code:**
- No commented-out code blocks found - Good!

**Outdated Comments:**
- Comments appear to be up-to-date with code logic

**Console Statements (Production Pollution):**
- 38 instances of console.log/console.error found across:
  - `src/app/admin/actions.ts`: 6 instances
  - `src/app/profile/actions.ts`: 17 instances (including console.log for uploads)
  - `src/app/profile/page.tsx`: 3 instances
  - `src/components/admin/qr-scanner.tsx`: 1 instance
  - `src/components/profile/*.tsx`: 11 instances

### 3. Resource and Performance Errors

**Resource Leaks:**
- No obvious resource leaks detected
- Supabase clients properly scoped
- File uploads appear to handle cleanup

**Performance Issues:**
- `src/app/profile/page.tsx`: Multiple sequential database queries (lines 70-133) that could be parallelized
  - Query 1: Active subscription
  - Query 2: Profile
  - Query 3: Checkins for statistics
  - Query 4: Check-in history
  - Query 5: Subscription history
  - Query 6: Check-ins by subscription
- `src/app/admin/users/page.tsx` (lines 49-50): O(n²) complexity - nested find inside map:
  ```typescript
  const users = profiles.map((p) => {
    const sub = subscriptions?.find((s) => s.user_id === p.id)  // O(n) inside O(n)
    return { ...p, subscription: sub }
  })
  ```
- Client-side join could be done in database with proper JOIN query

### 4. Security and Data Errors

**Loose Constraints:**
- `src/components/auth/auth-form.tsx` (line 81): Basic email validation - only checks for '@'
  - Should use proper email regex or validation library
- Input validation exists but could be stricter in some areas

**Hallucinations (Wrong Constants):**
- No incorrect constants found

**Missing Validation:**
- Email validation is too basic
- Some server actions lack comprehensive input sanitization
- File upload validations exist but could be more robust

**Hardcoded Secrets:**
- ✅ No hardcoded secrets found - Properly using environment variables via `process.env.NEXT_PUBLIC_*`
- All Supabase credentials properly externalized

### 5. Dependency Errors

**Outdated/Zombie Dependencies:**
- All dependencies appear modern and actively maintained
- Next.js 14.2.15 (current)
- React 18 (current)
- Supabase SDK versions are recent
- No deprecated syntax patterns detected

# Proposed Solution

## Solution Approach

**1. Console Statement Removal**
- Remove all 38 console.log/console.error statements
- Replace critical error logging with proper error handling (error boundaries where appropriate)
- Keep only essential error handling that doesn't expose sensitive information

**2. Performance Optimizations**
- Fix O(n²) in admin/users/page.tsx: Use Map for O(1) lookups instead of nested find
- Parallelize sequential queries in profile/page.tsx using Promise.all()
- Extract streak calculation logic to utility module

**3. Input Validation Enhancement**
- Replace basic '@' check with proper email regex validation
- Add comprehensive validation using standard email regex pattern

**4. Code Organization**
- Extract date/timezone helpers to `src/lib/utils/date-helpers.ts`
- Extract streak calculation to `src/lib/utils/streak-calculator.ts`
- This reduces profile/page.tsx from 470 to ~350 lines

**5. Code Style**
- Standardize quotes will be skipped (both styles are acceptable in TypeScript/React)

# Current execution step: "2. Planning - Complete"

# Implementation Plan

## Phase 1: Create Utility Modules

### File: `src/lib/utils/date-helpers.ts`
**Purpose**: Extract date/timezone helper functions from profile/page.tsx
**Functions to create:**
- `getZurichYMD(date: Date): { y: number; m: number; d: number }`
- `isoDayOfWeekFromYMD(y: number, m: number, d: number): number`
- `ymdToDayNumberUTC(y: number, m: number, d: number): number`
- `dayNumberToYMDUTC(day: number): { y: number; m: number; d: number }`
- `weekStartKeyFromYMD(y: number, m: number, d: number): string`

### File: `src/lib/utils/streak-calculator.ts`
**Purpose**: Extract streak calculation logic from profile/page.tsx
**Functions to create:**
- `calculateStreakWeeks(checkins: Array<{ created_at: string }>): number`
  - Uses date helpers from date-helpers.ts
  - Implements the same streak calculation logic (consecutive weeks with check-ins, Monday start, Europe/Zurich timezone)

## Phase 2: Remove Console Statements

### File: `src/app/admin/actions.ts`
**Changes:**
- Line 24: Remove `console.error('Check-in error:', error)` - Keep error handling, remove console
- Line 60: Remove `console.error('Get member profile error:', error)` - Keep error handling, remove console
- Line 106: Remove `console.error('Assign sub error:', error)` - Keep error handling, remove console
- Line 166: Remove `console.error('Approve verification error:', updateError)` - Keep error handling, remove console
- Line 235: Remove `console.error('Reject verification error:', updateError)` - Keep error handling, remove console
- Line 305: Remove `console.error('Request re-verification error:', updateError)` - Keep error handling, remove console

### File: `src/app/profile/actions.ts`
**Changes:**
- Line 22: Remove `console.error('Auth error:', userError)` - Keep error handling, remove console
- Line 31: Remove `console.error('No base64 image data received')` - Keep error handling, remove console
- Line 49: Remove `console.error('Buffer conversion error:', bufferError)` - Keep error handling, remove console
- Line 75: Remove `console.log('Uploading to Supabase storage:', filePath, 'size:', imageBuffer.length)` - Remove completely
- Line 85: Remove `console.error('Supabase upload error:', JSON.stringify(uploadError, null, 2))` - Keep error handling, remove console
- Line 94: Remove `console.error('Upload returned no data and no error')` - Keep error handling, remove console
- Line 105: Remove `console.log('Got public URL:', publicUrl)` - Remove completely
- Line 113: Remove `console.error('Profile update error:', updateError)` - Keep error handling, remove console
- Line 127: Remove `console.error('Unexpected error in updateProfileAvatar:', error)` - Keep error handling, remove console
- Line 148: Remove `console.error('Auth error:', userError)` - Keep error handling, remove console
- Line 163: Remove `console.error('Profile fetch error:', profileError)` - Keep error handling, remove console
- Line 188: Remove `console.error('No base64 image data received')` - Keep error handling, remove console
- Line 206: Remove `console.error('Buffer conversion error:', bufferError)` - Keep error handling, remove console
- Line 233: Remove `console.log('Uploading student card to Supabase storage:', filePath, 'size:', imageBuffer.length)` - Remove completely
- Line 243: Remove `console.error('Supabase upload error:', JSON.stringify(uploadError, null, 2))` - Keep error handling, remove console
- Line 252: Remove `console.error('Upload returned no data and no error')` - Keep error handling, remove console
- Line 263: Remove `console.log('Got public URL:', publicUrl)` - Remove completely
- Line 275: Remove `console.error('Profile update error:', updateError)` - Keep error handling, remove console
- Line 289: Remove `console.error('Unexpected error in uploadStudentCard:', error)` - Keep error handling, remove console

### File: `src/app/profile/page.tsx`
**Changes:**
- Line 100: Remove `console.error("Check-in history fetch error:", checkinHistoryError)` - Keep error handling, remove console
- Line 122: Remove `console.error("Subscription history fetch error:", subscriptionsError)` - Keep error handling, remove console
- Line 132: Remove `console.error("Check-ins by subscription fetch error:", checkinsBySubError)` - Keep error handling, remove console

### File: `src/components/admin/qr-scanner.tsx`
**Changes:**
- Line 143: Remove `console.error('Scanner error:', error)` - Keep error handling, remove console

### File: `src/components/profile/student-verification-dialog.tsx`
**Changes:**
- Line 118: Remove `console.error('Error in handleUpload:', error)` - Keep error handling, remove console

### File: `src/components/profile/avatar-upload-dialog.tsx`
**Changes:**
- Line 120: Remove `console.log('Starting image crop...')` - Remove completely
- Line 122: Remove `console.log('Image cropped, blob size:', croppedBlob.size, 'type:', croppedBlob.type)` - Remove completely
- Line 140: Remove `console.log('Base64 conversion successful, length:', base64Data.length)` - Remove completely
- Line 147: Remove `console.error('FileReader error:', error)` - Keep error handling, remove console
- Line 153: Remove `console.log('Calling updateProfileAvatar...')` - Remove completely
- Line 155: Remove `console.log('Server action result:', result)` - Remove completely
- Line 163: Remove `console.error('Server action failed:', result.message)` - Keep error handling, remove console
- Line 167: Remove `console.error('Error in handleSave:', error)` - Keep error handling, remove console

## Phase 3: Performance Optimizations

### File: `src/app/admin/users/page.tsx`
**Changes:**
- Replace lines 49-55 (O(n²) pattern) with O(n) solution using Map:
```typescript
// Before:
const users = profiles.map((p) => {
  const sub = subscriptions?.find((s) => s.user_id === p.id)
  return { ...p, subscription: sub }
})

// After:
const subscriptionMap = new Map(
  (subscriptions || []).map((sub) => [sub.user_id, sub])
)
const users = profiles.map((p) => ({
  ...p,
  subscription: subscriptionMap.get(p.id) || null,
}))
```

### File: `src/app/profile/page.tsx`
**Changes:**
1. Remove date helper functions (lines 15-56) - will import from utils
2. Remove streak calculation logic - will import from utils
3. Parallelize database queries (lines 69-133) using Promise.all():
```typescript
// Replace sequential queries with parallel execution
const [
  { data: subscription },
  { data: profile },
  { data: checkins },
  { data: checkinHistoryData, error: checkinHistoryError },
  { data: subscriptionsData, error: subscriptionsError },
  { data: checkinsBySubData, error: checkinsBySubError },
] = await Promise.all([
  supabase.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "active").maybeSingle(),
  supabase.from("profiles").select("*").eq("id", user.id).single(),
  supabase.from("checkins").select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
  supabase.from("checkins").select("id, created_at, subscription_id, subscription:subscriptions(type)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
  supabase.from("subscriptions").select("id, type, status, start_date, end_date, total_credits, remaining_credits, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
  supabase.from("checkins").select("subscription_id").eq("user_id", user.id),
])
```
4. Replace inline streak calculation with function call:
```typescript
import { calculateStreakWeeks } from '@/lib/utils/streak-calculator'
const streakWeeks = calculateStreakWeeks(checkins || [])
```

## Phase 4: Input Validation Enhancement

### File: `src/components/auth/auth-form.tsx`
**Changes:**
- Line 81: Replace basic email validation with proper regex:
```typescript
// Before:
if (!formData.email.includes('@')) newErrors.email = "Invalid email address";

// After:
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(formData.email.trim())) {
  newErrors.email = "Invalid email address"
}
```

# Task Progress
[2025-12-16]
- Created task branch: task/code-quality-improvements_2025-12-16_1
- Completed comprehensive codebase analysis
- Identified 38 console statements across 5 files
- Found performance issues: O(n²) pattern in users page, sequential queries in profile page
- Identified validation gaps in email and input handling
- No critical security issues found (no hardcoded secrets)
- All dependencies appear current
- Status: RESEARCH COMPLETE

[2025-12-16]
- Created detailed implementation plan with specific file changes
- Defined 4 phases: Utility modules, Console removal, Performance optimization, Validation enhancement
- Status: PLAN COMPLETE

[2025-12-16]
- ✅ Created `src/lib/utils/date-helpers.ts` with 5 date/timezone helper functions
- ✅ Created `src/lib/utils/streak-calculator.ts` with streak calculation function
- ✅ Updated `src/app/profile/page.tsx`:
  - Removed date helper functions (lines 14-56)
  - Imported utilities from new modules
  - Parallelized 6 sequential database queries using Promise.all()
  - Replaced inline streak calculation with function call
  - Removed 3 console.error statements
  - Reduced file from 470 to ~360 lines
- ✅ Updated `src/app/admin/users/page.tsx`:
  - Replaced O(n²) map/find pattern with Map-based O(n) solution
- ✅ Updated `src/app/admin/actions.ts`:
  - Removed 6 console.error statements
- ✅ Updated `src/app/profile/actions.ts`:
  - Removed 17 console.log/console.error statements
- ✅ Updated `src/components/admin/qr-scanner.tsx`:
  - Removed 1 console.error statement
- ✅ Updated `src/components/profile/student-verification-dialog.tsx`:
  - Removed 1 console.error statement
- ✅ Updated `src/components/profile/avatar-upload-dialog.tsx`:
  - Removed 9 console.log/console.error statements
- ✅ Updated `src/components/auth/auth-form.tsx`:
  - Replaced basic email validation with proper regex pattern
- Status: EXECUTE COMPLETE - All checklist items completed

# Implementation Checklist

1. Create `src/lib/utils/date-helpers.ts` with date/timezone helper functions
2. Create `src/lib/utils/streak-calculator.ts` with streak calculation function
3. Update `src/app/profile/page.tsx`:
   - Remove date helper functions (lines 15-56)
   - Import date helpers and streak calculator
   - Replace sequential queries with Promise.all()
   - Replace inline streak calculation with function call
   - Remove 3 console.error statements
4. Update `src/app/admin/users/page.tsx`:
   - Replace O(n²) map/find pattern with Map-based O(n) solution
5. Update `src/app/admin/actions.ts`:
   - Remove 6 console.error statements
6. Update `src/app/profile/actions.ts`:
   - Remove 17 console.log/console.error statements
7. Update `src/components/admin/qr-scanner.tsx`:
   - Remove 1 console.error statement
8. Update `src/components/profile/student-verification-dialog.tsx`:
   - Remove 1 console.error statement
9. Update `src/components/profile/avatar-upload-dialog.tsx`:
   - Remove 9 console.log/console.error statements
10. Update `src/components/auth/auth-form.tsx`:
    - Replace basic email validation with proper regex pattern

# Final Review:
[To be filled after completion]
