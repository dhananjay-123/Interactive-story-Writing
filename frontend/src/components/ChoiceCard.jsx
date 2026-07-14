import { useState } from 'react'

export default function ChoiceCard({ choice, index, onSelect, disabled, unwritten }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => !disabled && onSelect(choice, index)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      className="animate-fadeUp w-full text-left"
      style={{
        animationDelay: `${index * 0.1}s`,
        background: hovered
          ? 'rgba(var(--gold-rgb),0.10)'
          : 'var(--surface)',
        border: `1px solid ${hovered ? 'rgba(var(--gold-rgb),0.5)' : 'rgba(var(--panel-rgb),var(--pa08))'}`,
        borderRadius: '8px',
        padding: '20px 24px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        boxShadow: hovered && !disabled ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
        transition: 'background 0.25s ease, border-color 0.25s ease, transform 0.2s ease, box-shadow 0.25s ease',
        transform: hovered && !disabled ? 'translateX(6px)' : 'translateX(0)',
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
      <span style={{ flex: 1, color: 'var(--parchment)', opacity: hovered ? 1 : 0.92, lineHeight: '1.6', fontSize: '15px' }}>
        {choice.text}
      </span>
      {unwritten && (
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
