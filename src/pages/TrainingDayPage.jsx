import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTrainingData } from '../hooks/useTrainingData'
import { FadeInItem, FadeInStagger, tapScale } from '../components/motion'
import ProgressRing from '../components/training/ProgressRing'
import OnTrackBadge from '../components/training/OnTrackBadge'
import HabitTickRow from '../components/training/HabitTickRow'
import HabitNumberRow from '../components/training/HabitNumberRow'
import { DrinksStepper, NoteField } from '../components/training/MiscRows'
import NudgeBanners from '../components/training/NudgeBanners'
import StreaksCard from '../components/training/StreaksCard'
import WeekPlanImportModal from '../components/training/WeekPlanImportModal'
import CheckInExportButton from '../components/training/CheckInExportButton'
import TrainingSubNav from '../components/training/TrainingSubNav'
import LiftLogCard from '../components/training/LiftLogCard'
import { resolveDayPlan } from '../lib/habits/dayPlan'
import { scoreDay, isNumberHabitHit, caloriesStatus } from '../lib/habits/builtInHabits'
import { trendWeight, goalLineWeight, onTrackStatus } from '../lib/habits/goalLine'
import { computeStreak } from '../lib/habits/streaks'
import { computeNudges } from '../lib/habits/nudges'
import { addDays, formatLongDay, todayISODate, weekNumberFor, totalWeeksFor, weekStartFor } from '../lib/habits/dates'

export default function TrainingDayPage() {
  const { date: dateParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const date = dateParam ?? todayISODate()
  const t = useTrainingData(user?.id)
  const [showImport, setShowImport] = useState(false)

  if (t.loading) {
    return <p className="mx-auto max-w-2xl px-5 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading your training data…</p>
  }
  if (t.error || !t.settings) {
    return (
      <p className="mx-auto max-w-2xl px-5 py-6 text-sm text-red-600 dark:text-red-400">
        Couldn't load your training data{t.error ? `: ${t.error}` : ''}. If this says a table is missing, the habit-tracker
        migration (supabase/migration_habit_tracker.sql) needs to be run in the Supabase SQL editor first.
      </p>
    )
  }

  const { settings, template, weekPlans, customHabits, dailyLogsByDate } = t
  const dayPlan = resolveDayPlan(date, weekPlans, template)
  const log = dailyLogsByDate[date] ?? null
  const score = scoreDay(dayPlan, log, settings, customHabits, dailyLogsByDate, date)

  const trend = trendWeight(date, dailyLogsByDate)
  const goalLine = goalLineWeight(date, settings)
  const track = onTrackStatus(trend, goalLine)

  const weekNum = weekNumberFor(date, settings.plan_start)
  const totalWeeks = totalWeeksFor(settings.plan_start, settings.goal_date)
  const nudges = computeNudges({ settings, template, weekPlans, dailyLogsByDate, customHabits })

  const goPrev = () => navigate(`/training/day/${addDays(date, -1)}`)
  const goNext = () => navigate(`/training/day/${addDays(date, 1)}`)

  const streakFor = (ref) => computeStreak(ref, settings.plan_start, { dailyLogsByDate, weekPlans, template, settings })?.current ?? 0

  // Calories is a ceiling, not a target to land on exactly -- under (or on)
  // it is a hit, only going over the tolerance buffer is a miss.
  const calStatus = caloriesStatus(log?.calories, dayPlan.calories, settings.calorie_tolerance)
  const calStatusLabel = calStatus == null
    ? undefined
    : calStatus === 'over'
      ? `${Math.abs(log.calories - dayPlan.calories)} over the ${dayPlan.calories} max`
      : `within the ${dayPlan.calories} max`

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-10">
      <TrainingSubNav />
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) goNext()
              else if (info.offset.x > 80) goPrev()
            }}
            className="rounded-2xl border border-pink-200 bg-white p-5 shadow-[0_8px_24px_-8px_rgba(219,39,119,0.18)] dark:border-[var(--border-dark)] dark:bg-[var(--surface-dark)] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-start justify-between gap-3">
              <motion.button {...tapScale} type="button" onClick={goPrev} aria-label="Previous day" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10">
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
              </motion.button>

              <div className="min-w-0 flex-1 text-center">
                <label className="inline-block cursor-pointer">
                  <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{formatLongDay(date)}</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => e.target.value && navigate(`/training/day/${e.target.value}`)}
                    className="absolute h-0 w-0 opacity-0"
                  />
                </label>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Week {weekNum} of {totalWeeks}</div>
                <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {dayPlan.sessions.length > 0 ? dayPlan.sessions.join(' + ') : 'Rest day'}
                </div>
                <div className="mt-2 flex justify-center"><OnTrackBadge track={track} /></div>
              </div>

              <motion.button {...tapScale} type="button" onClick={goNext} aria-label="Next day" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10">
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 4.5 13 10l-5.5 5.5" /></svg>
              </motion.button>
            </div>

            {dayPlan.note && (
              <p className="mt-3 rounded-lg bg-pink-50 p-3 text-sm text-pink-700 dark:bg-emerald-500/10 dark:text-emerald-400">{dayPlan.note}</p>
            )}

            <div className="mt-4 flex items-center justify-center gap-3">
              <ProgressRing done={score.done} total={score.total} />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{score.done}/{score.total} done today</span>
            </div>
          </motion.div>
        </FadeInItem>

        <FadeInItem>
          <NudgeBanners nudges={nudges} />
        </FadeInItem>

        <FadeInItem className="flex flex-wrap gap-2">
          <motion.button {...tapScale} type="button" onClick={() => setShowImport(true)} className="min-h-11 flex-1 cursor-pointer rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-pink-500 dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-300">
            Import week plan
          </motion.button>
          <CheckInExportButton
            className="flex-1"
            weekStart={weekStartFor(date)}
            settings={settings}
            template={template}
            weekPlans={weekPlans}
            dailyLogsByDate={dailyLogsByDate}
          />
        </FadeInItem>

        <FadeInItem className="flex flex-col gap-2">
          <HabitTickRow label="Creatine" done={!!log?.creatine} streak={streakFor({ kind: 'tick', key: 'creatine' })} onToggle={() => t.setLogField(date, 'creatine', !log?.creatine)} />
          <HabitTickRow label="Vitamin D" done={!!log?.vit_d} streak={streakFor({ kind: 'tick', key: 'vit_d' })} onToggle={() => t.setLogField(date, 'vit_d', !log?.vit_d)} />
          {dayPlan.sessions.map((name, i) => (
            <HabitTickRow
              key={i}
              label={name}
              done={!!log?.session_ticks?.[i]}
              onToggle={() => t.toggleSessionTick(date, i, dayPlan.sessions.length)}
            />
          ))}
        </FadeInItem>

        <FadeInItem className="flex flex-col gap-2">
          <HabitNumberRow
            label="Weight" value={log?.weight ?? null} unit="kg" decimals={1}
            streak={streakFor({ kind: 'number', key: 'weight' })}
            onCommit={(v) => t.setLogField(date, 'weight', v)}
          />
          <HabitNumberRow
            label="Calories" value={log?.calories ?? null} target={dayPlan.calories} unit="" decimals={0}
            status={calStatus} statusLabel={calStatusLabel}
            onCommit={(v) => t.setLogField(date, 'calories', v)}
          />
          <HabitNumberRow
            label="Protein" value={log?.protein ?? null} target={dayPlan.protein} unit="g" decimals={0}
            status={isNumberHabitHit('protein', log?.protein ?? null, dayPlan.protein, settings.calorie_tolerance) ? 'hit' : 'miss'}
            streak={streakFor({ kind: 'number', key: 'protein' })}
            onCommit={(v) => t.setLogField(date, 'protein', v)}
          />
          <HabitNumberRow
            label="Steps" value={log?.steps ?? null} target={dayPlan.steps} unit="" decimals={0}
            status={isNumberHabitHit('steps', log?.steps ?? null, dayPlan.steps, settings.calorie_tolerance) ? 'hit' : 'miss'}
            streak={streakFor({ kind: 'number', key: 'steps' })}
            onCommit={(v) => t.setLogField(date, 'steps', v)}
          />
          <HabitNumberRow
            label="Water" value={log?.water ?? null} target={dayPlan.water} unit="L" decimals={1}
            status={isNumberHabitHit('water', log?.water ?? null, dayPlan.water, settings.calorie_tolerance) ? 'hit' : 'miss'}
            quickAdd={[
              { amount: 0.25, label: '+250ml' },
              { amount: 0.5, label: '+500ml' },
              { amount: 0.568, label: '+568ml (pint)' },
              { amount: 0.71, label: '+710ml (Owala)' },
            ]}
            streak={streakFor({ kind: 'number', key: 'water' })}
            onCommit={(v) => t.setLogField(date, 'water', v)}
          />
          <DrinksStepper value={log?.drinks ?? 0} onChange={(v) => t.setDrinks(date, v)} />

          {customHabits.map((custom) =>
            custom.type === 'tick' ? (
              <HabitTickRow
                key={custom.id}
                label={custom.label}
                done={!!log?.custom_values?.[custom.id]}
                streak={streakFor({ kind: 'custom', custom })}
                onToggle={() => t.setCustomValue(date, custom.id, !log?.custom_values?.[custom.id])}
              />
            ) : (
              <HabitNumberRow
                key={custom.id}
                label={custom.label}
                value={log?.custom_values?.[custom.id] ?? null}
                target={custom.target}
                unit={custom.unit ?? ''}
                quickAdd={custom.quick_add}
                status={custom.target != null ? (Number(log?.custom_values?.[custom.id] ?? -Infinity) >= custom.target ? 'hit' : 'miss') : undefined}
                streak={streakFor({ kind: 'custom', custom })}
                onCommit={(v) => t.setCustomValue(date, custom.id, v)}
              />
            ),
          )}

          <NoteField value={log?.note ?? ''} onCommit={(v) => t.setLogField(date, 'note', v)} />
        </FadeInItem>

        <FadeInItem>
          <LiftLogCard date={date} lifts={log?.lifts ?? []} liftTargets={dayPlan.liftTargets} onChange={(lifts) => t.setLifts(date, lifts)} />
        </FadeInItem>

        <FadeInItem>
          <StreaksCard settings={settings} template={template} weekPlans={weekPlans} dailyLogsByDate={dailyLogsByDate} customHabits={customHabits} />
        </FadeInItem>
      </FadeInStagger>

      {showImport && (
        <WeekPlanImportModal
          weekPlans={weekPlans}
          template={template}
          dailyLogsByDate={dailyLogsByDate}
          onConfirm={t.importWeekPlan}
          onClose={() => setShowImport(false)}
        />
      )}
    </main>
  )
}
