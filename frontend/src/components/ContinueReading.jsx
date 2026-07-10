import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const genreLabel = (g) =>
  g === 'sci_fi' ? 'Sci-Fi' : (g || '').charAt(0).toUpperCase() + (g || '').slice(1)

const sinceLabel = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

// Stories the reader is part-way through. Renders nothing when there are none,
// and nothing at all for signed-out visitors.
export default function ContinueReading() {
  const { user } = useAuth()
  const [stories, setStories] = useState([])

  useEffect(() => {
    if (!user) { setStories([]); return }
    api.get('/api/stories/continue')
      .then((r) => setStories(r.data))
      .catch(() => setStories([]))
  }, [user])

  if (!user || stories.length === 0) return null

  return (
    <section style={{ padding: '40px 24px 20px', maxWidth: '1100px', margin: '0 auto' }}>
      <div className="animate-fadeUp" style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.7 }}>
          Where you stopped
        </p>
        <h2 className="font-story" style={{ fontSize: 'clamp(24px, 3.5vw, 34px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
          Continue reading
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {stories.map((s, i) => (
          <Link
            key={s._id}
            to={`/story/${s._id}`}
            className="animate-fadeUp"
            style={{
              animationDelay: `${i * 0.04}s`,
              display: 'block',
              padding: '18px 20px',
              border: '1px solid rgba(var(--panel-rgb),var(--pa08))',
              borderLeft: '2px solid rgba(var(--gold-rgb),0.5)',
              borderRadius: '4px',
              textDecoration: 'none',
              background: 'rgba(var(--panel-rgb),var(--pa02))',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderLeftColor = 'var(--gold)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderLeftColor = 'rgba(var(--gold-rgb),0.5)' }}
          >
            <h3 className="font-story" style={{ fontSize: '18px', fontWeight: 400, color: 'var(--parchment)', marginBottom: '6px' }}>
              {s.title}
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>
              {genreLabel(s.genre)} · {s.passagesIn} {s.passagesIn === 1 ? 'passage' : 'passages'} in · {sinceLabel(s.updatedAt)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
