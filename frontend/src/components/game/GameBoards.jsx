import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { avatarSrc } from '../../avatars/catalog'
import { formatDuration } from '../../games/format'

// One Story Game's rankings, in three windows. Deliberately understated: ten
// rows, no medals, no trophies, no percentile shaming. The reader's own standing
// is shown plainly whether it's first or four-hundredth.
const BOARDS = [
  { key: 'global', label: 'All time' },
  { key: 'weekly', label: 'This week' },
  { key: 'friends', label: 'Authors you follow' },
]

export default function GameBoards({ storyId, signedIn }) {
  const [board, setBoard] = useState('global')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get(`/api/games/${storyId}/leaderboard`, { params: { board } })
      .then(({ data }) => { if (!cancelled) setData(data) })
      .catch(() => { if (!cancelled) setData({ rows: [], standing: null }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [storyId, board])

  const rows = data?.rows || []

  return (
    <div>
      <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {BOARDS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBoard(b.key)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0 0 3px',
              fontFamily: 'inherit',
              fontSize: '11px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              color: board === b.key ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta35))',
              borderBottom: `1px solid ${board === b.key ? 'rgba(var(--gold-rgb),0.5)' : 'transparent'}`,
              transition: 'color 0.2s ease',
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>Tallying…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(var(--text-rgb),var(--ta40))' }}>
          {board === 'friends' && !signedIn
            ? 'Sign in to see how the authors you follow got on.'
            : board === 'friends'
              ? 'Nobody you follow has finished this one yet.'
              : 'Nobody has finished this one yet. You could be first.'}
        </p>
      ) : (
        <div>
          {rows.map((row) => (
            <Row key={row.user.username} row={row} />
          ))}
        </div>
      )}

      {data?.standing && (
        <p style={{ fontSize: '11.5px', letterSpacing: '0.06em', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '14px' }}>
          You stand {data.standing.position} of {data.standing.total}.
        </p>
      )}
    </div>
  )
}

function Row({ row }) {
  return (
    <Link
      to={`/author/${row.user.username}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '9px 0',
        textDecoration: 'none',
        borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa04))',
      }}
    >
      <span style={{ width: '20px', flexShrink: 0, fontSize: '13px', fontWeight: 700, color: row.position <= 3 ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta35))' }}>
        {row.position}
      </span>
      <span
        className="font-story"
        style={{ width: '28px', height: '28px', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(var(--gold-rgb),0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--gold)' }}
      >
        {row.user.avatarUrl
          ? <img src={avatarSrc(row.user.avatarUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (row.user.displayName || '?').charAt(0).toUpperCase()}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '13.5px', color: 'var(--parchment)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.user.displayName}
        </span>
        <span style={{ display: 'block', fontSize: '10.5px', letterSpacing: '0.06em', color: 'rgba(var(--text-rgb),var(--ta35))' }}>
          {formatDuration(row.elapsedMs)}
          {!row.solved && ' · read to the end'}
        </span>
      </span>
      <span className="font-story" style={{ fontSize: '15px', color: 'var(--gold)' }}>{row.score}</span>
    </Link>
  )
}
