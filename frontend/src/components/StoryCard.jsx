import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const GENRE_COLORS = {
  fantasy:  { bg: 'rgba(139,26,46,0.15)',  border: 'rgba(139,26,46,0.4)',  text: '#c45a6e' },
  mystery:  { bg: 'rgba(74,69,96,0.2)',    border: 'rgba(74,69,96,0.5)',   text: '#9d97b8' },
  sci_fi:   { bg: 'rgba(26,61,43,0.2)',    border: 'rgba(26,61,43,0.5)',   text: '#5fa87a' },
  romance:  { bg: 'rgba(160,90,60,0.15)',  border: 'rgba(160,90,60,0.4)',  text: '#d4956e' },
  horror:   { bg: 'rgba(20,20,20,0.3)',    border: 'rgba(80,20,20,0.6)',   text: '#a04040' },
  default:  { bg: 'rgba(var(--gold-rgb),0.08)', border: 'rgba(var(--gold-rgb),0.25)', text: 'var(--gold)' },
}

export default function StoryCard({ story, index }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()
  const genre = GENRE_COLORS[story.genre] || GENRE_COLORS.default

  // Navigate to the author without triggering the card's own link (avoids nested <a>).
  const goToAuthor = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/author/${story.authorUsername}`)
  }

  return (
    <Link
      to={`/story/${story._id}`}
      className="animate-fadeUp"
      style={{ textDecoration: 'none', animationDelay: `${index * 0.08}s` }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? 'rgba(var(--panel-rgb),var(--pa05))' : 'rgba(var(--panel-rgb),var(--pa02))',
          border: `1px solid ${hovered ? 'rgba(var(--gold-rgb),0.3)' : 'rgba(var(--panel-rgb),var(--pa08))'}`,
          borderRadius: '6px',
          padding: '28px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
          height: '100%',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <span
            className="text-xs font-medium uppercase tracking-widest px-2 py-1 rounded"
            style={{ ...genre, background: genre.bg, borderColor: genre.border, border: `1px solid`, color: genre.text, fontSize: '10px', letterSpacing: '0.1em' }}
          >
            {story.genre?.replace('_', '-') || 'Story'}
          </span>
          <span className="text-xs" style={{ color: 'rgba(var(--text-rgb),var(--ta30))' }}>
            {story.branchCount || 0} branches
          </span>
        </div>

        <h3
          className="font-story text-xl mb-3 leading-snug"
          style={{ color: hovered ? 'var(--gold)' : 'var(--parchment)', transition: 'color 0.3s ease' }}
        >
          {story.title}
        </h3>

        <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(var(--text-rgb),var(--ta55))', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {story.description}
        </p>

        <div className="flex items-center justify-between">
          {story.authorUsername ? (
            <span
              role="link"
              tabIndex={0}
              onClick={goToAuthor}
              onKeyDown={(e) => e.key === 'Enter' && goToAuthor(e)}
              className="text-xs"
              style={{ color: 'rgba(var(--text-rgb),var(--ta35))', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta35))')}
            >
              by {story.author || 'Anonymous'}
            </span>
          ) : (
            <span className="text-xs" style={{ color: 'rgba(var(--text-rgb),var(--ta35))' }}>
              by {story.author || 'Anonymous'}
            </span>
          )}
          <span
            className="text-xs"
            style={{ color: 'var(--gold)', opacity: hovered ? 1 : 0, transition: 'opacity 0.25s ease' }}
          >
            Read →
          </span>
        </div>
      </div>
    </Link>
  )
}
