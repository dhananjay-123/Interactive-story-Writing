import { useState } from 'react'
import { Link } from 'react-router-dom'

// The one moment the challenge announces itself: a quiet card above the opening
// passage saying what the reader is looking for. It appears once, it can be put
// away, and putting it away doesn't turn the challenge off — the notebook is
// still there for anyone who wants it.
//
// Nothing about it is required reading. A reader who dismisses it and never
// opens the notebook gets an ordinary story, exactly as written.
export default function ObjectiveCard({ game, signedIn }) {
  const [dismissed, setDismissed] = useState(false)
  if (!game || dismissed) return null
  // Once the case is closed the briefing has nothing left to say.
  if (game.session?.finished || game.session?.solved) return null

  return (
    <div
      className="animate-fadeUp"
      style={{
        marginBottom: '32px',
        padding: '20px 22px',
        border: '1px solid rgba(var(--gold-rgb),0.28)',
        borderRadius: 'var(--r-md)',
        background: 'rgba(var(--gold-rgb),0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.85 }}>
          {game.mode.label} · your objective
        </p>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Put the briefing away"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(var(--text-rgb),var(--ta35))',
            fontSize: '11px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          Put away
        </button>
      </div>

      <p className="font-story" style={{ fontSize: '17px', lineHeight: 1.6, color: 'var(--parchment)', marginTop: '10px' }}>
        {game.objective}
      </p>

      {game.briefing && (
        <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgba(var(--text-rgb),var(--ta60))', marginTop: '10px' }}>
          {game.briefing}
        </p>
      )}

      <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'rgba(var(--text-rgb),var(--ta45))', marginTop: '14px' }}>
        {signedIn ? (
          <>
            Read as you normally would — anything worth remembering goes into your case notes on its own.
            Answer whenever you are ready, or never.
          </>
        ) : (
          <>
            <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Sign in</Link>
            {' '}to keep case notes and submit an answer. The story reads the same either way.
          </>
        )}
      </p>
    </div>
  )
}
