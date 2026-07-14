import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import StoryCard from '../components/StoryCard'
import ConnectingLoader from '../components/ConnectingLoader'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'

const GENRES = ['all', 'fantasy', 'mystery', 'sci_fi', 'romance', 'horror', 'thriller', 'literary']
const SORTS = [
  { id: 'trending', label: 'Trending' },
  { id: 'newest', label: 'Newest' },
  { id: 'top_rated', label: 'Top rated' },
  { id: 'most_liked', label: 'Most liked' },
]
const label = (g) => (g === 'sci_fi' ? 'Sci-Fi' : g.charAt(0).toUpperCase() + g.slice(1))

export default function StoryList() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()

  const genre = params.get('genre') || 'all'
  const tag = params.get('tag') || ''
  const q = params.get('q') || ''
  const sort = params.get('sort') || 'trending'

  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [trending, setTrending] = useState([])
  const [recs, setRecs] = useState([])
  const [searchInput, setSearchInput] = useState(q)

  const unfiltered = genre === 'all' && !tag && !q

  // Merge one filter into the URL (source of truth); dropping empties.
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  // Debounce the search box into the URL.
  const debounce = useRef()
  useEffect(() => { setSearchInput(q) }, [q])
  const onSearch = (val) => {
    setSearchInput(val)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => setFilter('q', val.trim()), 300)
  }

  // Trending tags + recommendations load once.
  useEffect(() => {
    api.get('/api/stories/tags/trending').then((r) => setTrending(r.data)).catch(() => setTrending([]))
    api.get('/api/stories/recommendations').then((r) => setRecs(r.data)).catch(() => setRecs([]))
  }, [user])

  // Re-fetch the grid whenever a filter changes.
  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)
    const query = new URLSearchParams()
    if (genre !== 'all') query.set('genre', genre)
    if (tag) query.set('tag', tag)
    if (q) query.set('q', q)
    if (sort) query.set('sort', sort)
    api.get(`/api/stories?${query.toString()}`)
      .then((r) => active && setStories(r.data))
      .catch(() => { if (active) { setStories([]); setFailed(true) } })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [genre, tag, q, sort, reloadKey])

  const heading = useMemo(
    () => (user ? 'Recommended for you' : 'Trending now'),
    [user]
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>

        <div className="animate-fadeUp mb-10">
          <p className="eyebrow">Library</p>
          <h1 className="font-story" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Choose your story
          </h1>
        </div>

        {/* Recommendations — only on the unfiltered view. */}
        {unfiltered && recs.length > 0 && (
          <div className="animate-fadeUp mb-12">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
              <h2 className="font-story" style={{ fontSize: '18px', fontWeight: 400, color: 'var(--parchment)' }}>{heading}</h2>
              <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta30))' }}>
                {user ? 'Picked from what you love' : 'What readers are enjoying'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {recs.slice(0, 3).map((story, i) => (
                <StoryCard key={story._id} story={story} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Trending tags */}
        {trending.length > 0 && (
          <div className="animate-fadeUp delay-100 mb-6">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta35))' }}>
                Trending tags
              </span>
              {trending.map(({ tag: t }) => {
                const on = t === tag
                return (
                  <button
                    key={t}
                    onClick={() => setFilter('tag', on ? '' : t)}
                    style={{
                      padding: '4px 11px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit',
                      border: `1px solid ${on ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa10))'}`,
                      background: on ? 'rgba(var(--gold-rgb),0.12)' : 'rgba(var(--panel-rgb),var(--pa04))',
                      color: on ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta55))',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    #{t}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Genre + sort + search */}
        <div className="animate-fadeUp delay-100 flex flex-wrap gap-3 mb-8 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setFilter('genre', g)}
                style={{
                  padding: '6px 16px', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  border: `1px solid ${genre === g ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa12))'}`,
                  background: genre === g ? 'rgba(var(--gold-rgb),0.1)' : 'transparent',
                  color: genre === g ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta50))',
                  cursor: 'pointer', borderRadius: '4px', transition: 'all 0.2s ease',
                }}
              >
                {label(g)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <select
              value={sort}
              onChange={(e) => setFilter('sort', e.target.value)}
              style={{
                background: 'rgba(var(--panel-rgb),var(--pa04))', border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
                borderRadius: '4px', padding: '8px 12px', color: 'var(--parchment)', fontSize: '13px', outline: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id} style={{ background: 'var(--ink-soft)' }}>{s.label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search stories..."
              value={searchInput}
              onChange={(e) => onSearch(e.target.value)}
              style={{
                background: 'rgba(var(--panel-rgb),var(--pa04))', border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
                borderRadius: '4px', padding: '8px 16px', color: 'var(--parchment)', fontSize: '14px', outline: 'none',
                width: '200px', transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(var(--gold-rgb),0.4)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(var(--panel-rgb),var(--pa10))')}
            />
          </div>
        </div>

        {/* Active tag pill */}
        {tag && (
          <div className="mb-6" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta45))' }}>Filtered by</span>
            <button
              onClick={() => setFilter('tag', '')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 11px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--gold)', background: 'rgba(var(--gold-rgb),0.12)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              #{tag} <span style={{ fontSize: '14px', lineHeight: 1 }}>×</span>
            </button>
          </div>
        )}

        {loading ? (
          <ConnectingLoader fullScreen={false} message="Gathering the library" />
        ) : failed ? (
          <EmptyState
            title="We couldn't reach the library."
            hint="The connection dropped on the way to the shelves. Give it a moment and try again."
            actionLabel="Retry"
            onAction={() => setReloadKey((k) => k + 1)}
          />
        ) : stories.length === 0 ? (
          <EmptyState
            title="Nothing on this shelf yet."
            hint={unfiltered ? 'Be the first to add a tale to the library.' : 'No stories match these filters — try widening your search.'}
            actionLabel={unfiltered ? 'Write a story' : undefined}
            actionTo={unfiltered ? '/create' : undefined}
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
