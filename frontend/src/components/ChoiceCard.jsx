import { useState } from 'react'

// `pending` is the choice the reader just took, while its passage is still on
// the wire. It stays lit while the others dim, so a slow response reads as the
// story turning rather than as nothing having happened.
export default function ChoiceCard({ choice, index, onSelect, disabled, pending, unwritten }) {
  const [hovered, setHovered] = useState(false)
  const lit = hovered || pending

  return (
    <button
      onClick={() => !disabled && onSelect(choice, index)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      aria-busy={pending || undefined}
      className="animate-fadeUp w-full text-left"
      style={{
        animationDelay: `${index * 0.1}s`,
        background: lit
          ? 'rgba(var(--gold-rgb),0.10)'
          : 'var(--surface)',
        border: `1px solid ${lit ? 'rgba(var(--gold-rgb),0.5)' : 'rgba(var(--panel-rgb),var(--pa08))'}`,
        borderRadius: '8px',
        padding: '20px 24px',
        cursor: disabled ? (pending ? 'progress' : 'not-allowed') : 'pointer',
        opacity: disabled && !pending ? 0.5 : 1,
        boxShadow: lit && !disabled ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
        transition: 'background 0.25s ease, border-color 0.25s ease, transform 0.2s ease, box-shadow 0.25s ease',
        transform: lit && (!disabled || pending) ? 'translateX(6px)' : 'translateX(0)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
      }}
    >
      <span
        className="font-story text-lg shrink-0 mt-0.5"
        style={{ color: 'var(--gold)', opacity: 0.8 }}
      >
        {String.fromCharCode(65 + index)}.
      </span>
      <span style={{ flex: 1, color: 'var(--parchment)', opacity: lit ? 1 : 0.92, lineHeight: '1.6', fontSize: '15px' }}>
        {choice.text}
      </span>
      {pending && (
        <span
          className="shrink-0"
          style={{
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginTop: '4px',
            whiteSpace: 'nowrap',
            animation: 'subtlePulse 1.1s ease-in-out infinite',
          }}
        >
          Turning the page…
        </span>
      )}
      {unwritten && !pending && (
        <span
          className="shrink-0"
          style={{
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            border: '1px solid rgba(var(--gold-rgb),0.4)',
            borderRadius: '4px',
            padding: '3px 8px',
            marginTop: '2px',
            whiteSpace: 'nowrap',
          }}
        >
          Write →
        </span>
      )}
    </button>
  )
}
