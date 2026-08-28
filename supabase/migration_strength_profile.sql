-- Body stats for Strength insights (relative-strength comparisons need
-- bodyweight; height is stored too but not currently used in any
-- calculation -- see insights.js's comment on why).

create table if not exists strength_profile (
  user_id uuid primary key references users(id) on delete cascade,
  height_cm numeric,
  weight_kg numeric,
  updated_at timestamptz not null default now()
);

alter table strength_profile enable row level security;

drop policy if exists "anon full access" on strength_profile;
create policy "anon full access" on strength_profile for all to anon using (true) with check (true);
