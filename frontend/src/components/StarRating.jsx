import { useState } from 'react'

function Star({ size = 16, fill = 0 }) {
  // fill 0..1 → partial gold via an inset clip on a second, filled star.
  const id = 'sc' + Math.random().toString(36).slice(2, 8)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      <path
        d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.9l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94z"
        fill="none"
        stroke="rgba(var(--gold-rgb),0.55)"
        strokeWidth="1.4"
      />
      <path
        d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.9l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94z"
        fill="var(--gold)"
        clipPath={`url(#${id})`}
      />
    </svg>
  )
}

// Read-only display of an average, e.g. ★★★★☆  4.5 (12)
export default function StarRating({ value = 0, count, size = 15, showValue = true }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ display: 'inline-flex', gap: '2px' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={size} fill={Math.max(0, Math.min(1, value - i))} />
        ))}
      </span>
      {showValue && (
        <span style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta45))' }}>
          {value > 0 ? value.toFixed(1) : '—'}
          {typeof count === 'number' && count > 0 && (
            <span style={{ color: 'rgba(var(--text-rgb),var(--ta30))' }}> ({count})</span>
          )}
        </span>
      )}
    </span>
  )
}

// Interactive 5-star input. `value` is the reader's current rating (0 = none).
export function StarInput({ value = 0, size = 26, onRate, disabled }) {
  const [hover, setHover] = useState(0)
  const active = hover || value
  return (
    <span style={{ display: 'inline-flex', gap: '4px' }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onMouseEnter={() => !disabled && setHover(n)}
          onClick={() => !disabled && onRate(n)}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          style={{ background: 'none', border: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer', lineHeight: 0 }}
        >
          <Star size={size} fill={active >= n ? 1 : 0} />
        </button>
      ))}
    </span>
  )
}
