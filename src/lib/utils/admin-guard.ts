import { createClient } from '@/lib/supabase/server'

/**
 * Server-side admin gate for server actions.
 *
 * Call at the top of every admin-only action and PII read. Do NOT rely on RLS
 * alone for authorization — the SQL layer is the backstop, but the TS layer
 * must fail closed on its own so a future RLS change cannot silently open an
 * action (see docs/audit-findings-by-severity.md P1 "defense-in-depth").
 *
 * Returns the admin's user id when the current session belongs to an admin,
 * otherwise null. Each caller maps null to its own error shape.
 */
export async function requireAdmin(): Promise<{ id: string } | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') return null

  return { id: user.id }
}
