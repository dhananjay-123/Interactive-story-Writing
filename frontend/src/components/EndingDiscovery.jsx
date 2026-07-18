import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'

// The ending collection, shown when a reader closes a story. Found endings are
// broken seals with their first line; the rest stay sealed — the server never
// ships their text, so there is nothing here to spoil. `news` arrives from the
// progress save and marks this visit as a first-time discovery.
export default function EndingDiscovery({ storyId, currentNodeId, user, news }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    // The discovery is written by the progress save; give it a beat to land
    // before reading the collection, and refetch when the save confirms a find.
    const t = setTimeout(() => {
      api
        .get(`/api/stories/${storyId}/endings`)
        .then(({ data }) => { if (!cancelled) setData(data) })
        .catch(() => {})
    }, 450)
    return () => { cancelled = true; clearTimeout(t) }
  }, [storyId, news])

  if (!data || data.total < 2) return null // a single-ending story has nothing to collect

  const justFound = Boolean(news?.isNew && news?.nodeId === currentNodeId)
  const remaining = data.total - data.foundCount

  return (
    <div
      className="animate-fadeUp"
      style={{
        margin: '36px auto 0',
        maxWidth: '520px',
        padding: '24px 26px 26px',
        border: '1px solid rgba(var(--gold-rgb),0.25)',
        borderRadius: 'var(--r-md)',
        background: 'rgba(var(--gold-rgb),0.04)',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8 }}>
          {justFound ? 'A new ending, found' : 'Endings'}
        </p>
        {user && (
          <span className="font-story" style={{ fontSize: '15px', color: 'var(--parchment)' }}>
            {data.foundCount} of {data.total}
          </span>
        )}
      </div>

      {justFound && (
        <p className="font-story" style={{ fontSize: '14px', fontStyle: 'italic', color: 'rgba(var(--text-rgb),var(--ta70))', marginTop: '10px', lineHeight: 1.6 }}>
          No one can take this one from you now.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        {data.endings.map((e) => (
          <EndingSlot key={e.slot} ending={e} isHere={e.found && e.nodeId === currentNodeId} />
        ))}
      </div>

      <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta45))', marginTop: '16px', lineHeight: 1.6 }}>
        {!user ? (
          <>
            <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Sign in</Link>
            {' '}to keep the endings you find.
          </>
        ) : remaining > 0 ? (
          `${remaining} ${remaining === 1 ? 'ending is' : 'endings are'} still sealed. A different choice somewhere would break another.`
        ) : (
          'You have found every way this story can end.'
        )}
      </p>
    </div>
  )
}

function EndingSlot({ ending, isHere }) {
  if (!ending.found) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', borderRadius: 'var(--r-sm)', border: '1px dashed rgba(var(--panel-rgb),var(--pa12))', opacity: 0.75 }}>
        <Seal broken={false} />
        <span className="font-story" style={{ fontSize: '13px', fontStyle: 'italic', color: 'rgba(var(--text-rgb),var(--ta40))' }}>
          Still sealed
        </span>
        {ending.rare && <RareMark />}
      </div>
    )
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '9px 12px',
        borderRadius: 'var(--r-sm)',
        border: `1px solid ${isHere ? 'rgba(var(--gold-rgb),0.5)' : 'rgba(var(--panel-rgb),var(--pa10))'}`,
        background: isHere ? 'rgba(var(--gold-rgb),0.07)' : 'transparent',
      }}
    >
      <Seal broken />
      <span style={{ flex: 1 }}>
        <span className="font-story" style={{ display: 'block', fontSize: '13px', lineHeight: 1.55, color: 'rgba(var(--text-rgb),var(--ta70))' }}>
          {ending.snippet}…
        </span>
        <span style={{ fontSize: '10.5px', letterSpacing: '0.06em', color: 'rgba(var(--text-rgb),var(--ta40))' }}>
          {isHere && 'you are here · '}
          {ending.foundBy === 1 ? 'found by 1 reader' : `found by ${ending.foundBy} readers`}
        </span>
      </span>
      {ending.rare && <RareMark />}
    </div>
  )
}

// A little wax seal, drawn inline — whole when the ending is undiscovered,
// cracked once the reader has broken it.
function Seal({ broken }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0, marginTop: '1px' }}>
      <circle cx="10" cy="10" r="8" fill={broken ? 'rgba(var(--gold-rgb),0.18)' : 'rgba(var(--panel-rgb),var(--pa08))'}
        stroke={broken ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa18))'} strokeWidth="1.2" />
      {broken ? (
        <path d="M6.5 5.5 L10 10 L8.5 14.5 M10 10 L14 6.5" fill="none" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" />
      ) : (
        <circle cx="10" cy="10" r="3" fill="none" stroke="rgba(var(--panel-rgb),var(--pa18))" strokeWidth="1" />
      )}
    </svg>
  )
}

function RareMark() {
  return (
    <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c45a6e', border: '1px solid rgba(139,26,46,0.4)', borderRadius: 'var(--r-sm)', padding: '2px 7px', whiteSpace: 'nowrap', alignSelf: 'center' }}>
      rare
    </span>
  )
}
