-- Run this once in the Supabase SQL Editor.
-- Replaces the old Running/Strength "Training" feature with a daily fitness
-- habit tracker. The running_*/strength_* tables already had their rows
-- deleted (and their app code removed) -- this migration only adds the new
-- tables; it does not touch those old ones. Drop them yourself once you're
-- sure you don't want them (see the bottom of this file).

-- One settings row per user: plan window + weigh-in goal.
create table if not exists habit_settings (
  user_id uuid primary key references users(id) on delete cascade,
  plan_start date not null default '2026-10-12',
  goal_date date not null default '2026-12-19',
  start_weight numeric not null default 96.0,
  goal_weight numeric not null default 90.0,
  calorie_tolerance numeric not null default 100,
  updated_at timestamptz not null default now()
);

-- Default weekly template: one row per weekday (0 = Monday .. 6 = Sunday)
-- per user, used whenever no imported week plan covers a date.
create table if not exists habit_day_templates (
  user_id uuid not null references users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  sessions jsonb not null default '[]',
  calories numeric not null default 0,
  protein numeric not null default 0,
  steps numeric not null default 0,
  water numeric not null default 0,
  primary key (user_id, weekday)
);

-- Imported week plans. One row per (user, week_start) -- re-importing the
-- same week replaces the row entirely via upsert.
create table if not exists habit_week_plans (
  user_id uuid not null references users(id) on delete cascade,
  week_start date not null,
  summary text,
  days jsonb not null,
  raw_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- Habits added beyond the built-in set (Creatine, Vitamin D, Weight,
-- Calories, Protein, Steps, Water, Drinks), e.g. "Stretching".
create table if not exists habit_custom_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  key text not null,
  label text not null,
  type text not null check (type in ('tick', 'number')),
  target numeric,
  unit text,
  quick_add jsonb,
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per logged day. session_ticks is an array of booleans aligned by
-- POSITION to that date's resolved sessions list -- this is what lets a
-- renamed/removed session in a re-imported week plan keep an existing tick
-- without any special migration logic: the tick just stays attached to
-- whichever session now sits at that index.
create table if not exists habit_daily_logs (
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  weight numeric,
  calories numeric,
  protein numeric,
  steps numeric,
  water numeric,
  drinks numeric not null default 0,
  creatine boolean not null default false,
  vit_d boolean not null default false,
  note text,
  session_ticks jsonb not null default '[]',
  custom_values jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table habit_settings enable row level security;
alter table habit_day_templates enable row level security;
alter table habit_week_plans enable row level security;
alter table habit_custom_definitions enable row level security;
alter table habit_daily_logs enable row level security;

drop policy if exists "anon full access" on habit_settings;
create policy "anon full access" on habit_settings for all to anon using (true) with check (true);
drop policy if exists "anon full access" on habit_day_templates;
create policy "anon full access" on habit_day_templates for all to anon using (true) with check (true);
drop policy if exists "anon full access" on habit_week_plans;
create policy "anon full access" on habit_week_plans for all to anon using (true) with check (true);
drop policy if exists "anon full access" on habit_custom_definitions;
create policy "anon full access" on habit_custom_definitions for all to anon using (true) with check (true);
drop policy if exists "anon full access" on habit_daily_logs;
create policy "anon full access" on habit_daily_logs for all to anon using (true) with check (true);

-- Once you're sure you no longer want the old Training data/schema (its
-- rows are already gone), run this to drop the tables themselves:
--
-- drop table if exists running_garmin_sessions;
-- drop table if exists running_fitness_history;
-- drop table if exists running_completed_runs;
-- drop table if exists running_planned_runs;
-- drop table if exists running_plan_weeks;
-- drop table if exists running_profiles;
-- drop table if exists strength_set_logs;
-- drop table if exists strength_sessions;
-- drop table if exists strength_planned_sessions;
-- drop table if exists strength_program_weeks;
-- drop table if exists strength_program_exercises;
-- drop table if exists strength_program_days;
