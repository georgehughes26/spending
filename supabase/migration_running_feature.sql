-- Run this once in the Supabase SQL Editor.
--
-- Adds the Running Coach feature: a 3-day/week adaptive running plan tracker.
-- running_access gates the new tab -- per-account, off by default. After
-- running this, flip it on for your own account only:
--   update users set running_access = true where lower(name) = lower('yourname');

alter table users add column if not exists running_access boolean not null default false;

create table if not exists running_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  pb_5k_seconds numeric not null,
  pb_5k_date date,
  current_fitness_5k_equiv_seconds numeric not null,
  goal_5k_seconds numeric not null,
  goal_date date not null,
  observed_max_hr_bpm integer,
  updated_at timestamptz not null default now()
);

create table if not exists running_plan_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  week_number integer not null,
  start_date date not null,
  end_date date not null,
  phase text not null check (phase in ('base','build1','build2','peak','taper','test')),
  is_deload boolean not null default false,
  unique (user_id, week_number)
);

create table if not exists running_planned_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  week_number integer not null,
  run_type text not null check (run_type in ('easy','interval','tempo','time_trial')),
  target_distance_km numeric not null,
  target_pace_sec_per_km numeric,
  prescription_json jsonb not null,
  status text not null default 'upcoming' check (status in ('upcoming','completed','skipped')),
  created_at timestamptz not null default now(),
  unique (user_id, week_number, run_type)
);

create table if not exists running_completed_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  planned_run_id uuid not null references running_planned_runs(id) on delete cascade,
  source_file_name text,
  source_format text check (source_format in ('gpx','tcx')),
  run_date date not null,
  distance_km numeric not null,
  duration_sec numeric not null,
  avg_pace_sec_per_km numeric not null,
  avg_heart_rate_bpm integer,
  max_heart_rate_bpm integer,
  elevation_gain_m numeric,
  splits_json jsonb not null,
  raw_trackpoints_json jsonb,
  analysis_json jsonb,
  verdict text check (verdict in ('ahead','on_track','behind','inconclusive')),
  rating integer,
  performance_vs_target_pct numeric not null,
  excluded_from_fitness boolean not null default false,
  uploaded_at timestamptz not null default now()
);

create table if not exists running_fitness_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  completed_run_id uuid not null references running_completed_runs(id) on delete cascade,
  fitness_5k_equiv_seconds numeric not null,
  recorded_at timestamptz not null default now()
);

-- Cached Garmin Connect session tokens for the garmin-push Edge Function
-- (stateless between invocations, so the token cache lives here instead of
-- a local file the way the standalone Running Coach app did it).
create table if not exists running_garmin_sessions (
  user_id uuid primary key references users(id) on delete cascade,
  oauth1_token jsonb not null,
  oauth2_token jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists running_plan_weeks_user_id_idx on running_plan_weeks(user_id);
create index if not exists running_planned_runs_user_id_idx on running_planned_runs(user_id);
create index if not exists running_completed_runs_user_id_idx on running_completed_runs(user_id);
create index if not exists running_fitness_history_user_id_idx on running_fitness_history(user_id);

alter table running_profiles enable row level security;
alter table running_plan_weeks enable row level security;
alter table running_planned_runs enable row level security;
alter table running_completed_runs enable row level security;
alter table running_fitness_history enable row level security;
alter table running_garmin_sessions enable row level security;

drop policy if exists "anon full access" on running_profiles;
create policy "anon full access" on running_profiles for all to anon using (true) with check (true);

drop policy if exists "anon full access" on running_plan_weeks;
create policy "anon full access" on running_plan_weeks for all to anon using (true) with check (true);

drop policy if exists "anon full access" on running_planned_runs;
create policy "anon full access" on running_planned_runs for all to anon using (true) with check (true);

drop policy if exists "anon full access" on running_completed_runs;
create policy "anon full access" on running_completed_runs for all to anon using (true) with check (true);

drop policy if exists "anon full access" on running_fitness_history;
create policy "anon full access" on running_fitness_history for all to anon using (true) with check (true);

-- running_garmin_sessions additionally should ONLY ever be touched by the
-- garmin-push Edge Function (which uses the service_role key and bypasses
-- RLS) -- no anon policy is created for it, same treatment as gc_tokens in
-- bank_schema.sql, so the frontend cannot read/write Garmin session tokens
-- directly.
