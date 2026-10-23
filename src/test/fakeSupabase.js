/* Shared test double for the Supabase client (tests only). */
/* An in-memory stand-in for the Supabase query builder: enough of the API
 * that sync.js uses, with a server clock for updated_at and switchable
 * failure to simulate being offline. */
export function fakeSupabase() {
  const tables = { meal_entries: [], daily_logs: [], custom_foods: [], profiles: [], app_settings: [] };
  let clock = 0;
  const server = { tables, offline: false, calls: 0 };
  const stamp = () => new Date(Date.UTC(2026, 0, 1) + ++clock * 1000).toISOString();
  const keyOf = (table, row, onConflict) => onConflict.split(',').map((c) => row[c]).join('|');

  function builder(table) {
    const st = { filters: [], order: null, limit: null };
    const exec = (fn) => {
      server.calls += 1;
      if (server.offline) return Promise.resolve({ data: null, error: { message: 'Failed to fetch' } });
      return Promise.resolve(fn());
    };
    const api = {
      upsert(rowOrRows, { onConflict }) {
        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
        return exec(() => {
          for (const r of rows) {
            const k = keyOf(table, r, onConflict);
            const i = tables[table].findIndex((x) => keyOf(table, x, onConflict) === k);
            const merged = { ...(i === -1 ? {} : tables[table][i]), ...r, updated_at: stamp() };
            if (i === -1) tables[table].push(merged); else tables[table][i] = merged;
          }
          return { data: null, error: null };
        });
      },
      update(patch) {
        const u = { filters: [] };
        const run = () => exec(() => {
          for (const row of tables[table]) {
            if (u.filters.every((f) => f(row))) Object.assign(row, patch, { updated_at: stamp() });
          }
          return { data: null, error: null };
        });
        const chain = {
          eq(c, v) { u.filters.push((r) => r[c] === v); return chain; },
          in(c, vs) { u.filters.push((r) => vs.includes(r[c])); return chain; },
          then(res, rej) { return run().then(res, rej); },
        };
        return chain;
      },
      select() { return api; },
      eq(c, v) { st.filters.push((r) => r[c] === v); return api; },
      gt(c, v) { st.filters.push((r) => r[c] > v); return api; },
      order(c) { st.order = c; return api; },
      limit(n) { st.limit = n; return api; },
      then(res, rej) {
        return exec(() => {
          let rows = tables[table].filter((r) => st.filters.every((f) => f(r)));
          if (st.order) rows = [...rows].sort((a, b) => (a[st.order] < b[st.order] ? -1 : 1));
          if (st.limit) rows = rows.slice(0, st.limit);
          return { data: rows.map((r) => structuredClone(r)), error: null };
        }).then(res, rej);
      },
    };
    return api;
  }
  const client = {
    from: builder,
    rpc: async (name) => (server.rpc && server.rpc[name] ? server.rpc[name]() : { data: null, error: null }),
  };
  return { client, server };
}

