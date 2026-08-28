const iconProps = { viewBox: '0 0 20 20', className: 'h-5 w-5 shrink-0', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function RunningNavIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="10" cy="11" r="6.5" />
      <path d="M10 7.5V11l2.5 1.5" />
      <path d="M7.8 2.5h4.4M15 4l-1.2 1.2" />
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 10.5l3.5 3.5L16 5.5" />
    </svg>
  )
}

export function SkipIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M6 5v10" />
      <path d="M8.5 10l7-5v10l-7-5z" />
    </svg>
  )
}
