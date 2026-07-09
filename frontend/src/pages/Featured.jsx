import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import StoryCard from '../components/StoryCard'
import ConnectingLoader from '../components/ConnectingLoader'

// The editors' shelf: everything an admin has picked out, newest choice first.
export default function Featured() {
  const [stories, setStories] = useState(null)

  useEffect(() => {
    api.get('/api/stories/featured?limit=60')
      .then((r) => setStories(r.data))
      .catch(() => setStories([]))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 100px' }}>
        <header className="animate-fadeUp" style={{ marginBottom: '48px', maxWidth: '620px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.7 }}>
            Chosen by hand
          </p>
          <h1 className="font-story" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Featured stories
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(var(--text-rgb),var(--ta45))', marginTop: '14px', lineHeight: 1.7 }}>
            A small shelf of the work we think is worth your evening. Nothing here is ranked by
            popularity — someone read it and put it forward.
          </p>
        </header>

        {!stories ? (
          <ConnectingLoader fullScreen={false} message="Pulling the shelf" />
        ) : stories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p className="font-story" style={{ fontSize: '19px', color: 'rgba(var(--text-rgb),var(--ta45))', marginBottom: '20px' }}>
              The shelf is empty for now.
            </p>
            <Link to="/stories" style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', textDecoration: 'none', borderBottom: '1px solid rgba(var(--gold-rgb),0.4)', paddingBottom: '3px' }}>
              Browse everything instead
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {stories.map((story, i) => (
              <StoryCard key={story._id} story={story} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
