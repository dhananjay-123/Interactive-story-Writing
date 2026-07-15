import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import ConnectingLoader from '../components/ConnectingLoader'
import { avatarSrc } from '../avatars/catalog'

const BOARDS = [
  { key: 'mostAchievements', title: 'Most Achievements', unit: 'badges' },
  { key: 'rarestCollectors', title: 'Rarest Collections', unit: 'rare badges' },
  { key: 'highestTier', title: 'Highest Tier', unit: 'tier level' },
  { key: 'topReaders', title: 'Top Readers', unit: 'stories finished' },
  { key: 'fastestGrowingAuthors', title: 'Fastest Growing', unit: 'new followers' },
  { key: 'seasonal', title: 'This Season', unit: 'badges this month' },
]

export default function Leaderboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/achievements/leaderboard').then((r) => setData(r.data)).catch(() => setData({})).finally(() => setLoading(false))
  }, [])

  if (loading) return <ConnectingLoader message="Tallying the rankings" />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 90px' }}>
        <div className="animate-fadeUp" style={{ marginBottom: '40px' }}>
          <p className="eyebrow">The standings</p>
          <h1 className="font-story" style={{ fontSize: 'clamp(30px, 4.5vw, 46px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>Leaderboards</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {BOARDS.map((board, i) => (
            <Board key={board.key} title={board.title} unit={board.unit} rows={data?.[board.key] || []} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Board({ title, unit, rows, index }) {
  return (
    <div className="animate-fadeUp" style={{ animationDelay: `${index * 0.06}s`, padding: '22px', background: 'var(--surface)', border: '1px solid rgba(var(--panel-rgb),var(--pa06))', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
      <h2 className="font-story" style={{ fontSize: '18px', fontWeight: 400, color: 'var(--parchment)', marginBottom: '16px' }}>{title}</h2>
      {rows.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))', padding: '10px 0' }}>No entries yet.</p>
      ) : (
        rows.map((row, i) => (
          <Link
            key={row.user.username}
            to={`/author/${row.user.username}`}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', textDecoration: 'none', borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa04))' }}
          >
            <span style={{ width: '22px', fontSize: '13px', fontWeight: 700, color: i < 3 ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta35))', flexShrink: 0 }}>{i + 1}</span>
            <div className="font-story" style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(var(--gold-rgb),0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'var(--gold)' }}>
              {row.user.avatarUrl ? <img src={avatarSrc(row.user.avatarUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (row.user.displayName || '?').charAt(0).toUpperCase()}
            </div>
            <span style={{ flex: 1, minWidth: 0, fontSize: '14px', color: 'var(--parchment)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.user.displayName}</span>
            <span className="font-story" style={{ fontSize: '15px', color: 'var(--gold)' }}>{row.value}</span>
          </Link>
        ))
      )}
      <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta30))', marginTop: '12px' }}>{unit}</p>
    </div>
  )
}
