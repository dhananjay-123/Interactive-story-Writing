import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import StoryCard from '../components/StoryCard'
import ConnectingLoader from '../components/ConnectingLoader'
import EmptyState from '../components/EmptyState'

// The shelf for stories carrying a challenge. Deliberately the same shelf, the
// same cards and the same reading as everywhere else — a Story Game is a story
// first, so its listing has no reason to look like a games arcade.
export default function StoryGames() {
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') || 'all'

  const [modes, setModes] = useState([])
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    api.get('/api/games/catalog').then((r) => setModes(r.data.modes)).catch(() => setModes([]))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    api
      .get('/api/games', { params: mode === 'all' ? {} : { mode } })
      .then((r) => active && setStories(r.data))
      .catch(() => { if (active) { setStories([]); setFailed(true) } })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [mode])

  const setMode = (next) => {
    const p = new URLSearchParams(params)
    if (!next || next === 'all') p.delete('mode')
    else p.set('mode', next)
    setParams(p, { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div className="animate-fadeUp" style={{ marginBottom: '28px' }}>
          <p className="eyebrow">Story Games</p>
          <h1 className="font-story" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Read it, and work it out
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'rgba(var(--text-rgb),var(--ta55))', marginTop: '16px', maxWidth: '620px' }}>
            These read like any other story here. There is just something to work out while you do it —
            who did it, who is lying, how you get out. Follow it or ignore it; the story is the same
            either way.
          </p>
        </div>

        <div className="animate-fadeUp delay-100" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
          {[{ id: 'all', label: 'Everything' }, ...modes].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                padding: '6px 16px',
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: `1px solid ${mode === m.id ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa12))'}`,
                background: mode === m.id ? 'rgba(var(--gold-rgb),0.1)' : 'transparent',
                color: mode === m.id ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta50))',
                cursor: 'pointer',
                borderRadius: '4px',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {loading ? (
          <ConnectingLoader fullScreen={false} message="Gathering the open cases" />
        ) : failed ? (
          <EmptyState
            title="We couldn't reach the case files."
            hint="The connection dropped on the way. Give it a moment and try again."
          />
        ) : stories.length === 0 ? (
          <EmptyState
            title="No open cases here yet."
            hint={
              mode === 'all'
                ? 'Any story can carry one — set the challenge up from its story map.'
                : 'Nothing of this kind yet. Try another sort of case.'
            }
            actionLabel={mode === 'all' ? 'Write a story' : undefined}
            actionTo={mode === 'all' ? '/create' : undefined}
          />
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
