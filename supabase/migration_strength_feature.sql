-- Strength training: part of the "Training" area alongside Running.
-- Gated by the same running_access flag (see App.jsx's RequireTrainingAccess)
-- -- no new access column, this is one umbrella feature for one user.
--
-- The program (days + exercises + targets) is entered once by the user and
-- rarely changes -- "the plans and workouts are set" -- so there's no
-- generator here, unlike Running's plan. Sessions are logged against it
-- (manually for now; Garmin file upload is a planned follow-up once a
-- sample export is available to build the parser against).

create table if not exists strength_program_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists strength_program_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  day_id uuid not null references strength_program_days(id) on delete cascade,
  name text not null,
  target_sets integer not null,
  target_reps integer not null,
  target_weight_kg numeric not null,
  sort_order integer not null default 0
);

create table if not exists strength_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  day_id uuid not null references strength_program_days(id) on delete cascade,
  session_date date not null,
  score integer,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'garmin')),
  created_at timestamptz not null default now()
);

create table if not exists strength_set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid not null references strength_sessions(id) on delete cascade,
  exercise_id uuid not null references strength_program_exercises(id) on delete cascade,
  set_number integer not null,
  reps integer not null,
  weight_kg numeric not null
);

create index if not exists strength_program_days_user_id_idx on strength_program_days(user_id);
create index if not exists strength_program_exercises_user_id_idx on strength_program_exercises(user_id);
create index if not exists strength_program_exercises_day_id_idx on strength_program_exercises(day_id);
create index if not exists strength_sessions_user_id_idx on strength_sessions(user_id);
create index if not exists strength_sessions_day_id_idx on strength_sessions(day_id);
create index if not exists strength_set_logs_user_id_idx on strength_set_logs(user_id);
create index if not exists strength_set_logs_session_id_idx on strength_set_logs(session_id);
create index if not exists strength_set_logs_exercise_id_idx on strength_set_logs(exercise_id);

alter table strength_program_days enable row level security;
alter table strength_program_exercises enable row level security;
alter table strength_sessions enable row level security;
alter table strength_set_logs enable row level security;

drop policy if exists "anon full access" on strength_program_days;
create policy "anon full access" on strength_program_days for all to anon using (true) with check (true);

drop policy if exists "anon full access" on strength_program_exercises;
create policy "anon full access" on strength_program_exercises for all to anon using (true) with check (true);

drop policy if exists "anon full access" on strength_sessions;
create policy "anon full access" on strength_sessions for all to anon using (true) with check (true);

drop policy if exists "anon full access" on strength_set_logs;
create policy "anon full access" on strength_set_logs for all to anon using (true) with check (true);
