# AGENT.md

Operating guide for AI agents (Claude Code, Codex, Cursor, etc.) working in this repository. Pairs with `CLAUDE.md` — that file describes the codebase; this one describes **how to work in it**.

> If `CLAUDE.md` and this file ever disagree, `CLAUDE.md` wins on facts about the code; `AGENT.md` wins on workflow.

---

## Part 1 — Orchestration (multi-agent workflow)

### Default agent for each task type

| Task | Agent | Notes |
|------|-------|-------|
| Implementation plan for a non-trivial feature | `planner` | Use **before** touching code on anything >1 file. |
| Net-new feature or bug fix | `tdd-guide` | Write failing test first, then implement. |
| Code just written or modified | `code-reviewer` | Run immediately after the diff stabilizes. |
| Security-sensitive change (auth, RLS, user input, file upload) | `security-reviewer` | Mandatory before commit on `src/app/auth/**`, `docs/migrations/**`, `src/middleware.ts`. |
| Build/type errors | `build-error-resolver` | Use `npm install && npx next build` to reproduce — bare `tsc` lies (see CLAUDE.md). |
| SQL migrations or query work | `database-reviewer` | Cosmos rules don't apply; this is Supabase Postgres. |
| Dead code / duplicates | `refactor-cleaner` | The `docs/` folder has many "old fix" markdowns — leave them unless the user asks for cleanup. |
| Broad codebase research | `Explore` (read-only) | Faster than spawning `general-purpose`. |
| Architecture/design decisions | `architect` | Especially around the SQL-RPC ↔ TS-action boundary. |

### When to parallelize

Run agents in parallel **only when they are operating on independent slices**. Examples that should be parallel:

- `security-reviewer` on `src/app/auth/**` + `code-reviewer` on a UI component you just edited.
- Three `Explore` agents searching for different symbols across the repo.

Examples that should be **sequential**:

- `planner` → `tdd-guide` → `code-reviewer`. Each depends on the prior output.
- Anything that mutates `docs/migrations/` — migration ordering is load-bearing.

### Plan mode

For any task that touches >1 file in `src/app/admin/scanner/`, the SQL migrations, or `src/middleware.ts`, enter **Plan Mode** first. These areas have non-obvious invariants (RLS bypass, repeat-checkin upgrades, route protection) and a "just edit" approach has historically caused regressions (see `docs/codebase-quality-analysis.md`).

---

## Part 2 — Autonomous agent spec (what to do / what to never do)

### Hard rules

1. **Never edit `docs/schema.sql` to change behavior.** It's a snapshot. Add a new migration in `docs/migrations/` with the next sequence number (`YYYY-MM-DD_N_short-description.sql`) and document it in the PR.
2. **Never call `.from('table').select(...).eq('user_id', x)` from an admin action without checking RLS first.** If RLS uses `auth.uid()`, the query returns the admin's rows, not the target user's. The fix is an RPC with `SECURITY DEFINER SET search_path = public, pg_temp` — see `docs/migrations/2026-02-06_4_fix-rls-subscription-access.sql`.
3. **Never use `subscription.status = 'active'` as the sole "is this usable" check.** Use the usability filter in `usableSubscriptionFilter()` in `src/app/admin/scanner/actions.ts`. If you change one, change the SQL helper `find_usable_subscription()` to match.
4. **Never add a new authenticated route without considering `PUBLIC_ROUTES`** in `src/middleware.ts`. New public pages must be allowlisted or anonymous users hit `/login?callbackUrl=...`.
5. **Never commit without running `npm run build`.** Vercel will run it for you, but catching it locally is ~30s vs. a failed preview deploy.
6. **Never `git push --force` to `main`.** The main branch has had history-rewrite incidents (see git memory ID 1227–1228). If you must rewrite, do it on a branch and open a PR.

### Soft rules (override if the user explicitly says so)

- Prefer **editing existing files** over creating new ones. The `docs/` folder is already noisy with "fix summary" markdowns; resist adding more unless asked.
- Prefer **server actions** over API routes for mutations. The codebase has none in `src/app/api/` and the convention is `actions.ts` colocated with the route.
- Prefer **shadcn `ui/` primitives** over hand-rolled components. If a Radix primitive exists, use it.
- Prefer **Zod schemas** for any form or external-input validation.

### Before-you-commit checklist

```
[ ] npm run build                              # Real Vercel-equivalent validation
[ ] npm test                                   # Vitest (mocks Supabase — no DB hit)
[ ] npm run lint                               # next lint
[ ] No console.log in shipped code
[ ] No hardcoded secrets / Supabase URLs
[ ] If you changed an RPC: the migration file is added under docs/migrations/
[ ] If you changed usableSubscriptionFilter: find_usable_subscription() matches
[ ] If you added a public route: src/middleware.ts PUBLIC_ROUTES updated
[ ] Commit message follows conventional commits: feat|fix|refactor|docs|test|chore|perf|ci
```

### Verification commands (paste-ready)

```bash
# Validate a single migration file format
ls docs/migrations/ | tail -5

# Run only the check-in flow tests
npx vitest run src/__tests__/checkin-flows.test.ts

# Search for a SQL function across the migration history (latest wins)
# Use Grep tool with: pattern="CREATE OR REPLACE FUNCTION perform_course_checkin"
#                    path="docs/migrations"
```

### When research is required

Mandatory before writing new code (from user's global rules):

1. **GitHub code search** for existing implementations.
2. **Library docs via Context7** for API confirmation. The big ones here: `@supabase/ssr`, `@yudiel/react-qr-scanner`, `react-hook-form`, `zod`.
3. **Exa / web search** only when the above are insufficient.

### Hand-off format

When ending a session that another agent will resume:

```
**Branch:** <name>
**Done:** <commits or scope>
**In progress:** <file paths>
**Blocked on:** <decision needed / dependency>
**Verification status:** build=<ok/fail> tests=<ok/fail> lint=<ok/fail>
**Next step:** <single concrete action>
```

---

## Part 3 — Platform notes

- **Shell**: PowerShell 5.1 on Windows. Pipeline chain operators `&&`/`||` are unavailable — use `;` + `if ($?)`. Use HEREDOCs for multi-line commit messages.
- **Git user**: `DarleneQing`. The user (`yuqing.huang@arcas-agentic.com`) operates this repo via Claude Code.
- **Deploy target**: Vercel, auto-deploys on push to `main`. Preview deploys on PR.
- **Database**: Supabase Postgres (not Cosmos, not local). Migrations are applied manually via the Supabase SQL Editor — there is no migration runner.
