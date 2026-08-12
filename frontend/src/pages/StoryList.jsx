import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import StoryCard from '../components/StoryCard'
import ConnectingLoader from '../components/ConnectingLoader'
import EmptyState from '../components/EmptyState'
import { CloseIcon, SearchIcon } from '../components/ui'
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

        {/* Trending tags — toggles, so aria-pressed carries the state a sighted
            reader gets from the gold fill. */}
        {trending.length > 0 && (
          <div className="animate-fadeUp delay-100 mb-6">
            <div className="filter-row" role="group" aria-label="Filter by trending tag">
              <span className="filter-row__label">Trending tags</span>
              {trending.map(({ tag: t }) => (
                <button
                  key={t}
                  className="ct-chip"
                  aria-pressed={t === tag}
                  onClick={() => setFilter('tag', t === tag ? '' : t)}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Genre + sort + search */}
        <div className="animate-fadeUp delay-100 ct-toolbar">
          <div className="ct-toolbar__group" role="group" aria-label="Filter by genre">
            {GENRES.map((g) => (
              <button
                key={g}
                className="ct-chip"
                aria-pressed={genre === g}
                onClick={() => setFilter('genre', g)}
              >
                {label(g)}
              </button>
            ))}
          </div>

          <div className="ct-toolbar__group">
            {/* Both controls were unlabelled — a screen reader reached a combo
                box and a text field with no idea what either one filtered. */}
            <label htmlFor="story-sort" className="sr-only">Sort stories by</label>
            <select
              id="story-sort"
              className="ct-input ct-input--auto"
              value={sort}
              onChange={(e) => setFilter('sort', e.target.value)}
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>

            <label htmlFor="story-search" className="sr-only">Search stories</label>
            <div className="ct-search">
              <span className="ct-search__icon"><SearchIcon size={15} /></span>
              <input
                id="story-search"
                type="search"
                className="ct-input ct-input--auto"
                placeholder="Search stories…"
                value={searchInput}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Active tag pill */}
        {tag && (
          <div className="mb-6 filter-row">
            <span className="filter-row__label">Filtered by</span>
            <button
              className="ct-chip"
              aria-pressed="true"
              onClick={() => setFilter('tag', '')}
            >
              #{tag}
              <CloseIcon size={12} />
              <span className="sr-only">Clear this tag filter</span>
            </button>
          </div>
        )}

        {/* The result count is the one thing that tells a screen-reader user
            their filter did anything at all. */}
        {!loading && !failed && (
          <p className="sr-only" aria-live="polite">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'} found.
          </p>
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
