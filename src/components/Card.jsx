export default function Card({ title, className = '', children }) {
  return (
    <section
      className={`rounded-2xl border border-pink-200 dark:border-[var(--border-dark)] bg-white dark:bg-[var(--surface-dark)] p-5 shadow-sm shadow-pink-100 dark:shadow-none ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-pink-700 dark:text-emerald-400">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
