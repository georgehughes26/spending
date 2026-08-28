-- Adds weekly structure to Strength, matching Running's plan_weeks /
-- planned_runs split: a week (labelled "WC <date>", the Monday it starts)
-- spawns one planned session per current program day, which then gets
-- marked done (with or without logging reps/weight) or skipped.

create table if not exists strength_program_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  start_date date not null, -- the Monday (week commencing)
  unique (user_id, start_date)
);

create table if not exists strength_planned_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  week_id uuid not null references strength_program_weeks(id) on delete cascade,
  day_id uuid not null references strength_program_days(id) on delete cascade,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  unique (user_id, week_id, day_id)
);

-- The optional 4th "if I have chance" day.
alter table strength_program_days add column if not exists is_optional boolean not null default false;

-- Links a logged session back to the planned slot it completed -- nullable
-- since ad-hoc logging (not against a specific week) should still work.
alter table strength_sessions add column if not exists planned_session_id uuid references strength_planned_sessions(id) on delete set null;

create index if not exists strength_program_weeks_user_id_idx on strength_program_weeks(user_id);
create index if not exists strength_planned_sessions_user_id_idx on strength_planned_sessions(user_id);
create index if not exists strength_planned_sessions_week_id_idx on strength_planned_sessions(week_id);
create index if not exists strength_sessions_planned_session_id_idx on strength_sessions(planned_session_id);

alter table strength_program_weeks enable row level security;
alter table strength_planned_sessions enable row level security;

drop policy if exists "anon full access" on strength_program_weeks;
create policy "anon full access" on strength_program_weeks for all to anon using (true) with check (true);

drop policy if exists "anon full access" on strength_planned_sessions;
create policy "anon full access" on strength_planned_sessions for all to anon using (true) with check (true);
