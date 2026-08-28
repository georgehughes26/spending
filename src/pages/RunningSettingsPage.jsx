import { useState } from 'react'
import Card from '../components/Card'
import RunningSubNav from '../components/RunningSubNav'
import { FadeInItem, FadeInStagger } from '../components/motion'
import { useAuth } from '../context/AuthContext'
import { useRunningProfile } from '../hooks/useRunningProfile'
import { durationToString } from '../lib/running/format'

const inputClass =
  'min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

function parseMinSec(input) {
  const match = input.trim().match(/^(\d+):([0-5]?\d)$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function ProfileForm({ profile, onSave }) {
  const [pb, setPb] = useState(durationToString(profile.pb_5k_seconds))
  const [pbDate, setPbDate] = useState(profile.pb_5k_date?.slice(0, 10) ?? '')
  const [goal, setGoal] = useState(durationToString(profile.goal_5k_seconds))
  const [goalDate, setGoalDate] = useState(profile.goal_date.slice(0, 10))
  const [currentFitness, setCurrentFitness] = useState(durationToString(profile.current_fitness_5k_equiv_seconds))
  const [maxHr, setMaxHr] = useState(profile.observed_max_hr_bpm ? String(profile.observed_max_hr_bpm) : '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const pbSeconds = parseMinSec(pb)
    const goalSeconds = parseMinSec(goal)
    const fitnessSeconds = parseMinSec(currentFitness)
    if (pbSeconds === null || goalSeconds === null || fitnessSeconds === null) {
      setError('Times should be in mm:ss format, e.g. 26:00')
      return
    }

    setSaving(true)
    try {
      await onSave({
        pb_5k_seconds: pbSeconds,
        pb_5k_date: pbDate || null,
        goal_5k_seconds: goalSeconds,
        goal_date: goalDate,
        current_fitness_5k_equiv_seconds: fitnessSeconds,
        observed_max_hr_bpm: maxHr ? Number(maxHr) : null,
      })
      setMessage('Saved — your upcoming plan has been refreshed.')
    } catch (err) {
      setError(err.message ?? 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">5k PB (mm:ss)</span>
          <input value={pb} onChange={(e) => setPb(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">PB date</span>
          <input type="date" value={pbDate} onChange={(e) => setPbDate(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Goal 5k time (mm:ss)</span>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Goal date</span>
          <input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Current fitness estimate (mm:ss)</span>
          <input value={currentFitness} onChange={(e) => setCurrentFitness(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Observed max heart rate (bpm, optional)</span>
          <input type="number" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} className={inputClass} />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="min-h-11 self-start rounded-lg bg-pink-600 dark:bg-emerald-400 px-5 text-sm font-medium text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>

      {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  )
}

function FileField({ label, onChange }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-zinc-500 dark:text-zinc-400">{label}</span>
      <input
        type="file"
        accept=".gpx,.tcx"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className={`${inputClass} flex items-center file:mr-3 file:rounded-md file:border-0 file:bg-pink-600 dark:file:bg-emerald-400 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-white dark:file:text-zinc-950`}
      />
    </label>
  )
}

function CalibrateForm({ onCalibrate }) {
  const [easy, setEasy] = useState(null)
  const [intervalFile, setIntervalFile] = useState(null)
  const [tempo, setTempo] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const hasAny = easy || intervalFile || tempo

  async function handleSubmit(e) {
    e.preventDefault()
    if (!hasAny) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const input = {}
      if (easy) input.easy = { content: await easy.text(), fileName: easy.name }
      if (intervalFile) input.interval = { content: await intervalFile.text(), fileName: intervalFile.name }
      if (tempo) input.tempo = { content: await tempo.text(), fileName: tempo.name }
      const outcome = await onCalibrate(input)
      setMessage(
        `Starting fitness set to ${durationToString(outcome.newFitness5kEquivSeconds)} from ${outcome.used.length} run${outcome.used.length === 1 ? '' : 's'} — plan refreshed.`
      )
    } catch (err) {
      setError(err.message ?? 'Calibration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FileField label="Easy run" onChange={setEasy} />
        <FileField label="Interval run" onChange={setIntervalFile} />
        <FileField label="Tempo run" onChange={setTempo} />
      </div>

      <button
        type="submit"
        disabled={submitting || !hasAny}
        className="min-h-11 self-start rounded-lg bg-pink-600 dark:bg-emerald-400 px-5 text-sm font-medium text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Calibrating…' : 'Calibrate from these runs'}
      </button>

      {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  )
}

export default function RunningSettingsPage() {
  const { user } = useAuth()
  const { profile, loading, error, saveSettings, calibrate } = useRunningProfile(user?.id)

  if (loading) {
    return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  }
  if (error || !profile) {
    return (
      <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-red-600 dark:text-red-400">
        Couldn't load your profile: {error}
      </p>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-6">
      <FadeInStagger className="flex flex-col gap-5">
        <FadeInItem className="flex flex-col gap-3">
          <RunningSubNav />
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Running settings</h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Adjust your 5k PB, goal, and current fitness estimate. Saving refreshes the plan from these numbers.
            </p>
          </div>
        </FadeInItem>

        <FadeInItem>
          <Card>
            <ProfileForm key={profile.updated_at} profile={profile} onSave={saveSettings} />
          </Card>
        </FadeInItem>

        <FadeInItem>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-700 dark:text-emerald-400">
            Calibrate starting fitness
          </h2>
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            Already have an easy, interval, or tempo run from before you started this plan? Upload any of them here
            to set your starting fitness from real data instead of the default. This only updates your fitness
            estimate and refreshes upcoming targets — it doesn't touch this week's plan slots, so you can still
            upload your actual runs for this week separately.
          </p>
          <Card>
            <CalibrateForm onCalibrate={calibrate} />
          </Card>
        </FadeInItem>
      </FadeInStagger>
    </main>
  )
}
