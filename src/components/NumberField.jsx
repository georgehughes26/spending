export default function NumberField({ label, value, onChange, id }) {
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="mb-1 block text-zinc-500 dark:text-zinc-400">{label}</span>
      <div className="flex min-h-11 items-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 focus-within:border-pink-600 dark:focus-within:border-emerald-400">
        <span className="pl-3 text-zinc-500 dark:text-zinc-400">£</span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full rounded-lg bg-transparent px-2 py-2 text-zinc-900 dark:text-zinc-100 outline-none"
        />
      </div>
    </label>
  )
}
