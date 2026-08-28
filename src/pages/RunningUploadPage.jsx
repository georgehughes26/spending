import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import RunningSubNav from '../components/RunningSubNav'
import { FadeInItem, FadeInStagger } from '../components/motion'
import { useAuth } from '../context/AuthContext'
import { useRunningPlan } from '../hooks/useRunningPlan'
import { parseRunFile } from '../lib/running/parsing'
import { paceToString, runTypeLabel } from '../lib/running/format'

const inputClass =
  'min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

function currentWeekNumber(weeks) {
  const today = new Date().toISOString().slice(0, 10)
  const match = weeks.find((w) => w.start_date <= today && w.end_date >= today)
  return match?.week_number ?? weeks[weeks.length - 1]?.week_number ?? 1
}

export default function RunningUploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { weeks, runs, loading, error, uploadRun } = useRunningPlan(user?.id)

  const [file, setFile] = useState(null)
  const [plannedRunId, setPlannedRunId] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (error) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">Couldn't load your plan: {error}</p>
  }

  const nowWeek = currentWeekNumber(weeks)
  const upcoming = runs.filter((r) => r.week_number === nowWeek && r.status === 'upcoming')

  if (!initialized && upcoming.length > 0) {
    const preselect = Number(searchParams.get('planned_run_id'))
    const initialId = upcoming.some((r) => r.id === preselect) ? preselect : upcoming[0].id
    setPlannedRunId(initialId)
    setInitialized(true)
  }

  async function handleFileChange(f) {
    setFile(f)
    setSubmitError(null)
    if (!f) return
    try {
      const text = await f.text()
      const parsed = parseRunFile(text, f.name)
      let best = upcoming[0]
      let bestDiff = Infinity
      for (const run of upcoming) {
        if (run.target_pace_sec_per_km === null) continue
        const diff = Math.abs(parsed.avgPaceSecPerKm - run.target_pace_sec_per_km)
        if (diff < bestDiff) {
          bestDiff = diff
          best = run
        }
      }
      if (best) setPlannedRunId(best.id)
    } catch {
      // Auto-match is best-effort; the user can still pick manually and
      // upload will report a clear error if the file itself is invalid.
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file || plannedRunId === null) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const content = await file.text()
      const outcome = await uploadRun(content, file.name, plannedRunId)
      navigate(`/running/history/${outcome.completedRunId}`)
    } catch (err) {
      setSubmitError(err.message ?? 'Upload failed')
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem className="flex flex-col gap-3">
          <RunningSubNav />
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Upload a run</h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Export the GPX or TCX file from your watch, Garmin Connect, or Strava, then upload it here. For interval
              sessions, exporting the structured workout as TCX from Garmin Connect gives the most accurate analysis.
            </p>
          </div>
        </FadeInItem>

        <FadeInItem>
          {upcoming.length === 0 ? (
            <Card>
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">No runs left to complete this week.</p>
            </Card>
          ) : (
            <Card>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="text-sm">
                  <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Run file (.gpx or .tcx)</span>
                  <input
                    type="file"
                    accept=".gpx,.tcx"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                    className={`${inputClass} flex items-center file:mr-3 file:rounded-md file:border-0 file:bg-pink-600 dark:file:bg-emerald-400 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-white dark:file:text-zinc-950`}
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Which planned run does this fulfill?</span>
                  <select
                    value={plannedRunId ?? ''}
                    onChange={(e) => setPlannedRunId(Number(e.target.value))}
                    className={inputClass}
                  >
                    {upcoming.map((run) => (
                      <option key={run.id} value={run.id}>
                        {runTypeLabel(run.run_type)} — {run.target_distance_km}km
                        {run.target_pace_sec_per_km ? ` @ ${paceToString(run.target_pace_sec_per_km)}` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={!file || submitting}
                  className="min-h-11 self-start rounded-lg bg-pink-600 dark:bg-emerald-400 px-5 text-sm font-medium text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Uploading…' : 'Upload run'}
                </button>

                {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}
              </form>
            </Card>
          )}
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}
