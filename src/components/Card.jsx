// `action` is an optional control (e.g. a + button) shown on the right of
// the title row.
export default function Card({ title, action, className = '', titleClassName = '', children }) {
  const titleClass = `text-sm font-medium uppercase tracking-wide text-pink-700 dark:text-emerald-400 ${titleClassName}`
  return (
    <section
      className={`rounded-2xl border border-pink-200 dark:border-[var(--border-dark)] bg-white dark:bg-[var(--surface-dark)] p-5 shadow-[0_8px_24px_-8px_rgba(219,39,119,0.18)] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] ${className}`}
    >
      {title && !action && <h2 className={`mb-4 ${titleClass}`}>{title}</h2>}
      {title && action && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={titleClass}>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
