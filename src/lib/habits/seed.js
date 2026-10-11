// First-run defaults. The default template seeds habit_day_templates on
// first load (one row per weekday); the week plan seeds week 1 through the
// exact same import path real coach plans use later, so it's a real test of
// that path rather than a special case.

export const DEFAULT_TEMPLATE = [
  { weekday: 0, sessions: ['Legs & Shoulders (gym)', '5-a-side football'], calories: 2900, protein: 190, steps: 8000, water: 3.0 },
  { weekday: 1, sessions: ['Chest & Tris (gym)'], calories: 2600, protein: 190, steps: 8000, water: 3.0 },
  { weekday: 2, sessions: ['Football training'], calories: 2800, protein: 190, steps: 8000, water: 3.0 },
  { weekday: 3, sessions: ['Easy run'], calories: 2500, protein: 190, steps: 8000, water: 3.0 },
  { weekday: 4, sessions: [], calories: 2300, protein: 190, steps: 10000, water: 2.5 },
  { weekday: 5, sessions: ['Football match'], calories: 2800, protein: 190, steps: 8000, water: 3.5 },
  { weekday: 6, sessions: ['Back & Bis'], calories: 2600, protein: 190, steps: 8000, water: 3.0 },
]

export const SEED_WEEK_PLAN = {
  type: 'week_plan',
  version: 1,
  week_start: '2026-10-12',
  summary: 'Week 1: work drinks Thursday (no run), no match Saturday so 5k time trial instead',
  days: [
    { date: '2026-10-12', sessions: ['Legs & Shoulders (gym)', '5-a-side football'], calories: 2900, protein: 190, steps: 8000, water: 3.0, note: 'Stop 1–2 reps short of failure on legs, football tonight' },
    { date: '2026-10-13', sessions: ['Chest & Tris (gym)'], calories: 2600, protein: 190, steps: 8000, water: 3.0 },
    { date: '2026-10-14', sessions: ['Football training'], calories: 2800, protein: 190, steps: 8000, water: 3.0 },
    { date: '2026-10-15', sessions: [], calories: 2800, protein: 190, steps: 8000, water: 3.0, note: 'Work drinks (~6 pints ≈ 1,300 kcal, included). Protein-heavy meal before. Shake and toast at home, not a takeaway' },
    { date: '2026-10-16', sessions: [], calories: 2300, protein: 190, steps: 10000, water: 2.5, note: 'Rest day. Still hit protein and steps' },
    { date: '2026-10-17', sessions: ['5k time trial'], calories: 2500, protein: 190, steps: 8000, water: 3.0, note: 'Baseline 5k. 10 min easy warm-up first, then run it properly. Log the time in today’s note' },
    { date: '2026-10-18', sessions: ['Back & Bis'], calories: 2500, protein: 190, steps: 8000, water: 3.0 },
  ],
}

export const BUILT_IN_SETTINGS = {
  plan_start: '2026-10-12',
  goal_date: '2026-12-19',
  start_weight: 96.0,
  goal_weight: 90.0,
  calorie_tolerance: 100,
}
