-- =====================================================================
-- TitanTrack: per-user cloud schema with Row Level Security
--
-- Replaces the old single-blob table (titan_track_state), which was keyed by
-- email and readable/writable by anyone holding the public anon key.
--
-- Every user table is owned by auth.uid(). RLS policies mean a signed-in user
-- can only ever see or change their own rows — enforced by Postgres, not by
-- the app. Nothing here is ever auto-deleted; there is no retention job.
--
-- Run with: supabase db push   (or paste into Dashboard → SQL Editor)
-- Safe to re-run: every statement is idempotent.
-- =====================================================================

-- ---------- helpers ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- profiles: settings + goals (one row per user) ----------
create table if not exists public.profiles (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  settings           jsonb not null default '{}'::jsonb,
  timezone           text,
  client_updated_at  timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- daily_logs: one row per user per local calendar day ----------
-- `log_date` is the user's LOCAL date (what "today" meant to them), never a
-- UTC-derived date. `data` holds walk/gym/weight/water/steps/wellbeing etc.;
-- food entries live in meal_entries.
create table if not exists public.daily_logs (
  user_id            uuid not null references auth.users (id) on delete cascade,
  log_date           date not null,
  data               jsonb not null default '{}'::jsonb,
  client_updated_at  timestamptz not null default now(),
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (user_id, log_date)
);

-- ---------- custom_foods: "+ What I Eat" definitions ----------
create table if not exists public.custom_foods (
  id                 uuid primary key,
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 80),
  unit               text not null check (unit in ('g','ml','piece','cup','bowl','slice','tbsp','tsp','serving')),
  basis              text not null check (basis in ('per100','perServing')),
  calories           numeric check (calories is null or (calories >= 0 and calories <= 3000)),
  protein            numeric check (protein is null or protein >= 0),
  carbs              numeric check (carbs is null or carbs >= 0),
  fat                numeric check (fat is null or fat >= 0),
  fiber              numeric check (fiber is null or fiber >= 0),
  source             text not null default 'user_entered'
                       check (source in ('user_entered','estimated','verified','unknown')),
  client_updated_at  timestamptz not null default now(),
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- One live definition per name+unit per user ("Paneer" in g and in pieces are different foods).
create unique index if not exists custom_foods_unique_live
  on public.custom_foods (user_id, lower(name), unit) where deleted_at is null;

-- ---------- meal_entries: every food logged, with its nutrition snapshot ----------
-- `id` is generated on the device, so retries and offline replays upsert the
-- same row instead of creating duplicates. Legacy entries use 'legacy-…' ids.
create table if not exists public.meal_entries (
  id                 text primary key check (char_length(id) between 8 and 120),
  user_id            uuid not null references auth.users (id) on delete cascade,
  log_date           date not null,
  meal_type          text check (meal_type is null or meal_type in ('breakfast','lunch','dinner','snacks')),
  name               text not null check (char_length(name) between 1 and 120),
  qty                numeric check (qty is null or qty >= 0),
  unit               text,
  cal                numeric not null default 0 check (cal >= 0),
  protein            numeric not null default 0,
  carbs              numeric not null default 0,
  fat                numeric not null default 0,
  fiber              numeric not null default 0,
  cal_unknown        boolean not null default false,
  source             text,
  food_id            text,
  consumed_at        timestamptz,
  snapshot           jsonb not null default '{}'::jsonb,   -- full entry as logged
  client_updated_at  timestamptz not null default now(),
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists meal_entries_user_date on public.meal_entries (user_id, log_date);
create index if not exists meal_entries_user_updated on public.meal_entries (user_id, updated_at);
create index if not exists daily_logs_user_updated on public.daily_logs (user_id, updated_at);
create index if not exists custom_foods_user_updated on public.custom_foods (user_id, updated_at);

-- ---------- updated_at triggers (server clock = sync cursor) ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','daily_logs','custom_foods','meal_entries'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before insert or update on public.%I
                    for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ---------- Row Level Security: owner-only on every user table ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','daily_logs','custom_foods','meal_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists %I_owner_select on public.%I', t, t);
    execute format('drop policy if exists %I_owner_insert on public.%I', t, t);
    execute format('drop policy if exists %I_owner_update on public.%I', t, t);
    execute format('drop policy if exists %I_owner_delete on public.%I', t, t);
    execute format('create policy %I_owner_select on public.%I for select to authenticated using (user_id = auth.uid())', t, t);
    execute format('create policy %I_owner_insert on public.%I for insert to authenticated with check (user_id = auth.uid())', t, t);
    execute format('create policy %I_owner_update on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
    execute format('create policy %I_owner_delete on public.%I for delete to authenticated using (user_id = auth.uid())', t, t);
    execute format(
      'revoke all privileges on table public.%I from anon, authenticated',
      t
    );
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      t
    );
  end loop;
end $$;

-- ---------- app_settings: global, read-only config (feature flags) ----------
-- Readable by everyone, writable by nobody through the API — change it in the
-- Dashboard or SQL editor:
--   insert into app_settings (key, value) values ('feature_flags', '{"achievements": true}')
--   on conflict (key) do update set value = excluded.value, updated_at = now();
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to anon, authenticated using (true);
revoke all privileges on table public.app_settings from anon, authenticated;
grant select on table public.app_settings to anon, authenticated;
insert into public.app_settings (key, value)
  values ('feature_flags', '{"achievements": false, "competitions": false}')
  on conflict (key) do nothing;

-- ---------- legacy blob table: lock it down, allow owners to claim their copy ----------
-- The old table let anyone read/write any row. Close it to the API entirely;
-- a signed-in user can fetch ONLY the row matching their verified email via
-- claim_legacy_state(), once, to import it into the new tables.
do $$
declare pol record;
begin
  if to_regclass('public.titan_track_state') is not null then
    execute 'alter table public.titan_track_state enable row level security';
    -- Drop every existing policy (the old ones were permissive).
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'titan_track_state' loop
      execute format('drop policy if exists %I on public.titan_track_state', pol.policyname);
    end loop;
    execute 'revoke all on public.titan_track_state from anon, authenticated';
    -- The global user directory leaked every user's email and body stats.
    execute $q$delete from public.titan_track_state where user_key = 'titan_global_user_directory'$q$;
  end if;
end $$;

create or replace function public.claim_legacy_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_verified boolean;
  v_state jsonb;
begin
  if auth.uid() is null or v_email = '' then
    return null;
  end if;
  -- Only hand over data for an email address the auth provider has verified.
  select (email_confirmed_at is not null) into v_verified from auth.users where id = auth.uid();
  if not coalesce(v_verified, false) then
    return null;
  end if;
  if to_regclass('public.titan_track_state') is null then
    return null;
  end if;
  execute 'select state from public.titan_track_state where user_key = $1'
    into v_state using 'titan_user_' || v_email;
  return v_state;
end $$;
revoke all on function public.claim_legacy_state() from public, anon;
grant execute on function public.claim_legacy_state() to authenticated;

-- ---------- account deletion (Google Play requirement) ----------
-- Deletes the caller's auth user; every table above cascades. Irreversible.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  if to_regclass('public.titan_track_state') is not null and v_email <> '' then
    execute 'delete from public.titan_track_state where user_key = $1' using 'titan_user_' || v_email;
  end if;
  delete from auth.users where id = v_uid;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
