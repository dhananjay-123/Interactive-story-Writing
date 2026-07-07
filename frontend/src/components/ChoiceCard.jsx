import { useState } from 'react'

export default function ChoiceCard({ choice, index, onSelect, disabled }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => !disabled && onSelect(choice)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      className="animate-fadeUp w-full text-left"
      style={{
        animationDelay: `${index * 0.1}s`,
        background: hovered
          ? 'rgba(201,168,76,0.08)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '4px',
        padding: '20px 24px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.25s ease, border-color 0.25s ease, transform 0.2s ease',
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
      <span style={{ color: hovered ? 'var(--parchment)' : 'rgba(250,248,243,0.8)', lineHeight: '1.6', fontSize: '15px' }}>
        {choice.text}
      </span>
    </button>
  )
}
