import { useState } from 'react'
import GameBoards from './GameBoards'
import { formatDuration } from '../../games/format'

// The score screen, shown once the case closes — the reader solved it, or the
// story reached an ending and told them. It sits below the closing block beside
// the endings collection, in the same shape and weight, so finishing a Story Game
// feels like finishing a story rather than clearing a level.
//
// It never says what the answer was. That is the story's to tell, in its own
// passages, at its own pace.
// `bare` drops the card chrome so the same summary can sit inside the notebook
// panel, where it is already framed — one component, two placements, no drift
// between what the two of them say.
export default function CaseResolution({ game, signedIn, bare = false }) {
  const [showBoards, setShowBoards] = useState(false)
  const session = game?.session
  if (!game || !session?.finished) return null

  const rank = session.rank?.current
  const solved = session.solved

  return (
    <div
      className={bare ? undefined : 'animate-fadeUp'}
      style={
        bare
          ? { textAlign: 'left' }
          : {
              margin: '36px auto 0',
              maxWidth: '520px',
              padding: '24px 26px 26px',
              border: '1px solid rgba(var(--gold-rgb),0.25)',
              borderRadius: 'var(--r-md)',
              background: 'rgba(var(--gold-rgb),0.04)',
              textAlign: 'left',
            }
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8 }}>
          {solved ? 'Case closed' : 'Case notes, closed'}
        </p>
        <span className="font-story" style={{ fontSize: '20px', color: 'var(--parchment)' }}>
          {session.score}
        </span>
      </div>

      <p className="font-story" style={{ fontSize: '14.5px', fontStyle: 'italic', lineHeight: 1.65, color: 'rgba(var(--text-rgb),var(--ta70))', marginTop: '10px' }}>
        {solved
          ? game.mode.solvedLine
          : 'The story told you itself. That is a perfectly good way to find out.'}
      </p>

      {rank && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          <span className="font-story" style={{ fontSize: '17px', color: 'var(--gold)' }}>{rank.label}</span>
          <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta35))' }}>
            {session.rank.ladder}
          </span>
        </div>
      )}

      <dl style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', margin: '16px 0 0' }}>
        <Fact label="Clues" value={`${game.notebook?.length || 0} of ${game.clueTotal}`} />
        <Fact label="Answers used" value={session.attempts} />
        <Fact label="Time" value={formatDuration(session.elapsedMs)} />
      </dl>

      {session.perfect && (
        <p style={{ fontSize: '12px', letterSpacing: '0.06em', color: 'var(--gold)', marginTop: '14px' }}>
          Everything noticed, first answer, ahead of the reveal.
        </p>
      )}

      <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(var(--panel-rgb),var(--pa06))' }}>
        {showBoards ? (
          <GameBoards storyId={game.storyId} signedIn={signedIn} />
        ) : (
          <button
            onClick={() => setShowBoards(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: '12px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              cursor: 'pointer',
            }}
          >
            How others got on →
          </button>
        )}
      </div>
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div>
      <dt style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta35))' }}>
        {label}
      </dt>
      <dd className="font-story" style={{ fontSize: '15px', color: 'rgba(var(--text-rgb),var(--ta82))', margin: '3px 0 0' }}>
        {value}
      </dd>
    </div>
  )
}
