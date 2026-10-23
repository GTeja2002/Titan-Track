-- =====================================================================
-- TitanTrack: hardening on top of 20261023000000_secure_per_user_schema.sql
--
-- 1. touch_updated_at() gets a fixed, empty search_path (Supabase security
--    advisor: "function_search_path_mutable").
-- 2. Upper bounds on numbers and JSON sizes, so a buggy or tampered client
--    cannot store absurd values (cal = 1e30) or megabytes of JSON in an
--    account. Limits are far above anything the app produces — a legitimate
--    write must never be rejected, because a rejected row blocks sync.
--
-- Constraints are added NOT VALID: they apply to every new insert/update but
-- do not re-check existing rows, so applying this can never fail on old data.
-- Safe to re-run.
-- =====================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('meal_entries', 'meal_entries_cal_max',       'cal <= 1000000'),
      ('meal_entries', 'meal_entries_macros_range',  'protein between 0 and 100000 and carbs between 0 and 100000 and fat between 0 and 100000 and fiber between 0 and 100000'),
      ('meal_entries', 'meal_entries_qty_max',       'qty is null or qty <= 100000'),
      ('meal_entries', 'meal_entries_unit_len',      'unit is null or char_length(unit) <= 20'),
      ('meal_entries', 'meal_entries_source_len',    'source is null or char_length(source) <= 30'),
      ('meal_entries', 'meal_entries_food_id_len',   'food_id is null or char_length(food_id) <= 120'),
      ('meal_entries', 'meal_entries_snapshot_size', 'pg_column_size(snapshot) <= 16384'),
      ('daily_logs',   'daily_logs_data_size',       'pg_column_size(data) <= 16384'),
      ('profiles',     'profiles_settings_size',     'pg_column_size(settings) <= 262144'),
      ('profiles',     'profiles_timezone_len',      'timezone is null or char_length(timezone) <= 64'),
      ('custom_foods', 'custom_foods_macros_max',    '(protein is null or protein <= 100000) and (carbs is null or carbs <= 100000) and (fat is null or fat <= 100000) and (fiber is null or fiber <= 100000)')
    ) as t(tbl, name, expr)
  loop
    execute format('alter table public.%I drop constraint if exists %I', c.tbl, c.name);
    execute format('alter table public.%I add constraint %I check (%s) not valid', c.tbl, c.name, c.expr);
  end loop;
end $$;
