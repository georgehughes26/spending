import { motion } from 'framer-motion'
import { tapScale } from './motion'

// The small round + shown in a card's title row (Card's `action` slot) that
// opens that card's add pop-up.
export default function CardAddButton({ label, onClick }) {
  return (
    <motion.button
      {...tapScale}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="-my-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-pink-100 text-pink-700 transition-colors duration-150 hover:bg-pink-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25"
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
    </motion.button>
  )
}
