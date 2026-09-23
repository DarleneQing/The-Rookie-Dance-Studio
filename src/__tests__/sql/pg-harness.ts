/**
 * Runs the real SQL (docs/schema.sql + every docs/migrations/*.sql in order)
 * inside PGlite, an in-process WASM Postgres, so RPC tests exercise the
 * latest function definitions instead of mocks. Mocks cannot catch
 * Postgres-semantics bugs like the %ROWTYPE `IS NOT NULL` refund bug.
 *
 * Supabase-only pieces are stubbed: auth.users, auth.uid() (reads the
 * `request.jwt.claim.sub` setting, like Supabase), the anon/authenticated
 * roles, storage.objects, and uuid-ossp.
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'fs'
import path from 'path'

const DOCS = path.resolve(__dirname, '../../../docs')

const SUPABASE_STUBS = `
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  -- Like Supabase: new public tables are granted to the API roles by
  -- default (RLS is the intended guard), so tests see real exposure.
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (
    id UUID PRIMARY KEY,
    email TEXT,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb
  );
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  CREATE SCHEMA storage;
  CREATE TABLE storage.objects (name TEXT, bucket_id TEXT, owner UUID);
  CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE sql AS $$
    SELECT string_to_array(name, '/')
  $$;
  CREATE FUNCTION uuid_generate_v4() RETURNS UUID LANGUAGE sql AS $$
    SELECT gen_random_uuid()
  $$;
`

function loadSql(file: string): string {
  return readFileSync(file, 'utf8').replace(/^\s*CREATE EXTENSION[^;]*;/gim, '')
}

/**
 * Statements run just before a migration so the append-only history replays
 * from scratch. Each one mirrors a later fix migration; it never adds
 * behaviour the live DB does not also get.
 */
const REPLAY_FIXES: Record<string, string> = {
  // 2026-04-04_1 overloads book_course instead of replacing it, then its
  // unqualified COMMENT ON FUNCTION is ambiguous. The live fix for the
  // leftover overload is 2026-09-23_2_drop-legacy-book-course-overload.sql.
  '2026-04-04_1_fix-book-course-and-checkin.sql': 'DROP FUNCTION IF EXISTS book_course(UUID, UUID);',
}

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite()
  await db.exec(SUPABASE_STUBS)
  await db.exec(loadSql(path.join(DOCS, 'schema.sql')))
  const migrations = readdirSync(path.join(DOCS, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const file of migrations) {
    try {
      if (REPLAY_FIXES[file]) await db.exec(REPLAY_FIXES[file])
      await db.exec(loadSql(path.join(DOCS, 'migrations', file)))
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`)
    }
  }
  return db
}

/** Act as a given user for auth.uid() (null = anonymous). */
export async function actAs(db: PGlite, userId: string | null): Promise<void> {
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ''])
}
