import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import StoryCard from '../components/StoryCard'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { username } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    api
      .get(`/api/users/${username}`)
      .then((r) => setData(r.data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [username])

  const isOwnProfile = user && user.username.toLowerCase() === username.toLowerCase()

  if (loading) {
    return (
      <Centered>
        <p style={{ color: 'rgba(var(--text-rgb),0.3)', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Loading…
        </p>
      </Centered>
    )
  }

  if (notFound || !data) {
    return (
      <Centered>
        <p className="font-story" style={{ fontSize: '22px', color: 'rgba(var(--text-rgb),0.6)', fontStyle: 'italic', marginBottom: '20px' }}>
          No author by that name.
        </p>
        <Link to="/stories" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Back to the library →
        </Link>
      </Centered>
    )
  }

  const { author, stories } = data
  const joined = new Date(author.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
        {/* Author header */}
        <div className="animate-fadeUp" style={{ marginBottom: '48px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '14px', opacity: 0.7 }}>
            Author
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div
              className="font-story"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: '1px solid rgba(201,168,76,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                color: 'var(--gold)',
                flexShrink: 0,
              }}
            >
              {author.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                {author.displayName}
              </h1>
              <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),0.35)', marginTop: '4px' }}>
                @{author.username} · Joined {joined}
              </p>
            </div>
          </div>

          {author.bio && (
            <p style={{ fontSize: '16px', color: 'rgba(var(--text-rgb),0.6)', lineHeight: 1.7, maxWidth: '620px', marginTop: '24px' }}>
              {author.bio}
            </p>
          )}
        </div>

        {/* Published works */}
        <div className="animate-fadeUp delay-100" style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '24px' }}>
          <h2 className="font-story" style={{ fontSize: '20px', fontWeight: 400, color: 'var(--parchment)' }}>
            Published works
          </h2>
          <span style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),0.3)' }}>
            {stories.length}
          </span>
        </div>

        {stories.length === 0 ? (
          <div style={{ padding: '48px 0' }}>
            <p style={{ color: 'rgba(var(--text-rgb),0.4)', fontSize: '15px', marginBottom: isOwnProfile ? '20px' : 0 }}>
              {isOwnProfile ? "You haven't published a story yet." : 'No published stories yet.'}
            </p>
            {isOwnProfile && (
              <Link
                to="/create"
                style={{
                  display: 'inline-block',
                  padding: '12px 28px',
                  background: 'var(--gold)',
                  color: 'var(--on-gold)',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  borderRadius: '3px',
                }}
              >
                Write your first story
              </Link>
            )}
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

function Centered({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
      {children}
    </div>
  )
}
