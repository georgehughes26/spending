export default function Card({ title, className = '', children }) {
  return (
    <section
      className={`rounded-2xl border border-pink-900/30 bg-zinc-900/60 p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-pink-400/80">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
