/* Test helper: a real Postgres (PGlite, in-process WASM) with the actual
 * migrations applied, plus a minimal adapter that turns the supabase-js calls
 * used by src/lib/sync.js into SQL. Unlike the in-memory fake, every column
 * type, NOT NULL / CHECK constraint, unique index and RLS policy is enforced
 * by PostgreSQL itself. Requests run as the `authenticated` role with the
 * signed-in user's JWT claims, the way PostgREST runs them.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');

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
`;

export async function createDatabase(users = []) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const u of users) {
    await db.query('insert into auth.users values ($1, $2, now())', [u.id, u.email]);
  }
  for (const f of readdirSync(migrationsDir).filter((n) => n.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(resolve(migrationsDir, f), 'utf8'));
  }
  return db;
}

const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`unsafe identifier ${name}`);
  return `"${name}"`;
};
// jsonb columns receive objects; everything else is passed through as-is
// (including null, exactly as PostgREST would insert an explicit JSON null).
const param = (v) => (v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v);
const asError = (e) => ({ message: e.message, code: e.code });

/** A supabase-js-shaped client bound to one user, backed by real SQL. */
export function clientFor(db, user) {
  const asUser = async (fn) => {
    await db.query(
      `select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)`,
      [user.id, JSON.stringify({ sub: user.id, email: user.email })],
    );
    await db.exec('set role authenticated');
    try {
      return await fn();
    } finally {
      await db.exec('reset role');
    }
  };

  const run = (fn) => asUser(fn).then(
    (data) => ({ data, error: null }),
    (e) => ({ data: null, error: asError(e) }),
  );

  function from(table) {
    const t = ident(table);
    const filters = [];
    const values = [];
    const addFilter = (sqlFor) => { filters.push(sqlFor); return null; };
    const where = (start = 1) => {
      if (!filters.length) return { sql: '', params: [] };
      let n = start;
      const parts = [];
      const params = [];
      for (const f of filters) {
        const { sql, args } = f(() => `$${n++}`);
        parts.push(sql);
        params.push(...args);
      }
      return { sql: ` where ${parts.join(' and ')}`, params };
    };
    let orderBy = '';
    let limit = '';

    const select = {
      eq(c, v) { addFilter((p) => ({ sql: `${ident(c)} = ${p()}`, args: [v] })); return select; },
      gt(c, v) { addFilter((p) => ({ sql: `${ident(c)} > ${p()}`, args: [v] })); return select; },
      order(c, { ascending = true } = {}) { orderBy = ` order by ${ident(c)} ${ascending ? 'asc' : 'desc'}`; return select; },
      limit(n) { limit = ` limit ${Number(n)}`; return select; },
      then(res, rej) {
        // to_jsonb renders timestamps and dates as strings, like PostgREST.
        return run(async () => {
          const w = where();
          const r = await db.query(`select to_jsonb(x) as row from ${t} x${w.sql}${orderBy}${limit}`, w.params);
          return r.rows.map((x) => x.row);
        }).then(res, rej);
      },
    };

    return {
      select() { return select; },
      upsert(rowOrRows, { onConflict }) {
        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
        const conflict = onConflict.split(',').map((c) => c.trim());
        return run(async () => {
          for (const row of rows) {
            const cols = Object.keys(row);
            const sets = cols.filter((c) => !conflict.includes(c)).map((c) => `${ident(c)} = excluded.${ident(c)}`);
            await db.query(
              `insert into ${t} (${cols.map(ident).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
               on conflict (${conflict.map(ident).join(', ')}) do ${sets.length ? `update set ${sets.join(', ')}` : 'nothing'}`,
              cols.map((c) => param(row[c])),
            );
          }
          return null;
        });
      },
      update(patch) {
        const chain = {
          eq(c, v) { addFilter((p) => ({ sql: `${ident(c)} = ${p()}`, args: [v] })); return chain; },
          in(c, vs) { addFilter((p) => ({ sql: `${ident(c)} = any(${p()})`, args: [vs] })); return chain; },
          then(res, rej) {
            return run(async () => {
              const cols = Object.keys(patch);
              const w = where(cols.length + 1);
              await db.query(
                `update ${t} set ${cols.map((c, i) => `${ident(c)} = $${i + 1}`).join(', ')}${w.sql}`,
                [...cols.map((c) => param(patch[c])), ...w.params],
              );
              return null;
            }).then(res, rej);
          },
        };
        return chain;
      },
    };
  }

  return {
    from,
    rpc: (name) => run(async () => {
      const r = await db.query(`select public.${ident(name)}() as result`);
      return r.rows[0]?.result ?? null;
    }),
  };
}
