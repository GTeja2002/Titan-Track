/* Runs the real migration against Postgres (PGlite, in-process WASM) with a
 * minimal stand-in for Supabase's auth schema, then proves:
 *   - a user can only read/write their own rows (RLS),
 *   - anon cannot read user data or the legacy blob table,
 *   - claim_legacy_state() returns only the caller's own verified row,
 *   - delete_my_account() removes the caller and cascades, nobody else,
 *   - the migration is safe to run twice.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, '../migrations');
const migrations = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => readFileSync(resolve(migrationsDir, f), 'utf8'));

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333'; // unverified email

// The parts of Supabase the migration depends on.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant execute on function auth.jwt() to anon, authenticated;
  -- The old, permissive legacy table.
  create table public.titan_track_state (user_key text primary key, state jsonb, updated_at timestamptz);
  alter table public.titan_track_state enable row level security;
  create policy "anyone" on public.titan_track_state for all using (true) with check (true);
  grant all on public.titan_track_state to anon, authenticated;
`;

let db;

async function as(userId, email, fn) {
  await db.exec('reset role');
  if (userId) {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)`,
      [userId, JSON.stringify({ sub: userId, email })]);
    await db.exec('set role authenticated');
  } else {
    await db.query(`select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '', false)`);
    await db.exec('set role anon');
  }
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.query(`insert into auth.users values ($1, 'a@example.com', now()), ($2, 'b@example.com', now()), ($3, 'c@example.com', null)`, [A, B, C]);
  await db.query(`insert into public.titan_track_state values
    ('titan_user_a@example.com', '{"name":"A legacy"}', now()),
    ('titan_user_b@example.com', '{"name":"B legacy"}', now()),
    ('titan_user_c@example.com', '{"name":"C legacy"}', now()),
    ('titan_global_user_directory', '{"users":{"a@example.com":{"weight":80}}}', now())`);
  for (const sql of migrations) await db.exec(sql);
}, 60000);

describe('migration', () => {
  it('is idempotent (can be re-run)', async () => {
    for (const sql of migrations) await db.exec(sql);
  });

  it('deleted the leaked global user directory row', async () => {
    const r = await db.query(`select count(*)::int as n from public.titan_track_state where user_key = 'titan_global_user_directory'`);
    expect(r.rows[0].n).toBe(0);
  });

  it('seeded feature flags as off', async () => {
    const r = await as(null, null, () => db.query(`select value from public.app_settings where key = 'feature_flags'`));
    expect(r.rows[0].value).toEqual({ achievements: false, competitions: false });
  });
});

describe('row level security', () => {
  beforeAll(async () => {
    await as(A, 'a@example.com', async () => {
      await db.query(`insert into public.meal_entries (id, user_id, log_date, name, cal) values ('entry-a-0001', $1, '2026-10-23', 'A rice', 130)`, [A]);
      await db.query(`insert into public.daily_logs (user_id, log_date, data) values ($1, '2026-10-23', '{"water":500}')`, [A]);
      await db.query(`insert into public.custom_foods (id, user_id, name, unit, basis, calories) values (gen_random_uuid(), $1, 'Paneer', 'g', 'per100', 265)`, [A]);
      await db.query(`insert into public.profiles (user_id, settings) values ($1, '{"goal":"consistency"}')`, [A]);
    });
    await as(B, 'b@example.com', async () => {
      await db.query(`insert into public.meal_entries (id, user_id, log_date, name, cal) values ('entry-b-0001', $1, '2026-10-23', 'B dosa', 133)`, [B]);
    });
  });

  it('user B cannot read user A rows in any table', async () => {
    await as(B, 'b@example.com', async () => {
      for (const t of ['meal_entries', 'daily_logs', 'custom_foods', 'profiles']) {
        const r = await db.query(`select * from public.${t} where user_id = $1`, [A]);
        expect(r.rows, t).toHaveLength(0);
      }
      const all = await db.query('select name from public.meal_entries');
      expect(all.rows.map((r) => r.name)).toEqual(['B dosa']);
    });
  });

  it('user B cannot insert rows claiming to be user A', async () => {
    await as(B, 'b@example.com', async () => {
      await expect(db.query(`insert into public.meal_entries (id, user_id, log_date, name) values ('spoof-0001', $1, '2026-10-23', 'x')`, [A])).rejects.toThrow(/row-level security/);
    });
  });

  it('user B cannot update or delete user A rows (zero rows affected)', async () => {
    await as(B, 'b@example.com', async () => {
      const u = await db.query(`update public.meal_entries set cal = 9999 where id = 'entry-a-0001'`);
      expect(u.affectedRows).toBe(0);
      const d = await db.query(`delete from public.meal_entries where id = 'entry-a-0001'`);
      expect(d.affectedRows).toBe(0);
      // Nor move their own row onto A.
      await expect(db.query(`update public.meal_entries set user_id = $1 where id = 'entry-b-0001'`, [A])).rejects.toThrow(/row-level security/);
    });
    const r = await db.query(`select cal from public.meal_entries where id = 'entry-a-0001'`);
    expect(Number(r.rows[0].cal)).toBe(130);
  });

  it('anon cannot read any user data or the legacy table', async () => {
    await as(null, null, async () => {
      for (const t of ['meal_entries', 'daily_logs', 'custom_foods', 'profiles', 'titan_track_state']) {
        await expect(db.query(`select * from public.${t}`), t).rejects.toThrow(/permission denied/);
      }
    });
  });

  it('a retried insert of the same entry id upserts instead of duplicating', async () => {
    await as(A, 'a@example.com', async () => {
      const sql = `insert into public.meal_entries (id, user_id, log_date, name, cal) values ('entry-a-0002', $1, '2026-10-23', 'A dal', 116)
                   on conflict (id) do update set cal = excluded.cal`;
      await db.query(sql, [A]);
      await db.query(sql, [A]);
      const r = await db.query(`select count(*)::int as n from public.meal_entries where id = 'entry-a-0002'`);
      expect(r.rows[0].n).toBe(1);
    });
  });

  it('rejects a second live custom food with the same name + unit', async () => {
    await as(A, 'a@example.com', async () => {
      await expect(db.query(`insert into public.custom_foods (id, user_id, name, unit, basis, calories) values (gen_random_uuid(), $1, 'PANEER', 'g', 'per100', 300)`, [A])).rejects.toThrow(/unique/);
    });
  });

  it('stamps updated_at from the server clock', async () => {
    await as(A, 'a@example.com', async () => {
      const r = await db.query(`update public.daily_logs set data = '{"water":750}' where log_date = '2026-10-23' returning updated_at`);
      expect(r.rows[0].updated_at).toBeInstanceOf(Date);
    });
  });
});

describe('claim_legacy_state', () => {
  it('returns only the caller\'s own legacy blob', async () => {
    const r = await as(A, 'a@example.com', () => db.query('select public.claim_legacy_state() as s'));
    expect(r.rows[0].s).toEqual({ name: 'A legacy' });
  });

  it('cannot be tricked by a different email claim for an unverified account', async () => {
    const r = await as(C, 'c@example.com', () => db.query('select public.claim_legacy_state() as s'));
    expect(r.rows[0].s).toBeNull();
  });

  it('is not callable by anon', async () => {
    await as(null, null, async () => {
      await expect(db.query('select public.claim_legacy_state()')).rejects.toThrow(/permission denied/);
    });
  });
});

describe('delete_my_account', () => {
  it('deletes the caller and all their rows, and nobody else', async () => {
    await as(B, 'b@example.com', () => db.query('select public.delete_my_account()'));
    const users = await db.query('select id from auth.users order by id');
    expect(users.rows.map((r) => r.id)).toEqual([A, C]);
    const bRows = await db.query('select count(*)::int as n from public.meal_entries where user_id = $1', [B]);
    expect(bRows.rows[0].n).toBe(0);
    const aRows = await db.query('select count(*)::int as n from public.meal_entries where user_id = $1', [A]);
    expect(aRows.rows[0].n).toBeGreaterThan(0);
    const legacy = await db.query(`select count(*)::int as n from public.titan_track_state where user_key = 'titan_user_b@example.com'`);
    expect(legacy.rows[0].n).toBe(0);
  });
});
