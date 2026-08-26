export default function Card({ title, className = '', titleClassName = '', children }) {
  return (
    <section
      className={`rounded-2xl border border-pink-200 dark:border-[var(--border-dark)] bg-white dark:bg-[var(--surface-dark)] p-5 shadow-[0_8px_24px_-8px_rgba(219,39,119,0.18)] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] ${className}`}
    >
      {title && (
        <h2 className={`mb-4 text-sm font-medium uppercase tracking-wide text-pink-700 dark:text-emerald-400 ${titleClassName}`}>
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
