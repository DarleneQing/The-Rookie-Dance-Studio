# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

The Rookie Dance Studio — a mobile-first Next.js 14 (App Router) + Supabase application for managing dance studio member check-ins, subscriptions, course bookings, and admin operations.

## Commands

```bash
npm run dev          # Next.js dev server on http://localhost:3000
npm run build        # Production build (validates types + lints + generates pages)
npm run start        # Run production build
npm run lint         # next lint (eslint-config-next)
npm test             # Vitest run (single pass)
npm run test:watch   # Vitest in watch mode

# Run a single test file
npx vitest run src/__tests__/checkin-flows.test.ts

# Run tests matching a name pattern
npx vitest run -t "drop-in"
```

Required env vars in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

To validate before deploying: `npm install && npx next build`. Vercel installs devDependencies and runs `next build`, so running just `tsc --noEmit` is insufficient and can produce false alarms when `node_modules` is stale.

## Architecture

### Stack
- Next.js 14 App Router with Server Actions (`'use server'`)
- Supabase (Auth + Postgres + RLS) via `@supabase/ssr`
- Tailwind + shadcn/ui (Radix primitives) — components live in `src/components/ui/`
- React Hook Form + Zod for forms
- Vitest for tests (node environment, `@/` → `./src` alias)

### Three Supabase clients — pick the right one
- `src/lib/supabase/client.ts` — `createBrowserClient`, for client components only.
- `src/lib/supabase/server.ts` — `createServerClient` bound to Next's `cookies()`. Use in Server Components, Server Actions, and Route Handlers. The `setAll` is wrapped in try/catch because it throws when called from a Server Component (the middleware refresh handles cookie writes in that case).
- `src/lib/supabase/middleware.ts` — `updateSession()` runs on every protected route, refreshes the session, and on auth failure clears `sb-*` cookies and redirects to `/login?callbackUrl=...`.

### Route protection model
`src/middleware.ts` uses an explicit `PUBLIC_ROUTES` allowlist. Anything not in the list goes through `updateSession`. When adding a new public page (e.g., a marketing route or auth callback), add the pathname to `PUBLIC_ROUTES` or it will redirect anonymous visitors to `/login`. The matcher excludes Next internals and common image extensions.

### Business logic lives in SQL, not TypeScript
The check-in, booking, and subscription rules are implemented as Postgres functions called via `supabase.rpc(...)`. The TS server actions are thin wrappers. To understand a flow, **read `docs/migrations/*.sql` in date order** — they form an append-only history and the latest file for a given function is authoritative.

Key RPCs:
- `perform_checkin` — walk-in check-in (no course); validates subscription.
- `perform_course_checkin` — course-scoped check-in; may upgrade `single`/`drop_in` bookings to `subscription` if the user has acquired a card.
- `book_course` — capacity-checked course booking with subscription detection.
- `has_checked_in_today` — duplicate-check-in guard.
- `find_usable_subscription` — shared subscription selector mirrored in the TS filter `usableSubscriptionFilter` in `src/lib/utils/subscription-helpers.ts` (used by `src/app/admin/scanner/actions.ts`, `src/app/courses/page.tsx`, `src/app/profile/page.tsx`). **Keep these two definitions in sync.**

#### Critical SQL pattern: RLS bypass
`SECURITY DEFINER` RPCs **must** declare `SET search_path = public, pg_temp` or RLS will still apply using the admin's `auth.uid()`, causing queries like `WHERE user_id = p_user_id` (a member UUID) to return zero rows. Reference fix: `docs/migrations/2026-02-06_4_fix-rls-subscription-access.sql`.

### Subscription & booking semantics
- Subscription types: `'5_times'`, `'10_times'` (use `remaining_credits`), `'monthly'` (uses `end_date`).
- Status enum: `'active' | 'expired' | 'depleted' | 'archived'`. Prefer **usability filters** over `status = 'active'`:
  ```
  (type IN ('5_times','10_times') AND remaining_credits > 0)
  OR (type = 'monthly' AND end_date >= CURRENT_DATE)
  ```
- Booking types: `'subscription' | 'single' | 'drop_in'`. `drop_in` is legacy — no new ones are created, but existing rows are still upgraded on check-in.
- One active subscription per user — assigning a new one archives the previous.

### Duplicate check-ins are a FEATURE (shared accounts)
Members share accounts (family members check in under one account), so **the same `user_id` legitimately checks into the same course multiple times — once per person** — and each check-in must deduct exactly one credit. This is documented in the migrations ("Allows duplicate check-ins for the same course. Each check-in deducts subscription credits if applicable.") and enabled by dropping the `unique_course_checkin` index (`2026-02-06_5`). Preserve this:
- `perform_course_checkin` (latest: `2026-08-16_5`) has **no duplicate guard** in either path. The walk-in (`p_is_drop_in = true`) path reuses an existing confirmed booking instead of delegating blindly to `book_course` (whose "You already have a booking" guard correctly blocks *booking creation*, not check-ins). The upgrade/re-link step runs for reused bookings too, so a `single` booking made by person one upgrades to `subscription` when person two checks in with a card.
- `book_course` **must keep** its duplicate-booking guard — members cannot create two bookings for the same course; only the check-in path tolerates repeats.
- The scanner UI warns on repeat scans (`isRepeatCheckin` in `getCheckinContext`) but allows them — do not turn that warning into a block.

### Server Actions layout
Server Actions are colocated with their routes as `actions.ts`:
- `src/app/admin/actions.ts` — walk-in check-ins, member lookup.
- `src/app/admin/scanner/actions.ts` — `getCheckinContext` returns everything the scanner UI needs in one round-trip.
- `src/app/admin/scanner/checkin-actions.ts` — course check-in mutations.
- `src/app/admin/courses/actions.ts` — admin course CRUD + batch creation.
- `src/app/courses/actions.ts`, `booking-actions.ts` — member-facing booking.
- `src/app/auth/actions.ts` — sign-in/up/out.

After mutations, call `revalidatePath(...)` to refresh server-rendered pages.

### Auth callback
`src/app/auth/callback/route.ts` uses Supabase's **`token_hash` + `verifyOtp`** flow (not the PKCE `code` flow) for email verification. The email template must point to `/auth/callback?token_hash=...&type=email`. If verification "fails" intermittently after a confirmed email, this is the first thing to check (see `EMAIL_VERIFICATION_FIX.md` and `docs/migrations` history for context).

### Roles
- `role: 'admin'` — gates `src/app/admin/*` (middleware enforces auth; the page itself checks role).
- `member_type: 'adult' | 'student' | 'guardian' | 'minor'` — student requires admin verification via `/admin/verifications`.

### Testing approach
`src/__tests__/checkin-flows.test.ts` mocks the Supabase client by intercepting `createClient` with `vi.mock` and returning chainable stubs (`select/eq/or/order/limit/maybeSingle/single`). When adding tests that touch new tables or new query shapes, extend the `methods` array in `createChainableMock` and seed `mockResponses[table]`. Tests do not hit a real database — the goal is to verify the TS branch logic matches the SQL decision tree.

## Conventions & gotchas

- **Path alias**: `@/*` → `./src/*` (set in both `tsconfig.json` and `vitest.config.ts`).
- **Server Action body limit**: raised to 10mb in `next.config.mjs` for image uploads (student verification cards, avatars).
- **`docs/migrations/` is the source of truth** for DB behavior, not `docs/schema.sql` (which is the initial snapshot). To apply, paste into the Supabase SQL Editor in chronological order.
- **PowerShell on Windows**: native exes mangle embedded double quotes — use a HEREDOC variable or the `--%` stop-parsing token when passing complex args to `git`.
- The `optimizePackageImports: ['lucide-react']` setting in `next.config.mjs` enables tree-shaking for icons; import named icons rather than the full module.
- Storage policies for student-card uploads are in `docs/storage-policies-student-cards.sql` — not auto-applied by the schema.
- **Time comparisons must be absolute**: never assign `NOW() AT TIME ZONE 'Europe/Zurich'` to a `TIMESTAMPTZ` variable or compare it against a `timestamptz` expression — Postgres re-interprets the wall-clock value in the session timezone (UTC by default), skewing deadlines/cutoffs by the UTC↔Zurich offset (1h CET / 2h CEST). Use `NOW()` directly; convert course times with `(scheduled_date + start_time) AT TIME ZONE 'Europe/Zurich'`. Reference fix: `docs/migrations/2026-08-16_6_fix-cancellation-batch-timezone-skew.sql`.

## Specify/SpecKit

`.specify/` and `.cursor/commands/speckit.*` are spec-kit scaffolding for spec-driven development. They are not part of the runtime app — ignore unless explicitly working on a spec.
