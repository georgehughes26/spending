import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Card from './Card'
import { tapScale } from './motion'
import { useResaleLog } from '../hooks/useResaleLog'

const inputClass =
  'min-h-11 w-full rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-pink-600 dark:focus:border-emerald-400'

const today = () => new Date().toISOString().slice(0, 10)

// An entry saved under an option that's since been renamed or removed still
// needs to show (and stay selected) when you edit it.
function optionsWith(options, current) {
  return current && !options.some((o) => o.value === current) ? [...options, { value: current }] : options
}

function TypeSelect({ config, value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {optionsWith(config.options, value).map((o) => (
        <option key={o.value} value={o.value}>{o.hint ? `${o.value} (${o.hint})` : o.value}</option>
      ))}
    </select>
  )
}

function ValueInput({ config, value, onChange, autoFocus = false }) {
  return (
    <div className="flex h-11 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 text-sm focus-within:border-pink-600 dark:focus-within:border-emerald-400">
      <input
        type="number"
        min="0"
        step={config.step}
        inputMode="decimal"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full bg-transparent text-zinc-900 dark:text-zinc-100 outline-none"
      />
      <span className="shrink-0 text-zinc-500 dark:text-zinc-400">{config.unitSuffix}</span>
    </div>
  )
}

function AddEntryModal({ config, onAdd, onClose }) {
  const [date, setDate] = useState(today)
  const [type, setType] = useState(config.options[0].value)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const valid = Number(value) > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      await onAdd({ [config.dateField]: date || today(), [config.typeField]: type, [config.valueField]: Number(value) })
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-[var(--surface-dark)] sm:rounded-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{config.addTitle}</h3>
        <div className="mb-4 flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500 dark:text-zinc-400">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500 dark:text-zinc-400">{config.typeLabel}</span>
            <TypeSelect config={config} value={type} onChange={setType} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500 dark:text-zinc-400">{config.valueLabel}</span>
            <ValueInput config={config} value={value} onChange={setValue} autoFocus />
          </label>
        </div>
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <motion.button
            {...tapScale}
            type="submit"
            disabled={saving || !valid}
            className="min-h-11 flex-1 cursor-pointer rounded-lg bg-pink-600 dark:bg-emerald-400 text-sm font-medium text-white dark:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </motion.button>
          <motion.button {...tapScale} type="button" onClick={onClose} className="min-h-11 cursor-pointer px-3 text-sm text-zinc-500 dark:text-zinc-400">
            Cancel
          </motion.button>
        </div>
      </motion.form>
    </motion.div>
  )
}

function EntryRow({ config, entry, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(entry[config.dateField])
  const [type, setType] = useState(entry[config.typeField])
  const [value, setValue] = useState(entry[config.valueField])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const cancel = () => {
    setDate(entry[config.dateField])
    setType(entry[config.typeField])
    setValue(entry[config.valueField])
    setError(null)
    setEditing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onUpdate(entry.id, { [config.dateField]: date, [config.typeField]: type, [config.valueField]: Number(value) || 0 })
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-3">
        <TypeSelect config={config} value={type} onChange={setType} />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          <ValueInput config={config} value={value} onChange={setValue} />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <motion.button {...tapScale} type="button" onClick={handleSave} disabled={saving || !date} className="min-h-9 cursor-pointer whitespace-nowrap rounded-lg bg-pink-600 dark:bg-emerald-400 px-4 text-sm font-medium text-white dark:text-zinc-950 disabled:opacity-50">
            Save
          </motion.button>
          <motion.button {...tapScale} type="button" onClick={cancel} className="min-h-9 cursor-pointer px-2 text-sm text-zinc-500 dark:text-zinc-400">
            Cancel
          </motion.button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="min-w-0 text-zinc-700 dark:text-zinc-300">
        {entry[config.typeField]} <span className="text-xs text-zinc-500 dark:text-zinc-400">· {entry[config.dateField]}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{config.format(Number(entry[config.valueField]) || 0)}</span>
        <button type="button" onClick={() => setEditing(true)} className="cursor-pointer text-xs font-medium text-pink-700 dark:text-emerald-400 hover:underline">
          Edit
        </button>
        <button type="button" onClick={() => onDelete(entry.id)} className="cursor-pointer text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
          Remove
        </button>
      </span>
    </li>
  )
}

// Mileage / hours-worked log: a + button opens a small add popup, and the
// history underneath works like General Costs (edit inline, remove). Just a
// record for now -- nothing here feeds into profit or totals elsewhere.
export default function ResaleLogCard({ config, userId }) {
  const { entries, loading, error, addEntry, updateEntry, deleteEntry } = useResaleLog(userId, config.table, config.dateField)
  const [adding, setAdding] = useState(false)

  const total = entries.reduce((t, e) => t + (Number(e[config.valueField]) || 0), 0)

  return (
    <Card
      title={config.title}
      className="h-full"
      action={
        <motion.button
          {...tapScale}
          type="button"
          onClick={() => setAdding(true)}
          aria-label={config.addTitle}
          title={config.addTitle}
          className="-my-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-pink-100 text-pink-700 transition-colors duration-150 hover:bg-pink-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
        </motion.button>
      }
    >
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">{config.description}</p>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn't load {config.title.toLowerCase()}: {error}. If this says the table is missing, run
          supabase/migration_resale_mileage_hours.sql in the Supabase SQL Editor.
        </p>
      ) : loading && entries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : entries.length > 0 ? (
        <ul className="flex max-h-96 flex-col divide-y divide-zinc-200 overflow-y-auto dark:divide-white/10">
          {entries.map((entry) => (
            <EntryRow key={entry.id} config={config} entry={entry} onUpdate={updateEntry} onDelete={deleteEntry} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{config.emptyLabel}</p>
      )}

      {entries.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-zinc-200 dark:border-white/10 pt-3 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Total</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{config.format(total)}</span>
        </div>
      )}

      <AnimatePresence>
        {adding && <AddEntryModal config={config} onAdd={addEntry} onClose={() => setAdding(false)} />}
      </AnimatePresence>
    </Card>
  )
}
