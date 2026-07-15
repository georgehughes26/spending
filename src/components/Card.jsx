export default function Card({ title, className = '', children }) {
  return (
    <section
      className={`rounded-2xl border border-pink-200 bg-white p-5 shadow-sm shadow-pink-100 ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-pink-700">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
