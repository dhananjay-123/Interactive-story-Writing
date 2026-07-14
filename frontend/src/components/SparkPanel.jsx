import { useState } from 'react'
import { generateSpark } from '../utils/sparks'

// "Need a spark?" — a folded-away prompt generator for the create page. Draws
// from the local spark pools (no service, no wait), honouring the genre the
// author has already picked, or roaming free when they haven't.
export default function SparkPanel({ genre }) {
  const [spark, setSpark] = useState(null)

  const draw = () => setSpark(generateSpark(genre || undefined))

  if (!spark) {
    return (
      <button
        onClick={draw}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          fontFamily: 'inherit',
          fontSize: '12px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(var(--gold-rgb),0.75)',
          cursor: 'pointer',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--gold-rgb),0.75)')}
      >
        ✦ Need a spark?
      </button>
    )
  }

  return (
    <div
      className="animate-fadeUp"
      style={{
        border: '1px solid rgba(var(--gold-rgb),0.25)',
        borderRadius: '4px',
        background: 'rgba(var(--gold-rgb),0.04)',
        padding: '20px 22px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8 }}>
          A spark {!genre && <span style={{ opacity: 0.7 }}>— {spark.genre.replace('_', '-')}</span>}
        </p>
        <button onClick={() => setSpark(null)} style={sparkLinkStyle} aria-label="Put the spark away">
          ×
        </button>
      </div>

      <SparkLine label="Premise" text={spark.premise} serif />
      <SparkLine label="Hold in reserve" text={spark.twist} />
      <SparkLine label="Try this" text={spark.constraint} last />

      <div style={{ display: 'flex', gap: '18px', marginTop: '18px' }}>
        <button
          onClick={draw}
          style={{ ...sparkLinkStyle, color: 'var(--gold)' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.75)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
        >
          Strike another
        </button>
      </div>
    </div>
  )
}

function SparkLine({ label, text, serif, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : '14px' }}>
      <p style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '4px' }}>
        {label}
      </p>
      <p
        className={serif ? 'font-story' : undefined}
        style={{
          fontSize: serif ? '16px' : '14px',
          lineHeight: 1.65,
          color: serif ? 'var(--parchment)' : 'rgba(var(--text-rgb),var(--ta70))',
          fontStyle: serif ? 'italic' : 'normal',
        }}
      >
        {text}
      </p>
    </div>
  )
}

const sparkLinkStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontFamily: 'inherit',
  fontSize: '12px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(var(--text-rgb),var(--ta45))',
  cursor: 'pointer',
  transition: 'opacity 0.2s ease',
}
