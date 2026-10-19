import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { tapScale } from '../motion'
import Card from '../Card'

const fieldClass = 'min-h-11 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-2 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

function prefillFromTargets(liftTargets) {
  return liftTargets.map((t) => ({ exercise: t.exercise, sets: [{ reps: null, weight: t.weight }] }))
}

// Free-form -- no predefined exercise list, and no judgement here on
// whether to go up/hold/drop (that's a separate coaching conversation).
// This just captures what was actually lifted per set, and shows whatever
// target weight the coach set for an exercise this week (via the imported
// week plan's lift_targets) alongside the input for it. Reps/weight are
// kept as null (not filtered out or forced to 0) while a set is mid-entry.
export default function LiftLogCard({ date, lifts, liftTargets = [], onChange }) {
  const [draft, setDraft] = useState(lifts.length > 0 ? lifts : prefillFromTargets(liftTargets))

  // Nothing's been logged for this day yet -- pre-fill a row per target
  // exercise (weight seeded from the target, reps left blank) so there's
  // something to fill in rather than a blank "+ Add exercise" to start
  // from. This is local only: it isn't written to the database until the
  // user actually touches a field, so an untouched target doesn't silently
  // look like a logged set.
  //
  // Keyed on content, not just `date` -- importing a week plan while
  // already viewing today's day doesn't change `date`, so a date-only key
  // missed the newly-arrived liftTargets entirely and the card stayed
  // blank. JSON.stringify as a dependency is deliberate here: these are
  // small arrays and this is the simplest correct way to react to their
  // actual content changing, not just their reference.
  const seedKey = lifts.length > 0 ? JSON.stringify(lifts) : JSON.stringify(liftTargets)
  useEffect(() => {
    setDraft(lifts.length > 0 ? lifts : prefillFromTargets(liftTargets))
  }, [date, seedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (next) => {
    setDraft(next)
    onChange(next)
  }

  const addExercise = () => commit([...draft, { exercise: '', sets: [{ reps: null, weight: null }] }])
  const removeExercise = (i) => commit(draft.filter((_, idx) => idx !== i))
  const addSet = (i) => {
    const lastWeight = draft[i].sets[draft[i].sets.length - 1]?.weight ?? null
    commit(draft.map((ex, idx) => (idx === i ? { ...ex, sets: [...ex.sets, { reps: null, weight: lastWeight }] } : ex)))
  }
  const removeSet = (i, si) => commit(draft.map((ex, idx) => (idx === i ? { ...ex, sets: ex.sets.filter((_, sidx) => sidx !== si) } : ex)))

  const updateExerciseName = (i, name) => setDraft(draft.map((ex, idx) => (idx === i ? { ...ex, exercise: name } : ex)))
  const updateSetField = (i, si, field, raw) => {
    const value = raw === '' ? null : Number(raw)
    setDraft(draft.map((ex, idx) => (idx === i ? { ...ex, sets: ex.sets.map((s, sidx) => (sidx === si ? { ...s, [field]: value } : s)) } : ex)))
  }
  const commitDraft = () => commit(draft)

  const matchedTarget = (exerciseName) =>
    liftTargets.find((t) => t.exercise.trim().toLowerCase() === exerciseName.trim().toLowerCase())

  return (
    <Card title="Lifts">
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Log what you actually lifted per set -- it's included in the check-in export so whoever you're training with can judge progress.
      </p>

      {liftTargets.length > 0 && (
        <p className="mb-3 rounded-lg bg-pink-50 p-3 text-sm text-pink-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          This week's targets: {liftTargets.map((t) => `${t.exercise} ${t.weight}kg`).join(', ')}
        </p>
      )}

      {draft.length === 0 && <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">No exercises logged for today yet.</p>}

      <div className="flex flex-col gap-3">
        {draft.map((ex, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 p-3 dark:border-white/10">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="text"
                value={ex.exercise}
                onChange={(e) => updateExerciseName(i, e.target.value)}
                onBlur={commitDraft}
                placeholder="Exercise (e.g. Bench press)"
                className={`${fieldClass} min-w-0 flex-1`}
              />
              <motion.button {...tapScale} type="button" onClick={() => removeExercise(i)} className="min-h-11 cursor-pointer whitespace-nowrap rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/10">
                Remove
              </motion.button>
            </div>

            {matchedTarget(ex.exercise) && (
              <p className="mb-2 text-xs font-medium text-pink-700 dark:text-emerald-400">Target: {matchedTarget(ex.exercise).weight}kg</p>
            )}

            <div className="flex flex-col gap-2">
              {ex.sets.map((s, si) => (
                <div key={si} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-xs text-zinc-400">{si + 1}</span>
                  <input
                    type="number" inputMode="numeric"
                    value={s.reps ?? ''}
                    onChange={(e) => updateSetField(i, si, 'reps', e.target.value)}
                    onBlur={commitDraft}
                    placeholder="Reps"
                    className={`${fieldClass} w-full min-w-0 flex-1`}
                  />
                  <input
                    type="number" inputMode="decimal" step="0.5"
                    value={s.weight ?? ''}
                    onChange={(e) => updateSetField(i, si, 'weight', e.target.value)}
                    onBlur={commitDraft}
                    placeholder="kg"
                    className={`${fieldClass} w-full min-w-0 flex-1`}
                  />
                  <motion.button {...tapScale} type="button" onClick={() => removeSet(i, si)} aria-label="Remove set" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10">
                    ×
                  </motion.button>
                </div>
              ))}
            </div>

            <motion.button {...tapScale} type="button" onClick={() => addSet(i)} className="mt-2 min-h-9 cursor-pointer rounded-full bg-pink-100 px-3 text-xs font-medium text-pink-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              + Add set
            </motion.button>
          </div>
        ))}
      </div>

      <motion.button {...tapScale} type="button" onClick={addExercise} className="mt-3 min-h-11 w-full cursor-pointer rounded-xl bg-pink-600 text-sm font-semibold text-white dark:bg-emerald-400 dark:text-zinc-950">
        + Add exercise
      </motion.button>
    </Card>
  )
}
