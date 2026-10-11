import Card from '../Card'
import { TICK_HABITS, NUMBER_HABITS } from '../../lib/habits/builtInHabits'
import { computeStreak } from '../../lib/habits/streaks'

export default function StreaksCard({ settings, template, weekPlans, dailyLogsByDate, customHabits }) {
  const ctx = { dailyLogsByDate, weekPlans, template, settings }

  const rows = [
    ...TICK_HABITS.map((h) => ({ label: h.label, streak: computeStreak({ kind: 'tick', key: h.key }, settings.plan_start, ctx) })),
    ...NUMBER_HABITS.filter((h) => h.hitRule !== 'none').map((h) => ({
      label: h.label,
      streak: computeStreak({ kind: 'number', key: h.key }, settings.plan_start, ctx),
    })),
    ...customHabits.map((c) => ({ label: c.label, streak: computeStreak({ kind: 'custom', custom: c }, settings.plan_start, ctx) })),
  ].filter((r) => r.streak)

  return (
    <Card title="Streaks">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="text-zinc-500 dark:text-zinc-400">{r.label}</div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              {r.streak.current} <span className="text-xs font-normal text-zinc-400">now · best {r.streak.best}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
