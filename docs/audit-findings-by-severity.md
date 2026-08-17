# Audit — Detailed Findings by Severity

**Project:** The Rookie Dance Studio — Next.js 14 (App Router) + Supabase member/check-in/subscription app
**Audit type:** Technical quality audit (Accessibility, Performance, Theming, Responsive, Anti-Patterns, Security, Correctness)
**Status:** Documentation only — no files were modified by this audit.

---

## Scope & Method

- **136 source files** under `src/` (pages, server actions, components, hooks, lib, types) plus configs (`next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts`, `globals.css`).
- **25 SQL files** under `docs/` — `schema.sql`, `storage-policies.sql`, `storage-policies-student-cards.sql`, and all 22 files in `docs/migrations/`, read in chronological order (per CLAUDE.md, the latest migration for a given function is authoritative).
- **Tooling baseline:** `next lint` → clean (0 warnings/errors); `vitest run` → 31/31 tests pass; manual RLS/RPC analysis of every function and policy.
- **Verification:** critical security findings were re-checked line-by-line against the actual migration files and server-action sources; severity reflects the *effective* exploitability after the SQL layer's `is_admin()` guards and RLS policies were taken into account.

## Severity Legend

| Level | Meaning |
|-------|---------|
| **P0 — Blocking** | Exploitable security hole or data corruption; fix immediately, blocks release |
| **P1 — Major** | Significant security/accessibility/performance defect or WCAG AA violation; fix before release |
| **P2 — Minor** | Annoyance, workaround exists, or hardening gap; fix in next pass |
| **P3 — Polish** | Nice-to-fix, no real user impact; fix if time permits |

## Summary

| Severity | Count | Focus |
|----------|-------|-------|
| P0 | 2 | SQL authorization gaps (role escalation, subscription data exposure) |
| P1 | 16 | IDOR cluster, credit race, open redirect, broken PDF, poll×N+1, a11y contrast/keyboard, anti-pattern system |
| P2 | 24 | Defense-in-depth, PII in client bundle, token bypass, missing labels/descriptions, touch targets |
| P3 | ~30 | Copy/UX hygiene, duplication, drift, small logic and a11y nits |
| **Total** | **~72** | |

---

# P0 — Blocking (fix immediately)

## [P0] Self-service admin escalation via `profiles` UPDATE policy

- **Location:** `docs/schema.sql:103-104` — policy `"Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id)`
- **Category:** Security
- **Impact:** The policy has **no `WITH CHECK`** and **no column restriction**. Any authenticated user can `PATCH /rest/v1/profiles?id=eq.<own-uid>` with `{"role":"admin"}` — RLS passes because the row is their own. `is_admin()` (`schema.sql:86-94`) then returns true, unlocking **every** admin RPC (`perform_checkin`, `perform_course_checkin`, `assign_subscription`, `batch_create_courses`, `delete_course_checkin`) and every admin RLS policy. Full takeover of check-ins, subscriptions, course management, and member PII. Verified: no trigger or column-level grant anywhere in the migration history protects `role`; `handle_new_user` hardcodes `role='member'` at creation but nothing prevents later escalation.
- **Standard:** OWASP A01 (Broken Access Control)
- **Recommendation:** Add `WITH CHECK (auth.uid() = id)` **and** restrict UPDATE on `role` / `member_type` / `verification_status` (REVOKE UPDATE on those columns from `authenticated`, or move role mutations into a dedicated admin-only RPC). Add a trigger that blocks non-admin `role` changes.

## [P0] `find_usable_subscription` is an unauthenticated data-read RPC for arbitrary users

- **Location:** `docs/migrations/2026-04-04_1:39-76` (also called from `2026-08-10_1:81,180,204`)
- **Category:** Security
- **Impact:** `SECURITY DEFINER` + `SET row_security = off`, **no `auth.uid()` / `is_admin()` check in the body**, and **no GRANT restriction** (default PUBLIC EXECUTE). Any caller — including anonymous — can `rpc/find_usable_subscription` with a victim UUID and receive the victim's full `subscriptions` row: type, status, remaining credits, end dates, `assigned_by`. This is exactly the "must be gated" pattern CLAUDE.md flags for SECURITY DEFINER RPCs, and it is reachable by the whole app because it is invoked from inside `book_course` / `perform_course_checkin`.
- **Standard:** OWASP A01; Swiss FADP
- **Recommendation:** Guard the body (`IF auth.uid() <> p_user_id AND NOT is_admin() THEN RETURN NULL;`), then `REVOKE EXECUTE ON FUNCTION find_usable_subscription(UUID, UUID) FROM anon, public; GRANT EXECUTE ... TO authenticated`.

---

# P1 — Major (fix before release)

## [P1] `book_course` 3-arg overload: admin override + arbitrary `p_user_id` ungated

- **Location:** `docs/migrations/2026-08-10_1:29-102` (override param :31; capacity/time skip :54-68; duplicate check :70-76; no `is_admin()` anywhere)
- **Category:** Security
- **Impact:** The 3-arg overload (created `2026-04-04_1`) has default PUBLIC EXECUTE and no role check. Any member can call `rpc/book_course` with `p_is_admin_override: true` to skip the capacity and time-window checks (booking into full courses or after start), and can pass another user's UUID as `p_user_id` to create confirmed bookings for arbitrary users (IDOR).
- **Standard:** OWASP A01
- **Recommendation:** Require `is_admin()` when `p_is_admin_override` is true; enforce `p_user_id = auth.uid()` unless admin; restrict EXECUTE grants.

## [P1] `cancel_booking` IDOR — caller identity never verified

- **Location:** `docs/migrations/2026-02-07_1:28-53` (`WHERE id = p_booking_id AND user_id = p_user_id`; no `auth.uid()` comparison)
- **Category:** Security
- **Impact:** `SECURITY DEFINER`, default PUBLIC EXECUTE. Because `bookings` are publicly SELECT-able (see next finding), an attacker can enumerate a victim's `booking_id` + `user_id` and cancel their confirmed booking; the 24-hour window is the only barrier.
- **Standard:** OWASP A01
- **Recommendation:** Require `auth.uid() = p_user_id` in the function body (or convert to SECURITY INVOKER); revoke public EXECUTE.

## [P1] Public SELECT on `bookings` leaks every user's booking history

- **Location:** `docs/migrations/2026-02-19_1:9-11` — `CREATE POLICY "Anyone can view all bookings" ON bookings FOR SELECT USING (true)` (no `TO` clause → applies to `anon` too)
- **Category:** Security / Privacy
- **Impact:** Exposes `user_id`, `course_id`, `subscription_id`, timestamps for all users. The capacity-display goal does not justify raw rows; it also enables the `cancel_booking` IDOR above.
- **Standard:** OWASP A01; Swiss FADP
- **Recommendation:** Restore `auth.uid() = user_id` + admin policies; expose capacity via a count-only function.

## [P1] `profiles` public SELECT leaks PII

- **Location:** `docs/schema.sql:97-98` — `USING (true)`; leaked columns include `dob` (:27), `student_card_url` (:25), `rejection_reason` (:26), `phone_number` (added `2026-02-09_1:6-7`)
- **Category:** Security / Privacy
- **Impact:** Anonymous callers can read names, dates of birth, phone numbers, and the URL of each member's uploaded student-verification card (a document scan) plus rejection reasons. Phone numbers are PII under Swiss FADP.
- **Standard:** Swiss FADP; OWASP A01
- **Recommendation:** Restrict SELECT to `authenticated` + admin, or create a public view exposing only `id, full_name, avatar_url` and a private profile shape for everything else.

## [P1] Members can bypass `book_course` via direct `bookings` INSERT/UPDATE policies

- **Location:** `docs/migrations/2026-02-06_1:78-79` — `"Users can create own bookings" ... WITH CHECK (auth.uid() = user_id)`; `"Users can update own bookings" ... USING (auth.uid() = user_id)` with no `WITH CHECK`
- **Category:** Security / Correctness
- **Impact:** Direct INSERT of `confirmed` bookings bypasses the capacity check and subscription detection in `book_course` (overbooking). The UPDATE policy's missing `WITH CHECK` lets a member rewrite `user_id`, `booking_type`, and `subscription_id` on their rows.
- **Recommendation:** Route all writes through `book_course` / `cancel_booking`; drop or harden these policies (`WITH CHECK` on the UPDATE if retained).

## [P1] Credit double-spend race in both check-in functions

- **Location:** `docs/migrations/2026-08-10_1:249-258` (`perform_course_checkin`), `2026-03-05_1:181-186` (`perform_checkin`)
- **Category:** Correctness
- **Impact:** The subscription row is read without `FOR UPDATE` and the decrement has no `WHERE remaining_credits > 0`. Two concurrent scans — and duplicate course check-ins are explicitly allowed by design (`2026-02-06_6`) — can both pass the `<= 0` guard at `remaining_credits = 1` and both decrement: **−1 credits and two check-in records**. Financial-record corruption, not just an edge case.
- **Recommendation:** Conditional decrement `UPDATE subscriptions SET remaining_credits = remaining_credits - 1 ... WHERE id = v_sub.id AND remaining_credits > 0` and check rowcount / `FOUND`, returning "No remaining credits" when 0 rows affected.

## [P1] Open redirect via backslash/control-character bypass in callback URL validation

- **Location:** `src/app/auth/actions.ts:8-13` (`isValidCallbackUrl`), used at `:32-35` and `:114`
- **Category:** Security
- **Impact:** The guard accepts any string starting with `/` that isn't literally `//`. Browsers normalize `\` to `/` and strip tab/CR/LF during URL parsing, so `callbackUrl=/\evil.com` (or `/\t/evil.com`) passes and `redirect(callbackUrl)` issues a Location header the browser resolves to `https://evil.com` — a classic CWE-601 phishing vector. (The `origin + next` construction in `callback/route.ts:24` is safe; the raw-value `redirect()` in the login action is the exposure.)
- **Standard:** CWE-601, OWASP A01
- **Recommendation:** Replace the string check with a URL parse: `const u = new URL(path, requestOrigin)` and require `u.origin === requestOrigin`. Apply to both `isValidCallbackUrl` and `isSafeNext` (`src/app/auth/callback/route.ts:5-7`).

## [P1] PDF download produces white-on-white output (feature broken)

- **Location:** `src/components/legal/pdf-download-button.tsx:26-33` (clone styling) interacting with `terms-content.tsx:3,6` and `privacy-content.tsx:3,21` (`text-white` / `text-white/90`)
- **Category:** Correctness
- **Impact:** The clone gets inline `backgroundColor: 'white'` + `color: 'black'`, but the cloned content's own Tailwind `text-white` classes override inheritance; html2canvas rasterizes **white text on a white background** — every Terms/Privacy PDF download is unreadable. This defeats the component's sole purpose.
- **Recommendation:** Use html2canvas's `onclone` callback to force dark foregrounds on the clone, or build the PDF textually with jsPDF (selectable text, far smaller file). Verify by opening a generated PDF.

## [P1] jspdf + html2canvas (~600KB) eagerly bundled for every legal-page visitor

- **Location:** `src/components/legal/pdf-download-button.tsx:5-6`; deps at `package.json:31-32`
- **Category:** Performance
- **Impact:** `import { jsPDF } from 'jspdf'` and `import html2canvas from 'html2canvas'` at module top of a client component used on `/terms` and `/privacy` — ~600KB shipped to every visitor even though almost nobody clicks "Download as PDF". Legal pages are the longest prose on the slowest-mobile target.
- **Standard:** Web Vitals (LCP/INP); bundle budget
- **Recommendation:** `const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])` inside `generatePDF()`; optionally `next/dynamic` with `ssr: false` for the whole button.

## [P1] 10-second full-page polling multiplied by an N+1 query loop

- **Location:** `src/components/courses/courses-page-client.tsx:39-45` (`router.refresh()` every 10s) × `src/app/courses/actions.ts:50-84` (per course: confirmed-bookings count + check-ins count + user-booking query) + per-booking `canCancelBooking` RPC (`src/app/courses/page.tsx:96-99`)
- **Category:** Performance
- **Impact:** ~60+ Supabase round-trips **every 10 seconds per open member session** — data usage, battery drain, and full-list re-render jank on mobile. The user-booking query also duplicates what `getUserBookings()` already loads (`courses/page.tsx:93`).
- **Recommendation:** Embedded aggregates in one select (`bookings(count)`, `checkins(count)` via view/RPC), fetch user bookings once and build the map client-side; gate the poll on `document.visibilityState` or replace it with a Supabase Realtime subscription on capacity.

## [P1] Subscription usability filter not applied — diverges from the documented rule

- **Location:** `src/app/courses/page.tsx:87-92` and `src/app/profile/page.tsx:43-48` (both `.eq('status','active')`); canonical filter per CLAUDE.md and `find_usable_subscription` (`docs/migrations/2026-04-04_1:62-70`)
- **Category:** Logic
- **Impact:** The booking dialog can promise "You will book with your subscription" for a card still flagged `active` but with 0 credits or an elapsed `end_date` — and `book_course` will then reject it. Profile shows "ACTIVE · 0/5 sessions left" for effectively dead cards. Meanwhile the TS `usableSubscriptionFilter` (`src/app/admin/scanner/actions.ts:57-61`) omits `status <> 'depleted'` for times cards, and the TS linked-sub check (`:171-174`) ignores `status` — so there are **three subtly different "usable" definitions** in the codebase.
- **Recommendation:** Mirror the SQL filter in both pages (or call the RPC); reconcile the TS filter with `find_usable_subscription` so CLAUDE.md's "keep in sync" rule holds.

## [P1] Form labels not programmatically associated + focus indicators explicitly disabled

- **Location:** `src/components/auth/auth-input.tsx:14,23-32` (label without `htmlFor`, input without `id`); DOB/phone in `src/components/auth/auth-form.tsx:237,285`; `focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0` at `auth-form.tsx:247,297` and `src/app/reset-password/page.tsx:105,126`
- **Category:** Accessibility
- **Impact:** Screen readers announce unlabeled inputs; tapping a label doesn't focus the field; keyboard users get **no visible focus cue** on several fields. Affects every login/register/reset field rendered via these components.
- **Standard:** WCAG 1.3.1, 4.1.2 (labels); 2.4.7 (focus visible, AA)
- **Recommendation:** Unique `id` + `htmlFor` on each label (or wrap the input); restore `focus-visible:ring-2 focus-visible:ring-ring`.

## [P1] Gradient headings end in dark `rookie-purple` — ~2.6:1 contrast

- **Location:** ~20 headings, e.g. `src/app/login/page.tsx:20`, `register/page.tsx:23`, `courses/page.tsx:35,73`, `profile/page.tsx:157`, `faq/page.tsx:33`, `member-bottom-nav.tsx:59-61` (active nav label), `legal-page-layout.tsx:40`, `admin/page.tsx:53,158,224,238,257,276,300`
- **Category:** Accessibility / Theming
- **Impact:** `to-rookie-purple` (`#5A448A`) against black ≈ **2.63:1** — below the 3:1 large-text floor — so the tail of every heading, including the primary navigation's active label, is illegible for low-vision users. Gradient text also defeats forced-colors overrides.
- **Standard:** WCAG 1.4.3 (AA), 1.4.10
- **Recommendation:** End gradients at a light stop (`rookie-blue` ≈ 10:1) or use solid `text-foreground`; reserve gradient text for the brand wordmark only.

## [P1] Non-focusable dialog triggers: plain `<div>` instead of `<button>`

- **Location:** `src/app/admin/page.tsx:167-179,188-200,205-217,230-244` (stat/nav card triggers); `src/app/profile/page.tsx:169-180` (member QR trigger via `qr-code-display.tsx:37-43`)
- **Category:** Accessibility
- **Impact:** `DialogTrigger asChild` (Radix Slot) merges `onClick` but adds no `role="button"`, `tabindex`, or key handling to a non-button child. Dashboard stat cards and the member QR code — a core check-in feature — are unreachable by keyboard and screen-reader users.
- **Standard:** WCAG 2.1.1 (Keyboard), 4.1.2 (Name/Role/Value)
- **Recommendation:** Real `<button type="button">` triggers (or `role="button"` + `tabIndex={0}` + Enter/Space handler) with `:focus-visible` styling.

## [P1] Glassmorphism + gradient-text system (the two loudest AI-slop tells)

- **Location:** ~25 glass surfaces, e.g. `auth-form.tsx:205-209`, `courses/page.tsx:31-33`, `admin/page.tsx:169,190,207,232,251,270,289`, `users-table.tsx:72,122,142`, `member-bottom-nav.tsx:34`, `settings/page.tsx` (~10 surfaces), `faq-content.tsx:352,382`; gradient headings in 8+ files (see contrast finding above)
- **Category:** Anti-Pattern / Performance
- **Impact:** `backdrop-blur` sits on **solid black** — there is nothing behind it to blur, so it is pure GPU compositing cost (especially all course cards simultaneously) with zero visual payoff. The identical copy-pasted chrome (`bg-black/40 backdrop-blur-2xl border-white/20 rounded-[30px] shadow-2xl` + glossy hairline + blur glow blob) reads as template. The single strongest "AI made this" signal in the app.
- **Recommendation:** Flat `bg-card` for content surfaces; keep at most one glass moment; solid token-colored headings. Map to `/quieter`.

## [P1] TS server actions lack explicit admin checks (defense-in-depth gap)

- **Location:** `updateCourse`/`deleteCourse` (`src/app/admin/courses/actions.ts:68-111`), `batchCreateCourses` (:44-66), `manualCheckin` (:158-184), `deleteCheckin` (:141-156), `checkInUser` (`src/app/admin/actions.ts:8-32`), `assignUserSubscription` (:101-130), `performCourseCheckin` (`src/app/admin/scanner/actions.ts:301-348` and duplicate `src/app/admin/scanner/checkin-actions.ts:30-59`); PII reads `getMemberProfile`, `getCheckinContext` (`scanner/actions.ts:83-210`), `getUserActiveSubscription` (:271-297), `searchUsers`, `getCourseDetails`
- **Category:** Security
- **Impact:** These actions are auth-only or completely unchecked. **Verified mitigation:** the SQL layer backstops all of them today — `perform_checkin` checks `is_admin()` (`2026-03-05_1:140`), `assign_subscription` (`schema.sql:170`), `batch_create_courses` (`2026-02-07_2:26`), `delete_course_checkin` (`2026-04-04_2:20`), `perform_course_checkin` (`2026-08-10_1:135`), and course RLS (`2026-02-06_1:72-74`). So not exploitable now — but the TS layer must not depend on implicit RLS: a future RLS edit silently opens all of these. Raw Supabase error messages also surface to the client (`admin/actions.ts:27,67,125,184,252,321`).
- **Recommendation:** Add a shared `requireAdmin()` helper (getUser + role query) at the top of every admin action and PII read; return generic error messages and log details server-side.

---

# P2 — Minor (fix in next pass)

## [P2] Finance client component fetches `phone_number` from the browser

- **Location:** `src/components/admin/checkins-finance-card.tsx:66,75-81`
- **Category:** Security / Privacy
- **Impact:** Uses the browser Supabase client to query `checkins` + `profiles(phone_number)`. The page role-check doesn't protect this exact query — it runs with the user's token client-side and is RLS-reliant; combined with the public `profiles` SELECT (P1), phone numbers are reachable. PII under Swiss FADP.
- **Recommendation:** Move to a server action returning an aggregated/redacted shape; never select `phone_number` into a client bundle.

## [P2] Hard-coded Google Sheets "anyone with link" URL with owner `ouid`

- **Location:** `src/components/admin/checkins-finance-card.tsx:126-134`
- **Category:** Security
- **Impact:** `usp=sharing` + a live spreadsheet ID + `ouid=112848159860136796283` (the owner's Google account ID) shipped in the client bundle; finance data may be world-readable.
- **Recommendation:** Restrict share to the studio domain/org, drop the `ouid`, treat the URL as config rather than a JSX literal.

## [P2] Users page loads the entire `profiles` and `subscriptions` tables

- **Location:** `src/app/admin/users/page.tsx:26-28` (`select("*")`, no pagination/limit); search filtered client-side per keystroke (`users-table.tsx:42-45`)
- **Category:** Performance
- **Impact:** Breaks down at scale (every member's full profile + subscription row, every visit).
- **Recommendation:** Server-side `ilike` + `range()` pagination, or at least a `limit`.

## [P2] `loadAttendanceCount` fetches full check-in rows just to count

- **Location:** `src/components/admin/scanner/course-qr-scanner.tsx:88-92` + `getCourseCheckins` (`src/app/admin/scanner/actions.ts:241-265`)
- **Category:** Performance
- **Impact:** Fetches every check-in **with user joins** on every course selection and after every check-in, then computes `data.length`.
- **Recommendation:** `select('id', { count: 'exact', head: true })`.

## [P2] Full page reloads after delete/edit instead of `router.refresh()`

- **Location:** `src/components/admin/courses/courses-table.tsx:87` (`window.location.reload()` after delete) and `:185,291` (edit success)
- **Category:** Performance
- **Impact:** Blows away client state and refetches everything; the server actions already `revalidatePath`.
- **Recommendation:** `useRouter().refresh()`.

## [P2] SECURITY DEFINER functions missing `SET search_path`

- **Location:** `schema.sql:86-94` (`is_admin`), `:157-210` (`assign_subscription`), `2026-02-06_1:84-93` (`get_course_booking_count`), `2026-02-07_1:7-25` (`can_cancel_booking`), `2026-02-07_1:28-53` (`cancel_booking`), `2026-02-07_2:6-75` (`batch_create_courses`), `2026-03-05_1:130-198` (`perform_checkin`), `2026-03-05_1:203-212` (`expire_past_monthly_subscriptions`)
- **Category:** Security
- **Impact:** Violates the repo's own convention (CLAUDE.md) — resolution depends on caller `search_path`. Exploitability is low (Supabase roles can't create schemas) but it is fragile and inconsistent with the hardened functions.
- **Recommendation:** Add `SET search_path = public, pg_temp` to all of them.

## [P2] `expire_past_monthly_subscriptions` is an ungated global write RPC — and never scheduled

- **Location:** `docs/migrations/2026-03-05_1:203-212`
- **Category:** Security / Operations
- **Impact:** SECURITY DEFINER, no role check, no GRANT restriction (idempotent today, but a write RPC with no gate). No pg_cron job exists anywhere in the migration history, so expired monthlies only flip lazily when a check-in touches them — expired-but-`active` rows still occupy the `one_active_sub_per_user` slot and pass `book_course`'s `status='active'` gate.
- **Recommendation:** Add an `is_admin()` guard and create the pg_cron schedule explicitly.

## [P2] `can_cancel_booking` compares a naive Zurich timestamp against a timestamptz

- **Location:** `docs/migrations/2026-02-07_1:14-23` (same pattern since `2026-02-06_1:102-111`)
- **Category:** Correctness
- **Impact:** `v_current_time := NOW() AT TIME ZONE 'Europe/Zurich'` is a naive `timestamp`; `v_deadline` is `timestamptz`. The comparison casts the naive value with the session TimeZone (UTC on Supabase), shifting the 24-hour cancellation window by the UTC offset (1h CET / 2h CEST) — cancellations get blocked earlier than the policy intends.
- **Recommendation:** Compute both sides as timestamptz (`v_current_time := NOW()`).

## [P2] `book_course` / `perform_course_checkin` never check `courses.status`

- **Location:** `docs/migrations/2026-08-10_1:46-76` and `139-142`
- **Category:** Correctness
- **Impact:** Only time and capacity are validated; a `cancelled` or `completed` course can still be booked and checked into. The UI filters by `status='scheduled'`, but the RPCs do not.
- **Recommendation:** Add `AND status = 'scheduled'` to the course fetch.

## [P2] No `<h1>` on any authenticated member page or the admin dashboard

- **Location:** `src/app/courses/page.tsx:35`, `src/app/profile/page.tsx:157`, `src/app/settings/page.tsx:58`, `src/app/admin/page.tsx` (h2s at :158,224)
- **Category:** Accessibility
- **Impact:** Documents open their outline at `<h2>`; heading levels are skipped; screen-reader users get no top-level page title.
- **Standard:** WCAG 1.3.1
- **Recommendation:** Add a single `<h1>` per page; demote section titles to `<h2>`/`<h3>`.

## [P2] Missing / suppressed `DialogDescription` on several dialogs

- **Location:** `src/components/profile/qr-code-display.tsx:44`, `subscription-history-dialog.tsx:58`, `checkin-history-dialog.tsx:54` (`aria-describedby={undefined}`); `finance-summary-dialog.tsx:64`, `user-stats-dialog.tsx:28`, `today-checkins-dialog.tsx:32`, `active-subscriptions-dialog.tsx:33` (no description at all); `qr-scanner.tsx:206`, `course-qr-scanner.tsx:313`
- **Category:** Accessibility
- **Impact:** Screen readers announce only the title; the QR dialog's instruction ("Show this code to the instructor for check-in") is never announced.
- **Standard:** WCAG 4.1.2
- **Recommendation:** Use `<DialogDescription>` (visually hidden if needed) instead of `aria-describedby={undefined}`; add one-line descriptions to the four admin dialogs.

## [P2] Icon-only buttons and footer icon links lack accessible names

- **Location:** `src/app/settings/page.tsx:112-114,140-142` (pencil buttons, icon only); `src/components/footer.tsx:27,50,68` (email/Instagram/Rednote links — text `hidden sm:inline`, SVG has no `role="img"`/`aria-label`)
- **Category:** Accessibility
- **Impact:** Screen readers announce unnamed buttons/links (or nothing on mobile where the text is hidden).
- **Standard:** WCAG 2.4.4, 4.1.2
- **Recommendation:** `aria-label` on each (plus `aria-hidden="true"` on the SVGs) and padding for hit area.

## [P2] Payment-method buttons expose no selected state to assistive tech

- **Location:** `src/components/admin/qr-scanner.tsx:262-275`, `scanner/course-qr-scanner.tsx:473-487`, `scanner/drop-in-dialog.tsx:233-247`, `scanner/capacity-override-dialog.tsx:236-250`, `courses/add-checkin-dialog.tsx:169-183`
- **Category:** Accessibility
- **Impact:** Selection conveyed only by `bg-primary` vs `bg-white/5`; no `aria-pressed`, no radiogroup semantics, no group label. Screen-reader users cannot tell which option is selected.
- **Standard:** WCAG 1.3.1, 4.1.2
- **Recommendation:** Radix `RadioGroup`, or `aria-pressed` + a visually-hidden group label (`aria-label="Payment method"`).

## [P2] Tap targets below 44px (systemic)

- **Location:** pencil buttons 24–32px (`settings/page.tsx:112-114,140-142`); `size="sm"` row buttons ≈36px (`users-table.tsx:202-221`, `courses-table.tsx:175-205`); quick-check-in method buttons ≈24–28px (`course-details-dialog.tsx:232-256`); inline "Forgot Password?"/toggle text buttons ≈16–20px (`auth-form.tsx:330-339,374-394`); TOC entries ≈20px (`table-of-contents.tsx:57-64`); footer icons ≈20px (`footer.tsx`)
- **Category:** Responsive / Accessibility
- **Impact:** Frequent mis-taps on phones; the smallest targets sit at or below the WCAG 2.5.8 24px minimum.
- **Standard:** WCAG 2.5.8 (Target Size, AA); Apple HIG 44px
- **Recommendation:** `min-h-11` (44px) on all touch controls; expand the tiny inline payment buttons into full-height segmented controls.

## [P2] Light-surface cards inside the dark theme

- **Location:** `src/app/profile/page.tsx:196` (Current Plan `bg-white/80 border-gray-100 text-gray-900`), `:245` (`bg-gray-200` progress track), `:278,289` (stat cards `bg-white/80 ... text-black`)
- **Category:** Theming
- **Impact:** Near-white cards sit directly next to `bg-white/10` glass cards — jarring inconsistency, no token use.
- **Recommendation:** Use `bg-card` / `text-card-foreground` tokens consistently.

## [P2] Hard-coded colors bypassing design tokens (systemic)

- **Location:** `bg-black`, `text-white/α`, `border-white/α`, `bg-white/5`, raw `rgba` glows in ~25 files across auth/member/admin/legal (e.g. `admin/page.tsx:169,190,207,232,251,270,289`, `courses/page.tsx:27,32`, `footer.tsx:3`, `legal-page-layout.tsx:23,25,43,46,59`)
- **Category:** Theming
- **Impact:** Tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) exist in `globals.css` but are bypassed; any future theme change (light mode, contrast mode, rebrand) must touch dozens of one-off values. `darkMode: ["class"]` is configured with no `.dark` block — dark-only by accident of omission.
- **Recommendation:** Replace page-level `bg-black` → `bg-background`, `text-white/α` → `text-foreground/α`, glass cards → `bg-card`, and delete redundant absolute `bg-black` layers.

## [P2] Badge variants use raw Tailwind palette instead of brand tokens

- **Location:** `src/components/ui/badge.tsx:12-26` — `green-500/20`, `red-500/20`, `orange-500/20`, `purple-500/40`, `pink-500/40`, `cyan-500/40` mixed with `rookie-blue`
- **Category:** Theming
- **Impact:** Color semantics drift from the brand and can't be themed.
- **Recommendation:** Map variants to `rookie-*` tokens (or semantic `success`/`danger`/`warning` tokens) at the same opacities.

## [P2] 3-column admin stat grid overflows at small widths

- **Location:** `src/app/admin/page.tsx:161` — `grid grid-cols-3 gap-4` with `p-5` cards and `text-3xl` numbers
- **Category:** Responsive
- **Impact:** Each card ≈90px at 320–360px viewports; labels/numbers risk truncation or overflow, and it fails at 200% zoom.
- **Recommendation:** `grid-cols-1 sm:grid-cols-3` (or `text-2xl` + `min-w-0`).

## [P2] Sticky FAQ search defeated by `overflow-hidden` on `<main>`

- **Location:** `src/app/faq/page.tsx:16` (`overflow-hidden`) vs `src/components/legal/faq-content.tsx:352` (`sticky top-0`)
- **Category:** Correctness
- **Impact:** `position: sticky` sticks to the nearest scroll container; the non-scrolling `<main>` becomes that container, so the search bar scrolls away instead of pinning — silently breaking the intended UX on the longest page in the app.
- **Recommendation:** `overflow-x-hidden` (or remove `overflow-hidden`) on `faq/page.tsx:16`.

## [P2] FAQ search input unlabeled, placeholder ~3.1:1 contrast

- **Location:** `src/components/legal/faq-content.tsx:352-363`
- **Category:** Accessibility
- **Impact:** No `<label>`/`aria-label`/`role="search"`; placeholder-only hint that disappears on typing, at `placeholder:text-white/40` ≈ 3.1:1.
- **Standard:** WCAG 1.3.1, 3.3.2, 1.4.3
- **Recommendation:** Add `aria-label="Search questions"`; bump placeholder to `white/60`+.

## [P2] TOC toggle missing `aria-expanded` / `aria-controls`

- **Location:** `src/components/legal/table-of-contents.tsx:41-50`
- **Category:** Accessibility
- **Impact:** The mobile TOC toggle flips `hidden`/`block` with no state exposed to assistive tech.
- **Standard:** WCAG 4.1.2
- **Recommendation:** Add `aria-expanded={isOpen}` + `aria-controls`/`id` wiring.

## [P2] html2canvas `scale: 2` on very long documents → memory blow-up; clone leaked on failure

- **Location:** `src/components/legal/pdf-download-button.tsx:36-44`
- **Category:** Performance
- **Impact:** The Terms/Privacy clone at 210mm ≈ 794px wide × `scale:2` ≈ 1,588px × (6,000–10,000px tall) = a 40–60MB+ canvas that frequently crashes low-end phones — the app's primary audience. `removeChild(clone)` (:44) only runs on success, so a thrown html2canvas leaves a ghost `position:absolute` clone in the DOM.
- **Recommendation:** `scale: 1`–`1.5`, cap with `windowHeight` slicing, move `removeChild` into a `finally`.

## [P2] `CourseSelector` calls parent `setState` during render

- **Location:** `src/components/admin/scanner/course-selector.tsx:41-44`
- **Category:** Anti-Pattern
- **Impact:** Updating another component during render is forbidden by React and may warn or misbehave when `courses.length === 1`.
- **Recommendation:** Move auto-select into the parent's `useEffect` (as `course-qr-scanner.tsx:73-77` already does).

## [P2] Two near-duplicate `performCourseCheckin` server actions (drift risk)

- **Location:** `src/app/admin/scanner/actions.ts:301-348` (with `paymentMethod`) vs `src/app/admin/scanner/checkin-actions.ts:30-59` (without, plus `revalidatePath`)
- **Category:** Maintainability / Security
- **Impact:** Two copies of a security-sensitive mutation diverge (one lacks `revalidatePath`); a fix applied to one silently misses the other.
- **Recommendation:** Consolidate into one action.

## [P2] Raw Supabase error messages returned to the client

- **Location:** `src/app/admin/actions.ts:27,67,125,184,252,321`, `src/app/admin/courses/actions.ts:151`, `src/app/admin/scanner/actions.ts:325-329`
- **Category:** Security / UX
- **Impact:** Internal DB/SQL details surface in user-facing toasts.
- **Recommendation:** Map to generic messages; log the full error server-side only.

---

# P3 — Polish (fix if time permits)

## [P3] Signup stores an unvalidated `phone_number`
- **Location:** `src/app/auth/actions.ts:61-67,123` — Security/robustness — Any string lands in `user_metadata`; no server-side phone regex (client has none either). Add a basic phone format check.

## [P3] Signup always redirects to `/verify-email` even when a session already exists
- **Location:** `src/app/auth/actions.ts:134-135` — Robustness — If email confirmation is disabled in Supabase, `signUp` returns a session and the user is still parked on the verification page. Check `data.session` and redirect to `/profile` when present.

## [P3] Two forgot-password implementations; the server action is dead code
- **Location:** `src/app/auth/actions.ts:138-156` (`resetPassword`) wired at `auth-form.tsx:77` but the handler always takes the client PKCE path (`auth-form.tsx:161-174`) — drift risk. Delete one.

## [P3] `/auth/debug` is a public route exposing session/env details
- **Location:** `src/middleware.ts:17` + `src/app/auth/debug/page.tsx` — Security — Prints user email, truncated tokens, and env values to any visitor. Gate to dev builds (`NODE_ENV !== 'production'`) or an admin role check.

## [P3] `NEXT_PUBLIC_SITE_URL` falls back to `http://localhost:3000` in production emails
- **Location:** `src/app/auth/actions.ts:113,146`; `auth-form.tsx:163` — Security/Operations — Verification/reset emails from production point users at localhost with no error. Fail fast at build/deploy when unset.

## [P3] "Request New Link" CTA sends users to account creation
- **Location:** `src/app/auth/auth-code-error/page.tsx:56-63` (`href="/register"`, label "Request New Link") — Robustness/UX — A user with an expired verification link is taken to signup; the label promises a new email that never arrives. Point at `/login` (or a real resend endpoint).

## [P3] Reset-password page has no session guard
- **Location:** `src/app/reset-password/page.tsx:40-50` — Robustness — A session-less visit shows an "Auth session missing!" toast; redirect to `/login` with a reason instead.

## [P3] No `<h1>` on the reset-password page
- **Location:** `src/app/reset-password/page.tsx:82` (card title is an `h2`) — A11y — Add an `h1` or visually-hidden `h1`.

## [P3] Decorative SVGs / sparkles exposed to assistive tech
- **Location:** `src/components/auth/sparkle.tsx:17-39`, `src/app/settings/page.tsx:283,291,345,353,365,373` — A11y — Add `aria-hidden="true" focusable="false"` to decorative icons.

## [P3] Decorative layer ignores `prefers-reduced-motion`
- **Location:** `floating-elements.tsx` (spin/pulse/float from `globals.css:105-130`) — A11y/Perf — Add a `@media (prefers-reduced-motion: reduce)` kill-switch; also gate the profile page's perpetual decorative animation (`profile/page.tsx:138`).

## [P3] `placeholder-white/30` ≈ 2.5:1
- **Location:** `src/components/auth/auth-input.tsx:28`, `reset-password/page.tsx:104,126` — A11y — Placeholders are supplementary but nearly invisible; `••••••••` conveys nothing. Raise to `white/50+`.

## [P3] `transition-all duration-300` on inputs and cards
- **Location:** `src/components/auth/auth-input.tsx:30`, `course-card.tsx:44`, `member-bottom-nav.tsx:34` — Perf — Animates paint properties; use `transition-colors`/`transition-transform`; progress bar animates inline `width` (`profile/page.tsx:245-263`) — use `transform: scaleX`.

## [P3] `dangerouslySetInnerHTML` for FAQ answers
- **Location:** `src/components/legal/faq-content.tsx:390` — Correctness/security-hygiene — Safe only while answers are static; becomes an XSS sink the moment content is dynamic. Prefer structured content nodes if it ever changes.

## [P3] PDF error handling uses `alert()` and no live region
- **Location:** `src/components/legal/pdf-download-button.tsx:71-76` — A11y — Use a sonner toast (already a dependency) and `aria-live="polite"` on the "Generating PDF…" state.

## [P3] Streak resets to 0 at the start of every week until the first check-in
- **Location:** `src/lib/utils/streak-calculator.ts:40-48` — Correctness — A user with 10 consecutive weekly check-ins sees 0 on Monday morning. Decide semantics explicitly (count from latest check-in week backwards) and label it in the UI.

## [P3] `compressImage` transparency handling only covers PNG
- **Location:** `src/lib/utils/image-compression.ts:69-72` — Correctness — A transparent WebP composites to **black** on JPEG conversion; also no default `maxWidth/maxHeight`, so 12MP photos decode at full size. Fill white for any alpha format; default ~1600px cap.

## [P3] Sitemap lists auth-only routes; robots allows everything
- **Location:** `src/app/sitemap.ts:12-13` (`/login`, `/register`), `src/app/robots.ts:7` — SEO hygiene — Drop auth routes (or `noindex`); optionally `disallow: /admin`.

## [P3] No skip-to-content link
- **Location:** root layout (`src/app/layout.tsx`) — A11y — Add a visually-hidden "Skip to content" link targeting `main`.

## [P3] Untracked schema drift: `docs/schema.sql` is far behind the migrations
- **Location:** `docs/schema.sql` (whole file) vs `2026-02-06_1`…`2026-08-10_1` — Operations — schema.sql lacks `courses`, `bookings`, `payment_method`, `profiles.phone_number`, the `instructor` role, guardian handling; a fresh setup from schema.sql alone yields a broken DB. Adopt `supabase migration` tracking or regenerate schema.sql.

## [P3] Non-idempotent DDL in apply-once migrations
- **Location:** `2026-02-06_1:9-11,31-33,51-53,57-59`, `2026-02-06_2:6-9` — Operations — `CREATE TYPE`/`ADD COLUMN`/`CREATE INDEX` without `IF NOT EXISTS`; re-running fails. Standardize on the idempotent guard pattern used in `2026-02-09_2:6-10`.

## [P3] Walk-in `perform_checkin` has no duplicate-day guard in the RPC
- **Location:** `docs/migrations/2026-03-05_1:130-198` — Correctness — Same-day duplicate protection is UI-only (`has_checked_in_today`); the RPC will happily burn two credits on a double scan. Decide policy explicitly and enforce in the RPC if walk-ins should be once-per-day.

## [P3] Admin-override comment vs code mismatch
- **Location:** `docs/migrations/2026-04-04_1:112-116` — Correctness — Comment says "until the course END time"; code allows any time during the course **day** (walk-ins after the course ended are accepted). Align code with intended semantics or fix the comment.

## [P3] `assign_subscription` race on `one_active_sub_per_user`
- **Location:** `docs/schema.sql:157-210` + partial unique index `schema.sql:62-64` — Correctness — Two concurrent assigns archive-then-insert; the second hits the unique index and raises unhandled. Wrap in a single statement / `ON CONFLICT` or lock the user row.

## [P3] CLAUDE.md drift (misleading documentation)
- **Location:** `CLAUDE.md:88` claims `member_type: 'adult'|'student'|'guardian'|'minor'`; actual SQL enum (`schema.sql:8`) and all TS usage are `'adult'|'student'`. Also `2026-02-06_4:63-65` comments expired monthlies move to `'archived'`, but the real flip (`2026-03-05_1:85-88`) sets `'expired'`. Update docs.

## [P3] Duplicate Back-to-Top implementation
- **Location:** `src/components/legal/legal-page-layout.tsx:66-71` (inline) vs `back-to-top-button.tsx` (used only by `faq/page.tsx:50`) — Maintainability — Render `<BackToTopButton />` from the layout.

## [P3] Duplicated inline SVG assets
- **Location:** `footer.tsx:13-26,44-48,60-66`, `find-us-dialog.tsx:118-124`, `faq-content.tsx:426-438` — Maintainability/Theming — Email/Instagram/Xiaohongshu paths copy-pasted 3×; the Xiaohongshu `fill="white"`/`fill="black"` rect is hard-coded pure black/white. Extract `EmailIcon`/`InstagramIcon`/`RednoteIcon` components.

## [P3] Phone-dropdown CSS triplicated with `!important` hex spray
- **Location:** `src/hooks/use-phone-input-styles.ts:7-12` (runtime injection), `register-form.tsx:19-35` (module-scope injection, same style id), `globals.css:168-304` (~140 lines of `#000000 !important`) — Theming/Maintainability — Whichever loads first wins; hard-coded hex bypasses tokens. Consolidate into one token-driven block.

## [P3] `PrefetchRoutes` is redundant and writes a ref during render
- **Location:** `src/components/navigation/prefetch-routes.tsx:13,15-17` used at `profile/page.tsx:134` — Perf — Bottom-nav `Link`s already prefetch; ref writes during render are discouraged. Delete the component.

## [P3] Inline arrow handlers defeat `React.memo` on `CourseCard`
- **Location:** `src/components/courses/courses-list.tsx:51-52` vs `course-card.tsx:173` — Perf — New `onBook`/`onCancel` closures per render invalidate the memo; all cards re-render on poll refresh. Pass stable callbacks.

## [P3] Disabled "Full - Cannot Book" button text ≈3.9:1
- **Location:** `src/components/courses/course-card.tsx:161` — A11y — `text-white/40` on `bg-white/10`; WCAG exempts inactive controls, but it doubles as a status label. Raise to `white/60` and keep the `FULL` badge.

## [P3] Cancellation-policy tooltip unreachable by keyboard
- **Location:** `src/components/courses/course-card.tsx:133-152` — A11y — TooltipTrigger wraps a `disabled` button (skipped in tab order). Keep the hint as visible text or place it on a focusable wrapper.

## [P3] Zoom range input has no accessible name
- **Location:** `src/components/profile/avatar-upload-dialog.tsx:224-232` — A11y — `<input type="range">` labeled only by an unassociated `<span>Zoom</span>`. Add `aria-label` + `aria-valuetext`.

## [P3] Form errors delivered only via toast, not bound to fields
- **Location:** `src/components/profile/edit-profile-dialog.tsx:50-53` — A11y — Set `aria-invalid`/`aria-describedby` and render inline error text (same pattern as the auth surface P2s).

## [P3] Status/destructive colors hard-coded instead of tokens
- **Location:** `course-card.tsx:141` (`bg-red-500/10 text-red-400`), `cancel-booking-dialog.tsx:184` (`bg-red-500`), `verification-detail-dialog.tsx:204` (`bg-green-600`), `request-reverification-dialog.tsx:106` (`bg-orange-500`), `courses-table.tsx:360` (`bg-red-500`) — Theming — Use `destructive`/semantic tokens or Button variants.

## [P3] Fragile dialog positioning overrides and close-button selector hacks
- **Location:** `!top-[5vh] !translate-y-0 sm:!top-[50%]...` in `edit-course-dialog.tsx:98`, `create-course-dialog.tsx:116`, `batch-create-dialog.tsx:191`, `course-details-dialog.tsx:105`; `[&>button]:text-white` in `find-us-dialog.tsx:29`, `subscription-pricing-dialog.tsx:39` — Responsive/Theming — Use a CSS var or `data-[state]`-aware class; use the `DialogClose` API instead of a selector that matches any direct button child.

## [P3] Small responsive/UX nits
- `double horizontal padding` from `container` + `px-4` (`courses/page.tsx:29`, `profile/page.tsx:141`, `settings/page.tsx:55` — ~96px of chrome on 360px); `2-col Song/Singer grids` squeeze at 320px (`edit-course-dialog.tsx:226`, `create-course-dialog.tsx:265`, `batch-create-dialog.tsx:423` — use `grid-cols-1 min-[420px]:grid-cols-2`); footer legal row overflow risk at ~280px (`footer.tsx:83-104`); "Check Video" text links ~16–20px tall (`course-card.tsx:119`); home CTA `border-2 border-black` invisible on black (`page.tsx:48,54`); `drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]` raw rgba (`page.tsx:24`, `scanner/page.tsx:46`); `alt="Welcome illustration"` generic (`page.tsx:34-41`).

## [P3] Redundant copy / dead code
- `faq/page.tsx:33-38` + `legal-page-layout.tsx:40-45` (subtitle restates the h1); `courses/page.tsx:35-40` ("Browse and book dance courses"); emoji category icons in FAQ (`faq-content.tsx:9-334,372` — announced to SRs); "Still Have Questions?" `h3` breaks the h2 rhythm (`faq-content.tsx:415`); "Sign up with Google" inert button in `register-form.tsx:102-104` (component unused by pages); leftover comment in `assign-subscription-dialog.tsx:21`; duplicate `Clock`/`ClockIcon` import (`profile/page.tsx:21`); duplicated `CheckinWithProfile` transform (`admin/page.tsx:128-147` vs `checkin-history-card.tsx:61-80`); duplicate camera-permission copy (`qr-scanner.tsx:194` vs `:338-339`).

## [P3] Small logic nits
- `batch-create-dialog.tsx:130-135` — preview `useEffect` omits `formData.start_time` from deps (exists-check at :96 won't refresh); `course-card.tsx:59` — badge variant keyed to dance style (`Kpop → 'subscription'`, else `'single'`) ties visual styling to genre; `profile/page.tsx:201` — status badge falls back to `"ACTIVE"` when status is null; `qr-code-display.tsx:30-33` — QR embeds `userId + timestamp` but no TTL is enforced client-side (verify scanner-side timestamp validation); `updateProfileInfo` revalidates only `/settings`, so `/profile` can serve a stale full name (`profile/actions.ts:339` — also revalidate `/profile`); UTC "today" slicing (`courses/page.tsx:58`, `courses/actions.ts:106`) is yesterday between 00:00–02:00 Zurich — compute the local date; `isFull` treats null/0 capacity as full (`course-card.tsx:40` — guard `capacity > 0`).

---

## Verification Notes

- **Lint/test baseline:** `next lint` → clean; `vitest run` → 31/31 pass (initial sandbox `spawn EPERM` during Vitest config bundling was an environment artifact, not a code problem — re-ran with wider permissions and all tests pass).
- **SQL claims** (P0s, IDOR cluster, credit race, search_path gaps) were verified directly against `docs/migrations/*.sql` and `docs/schema.sql`, not taken on faith from the file scans.
- **TS-vs-SQL severity reconciliation:** the unchecked server actions (auth-only, no `requireAdmin()`) are rated P1 (defense-in-depth) rather than P0 because each mutation RPC independently calls `is_admin()` and course writes are RLS-gated; the two true P0s are the policy/function-level authorization gaps that nothing else guards.
- Nothing in this document has been fixed; it is the findings deliverable for the audit. Companion sections (Executive Summary, Patterns & Systemic Issues, Positive Findings, Recommended Actions) are produced separately.
