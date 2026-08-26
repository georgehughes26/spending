import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { formatGBP } from '../utils/format'

// The one signature entrance moment used across every page: content arrives
// as a confident, staggered rise -- not scattered per-element effects.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
}

export function FadeInStagger({ children, className = '' }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}

export function FadeInItem({ children, className = '' }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  )
}

// Numbers tally up to their value instead of popping in -- the "confident
// big number" moment a finance app earns honestly, since the figure is real.
export function AnimatedNumber({ value, format = 'gbp', showSign = false, pence = false, className = '' }) {
  const reduce = useReducedMotion()
  const numeric = Number(value) || 0
  const motionValue = useMotionValue(reduce ? numeric : 0)
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20, mass: 0.6 })
  const display = useTransform(spring, (v) =>
    format === 'gbp' ? formatGBP(v, { showSign, pence }) : Math.round(v).toLocaleString('en-GB'),
  )

  useEffect(() => {
    motionValue.set(reduce ? numeric : motionValue.get())
    if (!reduce) spring.set(numeric)
  }, [numeric, reduce]) // eslint-disable-line react-hooks/exhaustive-deps

  return <motion.span className={className}>{display}</motion.span>
}

// Just a press acknowledgment on click -- no hover scaling, that read as
// overkill on a dense data app where most "hover" is actually a mouse just
// passing over on its way somewhere else.
export const tapScale = { whileTap: { scale: 0.98 } }

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

// Every route's content sits inside this so page changes read as one
// deliberate transition instead of an instant swap.
export function PageTransition({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
