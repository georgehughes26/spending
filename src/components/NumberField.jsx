export default function NumberField({ label, value, onChange, id }) {
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="mb-1 block text-zinc-400">{label}</span>
      <div className="flex min-h-11 items-center rounded-lg border border-zinc-700 bg-zinc-900 focus-within:border-pink-600">
        <span className="pl-3 text-zinc-500">£</span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full rounded-lg bg-transparent px-2 py-2 text-zinc-100 outline-none"
        />
      </div>
    </label>
  )
}
