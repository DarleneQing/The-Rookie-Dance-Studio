# Code Audit: "Check-in recorded without subscription deduction" — all edge cases

**Date:** 2026-08-16
**Scope:** every code path that can create a check-in row, plus every code path that mutates subscription balances.
**Sources of truth:** `docs/migrations/*.sql` (latest file per function is authoritative), `src/**` (TS layer).

## Invariant verified

> A check-in row exists **iff** the member was entitled to it, and:
> - times card (`5_times`/`10_times`): exactly **one** credit was deducted **before** the row was inserted;
> - monthly: `end_date` was valid at the time (no credit concept);
> - `single`/`drop_in`: no deduction, by design (paid cash/TWINT per class).
>
> No row is ever created for a debit that did not happen, and no debit is ever
> left behind if the row insert fails.

## Authoritative functions (current state)

| Function | File | Deduction logic |
|---|---|---|
| `perform_course_checkin` | `2026-08-16_5_allow-shared-account-duplicate-checkins.sql` | debit L174–188 → insert L202 |
| `perform_checkin` | `2026-08-16_1_fix-times-card-deduction-and-subscription-detection.sql` | debit L399–403 → insert L413 |
| `book_course` | `2026-08-16_2_harden-rls-and-rpc-auth.sql` (gates) + `2026-08-16_1` (logic) | no debit (booking only, by design) |
| `find_usable_subscription` | `2026-08-16_2` L95–135 (auth-gated) | selector only |
| `assign_subscription` | `2026-08-16_2` L335–385 | initializes credits |
| `delete_course_checkin` | **LIVE: `2026-04-04_2` (buggy) / FIX: `2026-08-16_7` (pending)** | refund on delete |
| `has_checked_in_today` | `schema.sql` | read-only warning |

## Path-by-path analysis

### P1 — Course check-in, normal path (`perform_course_checkin`, p_is_drop_in = false)
1. Admin-only gate → `bookings` lookup filtered to `user_id` + `course_id` + `status='confirmed'`.
   - At most **one** row guaranteed: partial unique index `unique_confirmed_booking (user_id, course_id) WHERE status='confirmed'` (created `2026-02-06_1`, never dropped) → no `TOO_MANY_ROWS` risk.
2. `single`/`drop_in` booking + usable card → booking upgraded to `subscription`, card linked (`v_booking.subscription_id := v_sub.id`) → debit → insert as `subscription`. **PASS**
3. `single`/`drop_in` booking, no usable card → insert as `single`, **no debit** — correct (per-class payment). **PASS**
4. `subscription` booking + card still usable → debit → insert. **PASS**
5. `subscription` booking + card depleted / expired / missing → re-link to an alternative usable card; if none → `No active subscription found`, **no insert**. **PASS**
6. Monthly booking → date validation only; out of window → rejected (and flipped to `expired`). **PASS**
7. Duplicate check-ins (shared accounts) → **no duplicate guard by design** (product decision, `2026-02-06_5`), each check-in debits exactly one credit. **PASS**
8. Times card at 0 → `remaining_credits <= 0` → rejected before insert; conditional `WHERE remaining_credits > 0` prevents negative balances. **PASS**

### P2 — Course check-in, walk-in / drop-in path (p_is_drop_in = true)
9. Existing confirmed booking → **reused** (not rejected by `book_course`'s duplicate-booking guard) → identical upgrade/debit logic. **PASS**
10. No booking → `book_course(..., admin override)` creates it → debit logic identical. **PASS**
11. `book_course` failure (course day passed, etc.) → return error, **no insert**. **PASS**
12. Concurrent double walk-in with no booking yet: one call wins, the other gets a transient `already have a booking` error — **no credit/row damage**; retry reuses the booking. Minor UX only. **PASS (note R5)**

### P3 — Walk-in check-in, no course (`perform_checkin`)
13. No usable subscription → error, **no insert**. **PASS**
14. Monthly out of window → error (flipped to `expired` if past). **PASS**
15. Times card at 0 → error (flipped to `depleted`). **PASS**
16. Otherwise: conditional debit (`WHERE remaining_credits > 0` + `FOUND` check) **before** insert. **PASS**

### P4 — Cross-cutting
17. **Debit-before-insert everywhere**: a failed debit returns before the insert (no orphan check-in without deduction). **PASS**
18. **Single transaction**: if the check-in INSERT fails (constraint/FK), the whole function rolls back, including the debit — no debit without a row. **PASS**
19. **Concurrent last-credit race**: conditional decrement + `FOUND` — only one of two concurrent scans consumes the last credit; the loser gets `No remaining credits` and no row. **PASS**
20. **`.id` row tests everywhere** in the current versions — the `2026-08-10_1` regression class (composite `row IS [NOT] NULL`) is gone from all four check-in/booking functions. **PASS**
21. **Security**: all writer RPCs are `SECURITY DEFINER` with `SET search_path = public, pg_temp` (+ `row_security = off` where row access is needed); admin gating via `is_admin()`; `find_usable_subscription` gates self-or-admin and revokes PUBLIC/anon execute. **PASS**
22. **No other writers**: grep over all migrations shows `INSERT INTO checkins` only inside `perform_checkin` / `perform_course_checkin`. **PASS**
23. **TS layer has no bypass**: the only `.insert(` in the whole app is `courses` creation (`src/app/admin/courses/actions.ts:23`). All `checkins` access in TS (`scanner/actions.ts`, `admin/actions.ts`, `courses/actions.ts`, `profile/page.tsx`, `admin/page.tsx`) is **read-only**; all mutations go through the RPCs. **PASS**
24. **Scanner repeat warning only**: `isRepeatCheckin` warns but never blocks (documented product behavior). **PASS**
25. **Booking cancellation** (`cancel_booking`) refunds nothing — credits are consumed at check-in, not booking; consistent. **PASS**

## Residual risks / recommendations

| # | Risk | Status | Recommendation |
|---|---|---|---|
| R1 | `delete_course_checkin` refund still broken on LIVE DB (`IF v_sub IS NOT NULL` at `2026-04-04_2` L26 — always false for times cards; also never covers walk-in rows). Deleting a times-card check-in silently eats a credit. | **PENDING — fix written** | Apply `docs/migrations/2026-08-16_7_fix-delete-checkin-refund.sql` (fixes `.id` test + covers `booking_type IS NULL` walk-ins). Not a check-in deduction bug, but the same audit will flag it as negative drift. |
| R2 | RLS policy `"Admins can insert checkins"` (`schema.sql`) lets an admin POST a check-in row directly via PostgREST with **no debit**. No app code does this; RPCs are `SECURITY DEFINER` and don't need the policy. | **FIXED** — `2026-09-24_2` | Policy dropped; all inserts must go through the RPCs. Regression test in `src/__tests__/sql/credits-refund-cancel.test.ts`. |
| R3 | Manual dashboard edits to `remaining_credits` will always show as audit drift. | Known/accepted | Documented in `docs/audit-subscription-balance.sql` caveats. |
| R4 | Monthly subscriptions have no credit balance to audit. | By design | Optional probe: check-ins linked to a monthly sub with `created_at` outside `[start_date, end_date]`. |
| R5 | Concurrent double walk-in (no booking yet) → transient `already have a booking` error on one of the two scans. | Minor UX | Retry reuses the booking; no credit impact. Optionally serialize on the course row (already `FOR UPDATE` inside `book_course`). |
| R6 | No automated tests for the SQL functions. | Open | Add a read-only verification query to `docs/audit-subscription-balance.sql`: dump the 5 function definitions and grep for `v_sub IS NOT NULL` (must be absent) and `remaining_credits > 0` (must be present in both debit paths). |

## Verdict

With the current deployed function set (`2026-08-16_1`, `2026-08-16_2`, `2026-08-16_5`),
**the "check-in without deduction" bug class is closed on every path**:

- every check-in row for a times card is preceded by exactly one conditional debit in the same transaction (debit → FOUND check → insert; insert failure rolls the debit back);
- the race that let two scans consume one credit is closed;
- the row-NULL regression class is gone (all `.id` tests);
- no TS or SQL path exists that writes a check-in row outside the two RPCs;
- duplicate check-ins for shared accounts still debit exactly once per row, as designed.

**One live code defect remains — the delete-refund bug (R1)** — which is a refund-at-deletion
issue, not a check-in deduction issue. Apply `2026-08-16_7` to close it.
