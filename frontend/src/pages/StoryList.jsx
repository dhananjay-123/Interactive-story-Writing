import { useEffect, useState } from 'react'
import axios from 'axios'
import StoryCard from '../components/StoryCard'

const GENRES = ['all', 'fantasy', 'mystery', 'sci_fi', 'romance', 'horror']

export default function StoryList() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [genre, setGenre] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    axios.get('/api/stories')
      .then(r => setStories(r.data))
      .catch(() => setStories(SAMPLE_STORIES))
      .finally(() => setLoading(false))
  }, [])

  const filtered = stories.filter(s => {
    const matchGenre = genre === 'all' || s.genre === genre
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase())
    return matchGenre && matchSearch
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>

        <div className="animate-fadeUp mb-14">
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.7 }}>
            Library
          </p>
          <h1 className="font-story" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em', marginBottom: '0' }}>
            Choose your story
          </h1>
        </div>

        {/* Filters */}
        <div className="animate-fadeUp delay-100 flex flex-wrap gap-3 mb-6 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {GENRES.map(g => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                style={{
                  padding: '6px 16px',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  border: `1px solid ${genre === g ? 'var(--gold)' : 'rgba(255,255,255,0.12)'}`,
                  background: genre === g ? 'rgba(201,168,76,0.1)' : 'transparent',
                  color: genre === g ? 'var(--gold)' : 'rgba(250,248,243,0.5)',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  transition: 'all 0.2s ease',
                }}
              >
                {g === 'sci_fi' ? 'Sci-Fi' : g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search stories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '3px',
              padding: '8px 16px',
              color: 'var(--parchment)',
              fontSize: '14px',
              outline: 'none',
              width: '220px',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(250,248,243,0.3)' }}>
            <div style={{ fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: 'rgba(250,248,243,0.35)', fontSize: '15px' }}>No stories found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filtered.map((story, i) => (
              <StoryCard key={story._id} story={story} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SAMPLE_STORIES = [
  {
    _id: 'sample-1',
    title: 'The Hollow King',
    description: 'A deposed monarch wanders a kingdom that has forgotten his name. With allies few and enemies many, every alley hides a decision.',
    genre: 'fantasy',
    author: 'E. Hartwell',
    branchCount: 14,
  },
  {
    _id: 'sample-2',
    title: 'Signal Lost',
    description: 'The last transmission from Station Kepler arrives eighteen months late. What it contains will unravel everything you thought you knew.',
    genre: 'sci_fi',
    author: 'M. Chen',
    branchCount: 9,
  },
  {
    _id: 'sample-3',
    title: 'Room 204',
    description: 'A detective checks into a hotel to investigate a cold case. The guests seem to know more than they let on—and so does the hotel itself.',
    genre: 'mystery',
    author: 'A. Voss',
    branchCount: 11,
  },
  {
    _id: 'sample-4',
    title: 'The Cartographer\'s Daughter',
    description: 'Mara inherits her father\'s incomplete maps of an island that does not appear on any atlas. Following them has consequences.',
    genre: 'fantasy',
    author: 'P. Nakamura',
    branchCount: 16,
  },
  {
    _id: 'sample-5',
    title: 'What the River Carries',
    description: 'Two strangers meet on the last ferry of the season. One is running toward something. The other is running away.',
    genre: 'romance',
    author: 'S. Okafor',
    branchCount: 7,
  },
  {
    _id: 'sample-6',
    title: 'Tenant',
    description: 'The apartment above yours has been empty for years. Tonight, you hear footsteps. What you do next determines who survives the morning.',
    genre: 'horror',
    author: 'D. Reyes',
    branchCount: 12,
  },
]
