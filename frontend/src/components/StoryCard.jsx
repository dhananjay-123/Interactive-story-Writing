import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StarRating from './StarRating'
import TagRow from './TagRow'
import { authorNames, hasCoAuthors } from '../utils/authors'

export const GENRE_COLORS = {
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
      style={{ textDecoration: 'none', animationDelay: `${Math.min(index, 6) * 0.08}s` }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${hovered ? 'rgba(var(--gold-rgb),0.45)' : 'rgba(var(--panel-rgb),var(--pa06))'}`,
          borderRadius: '8px',
          padding: '28px',
          cursor: 'pointer',
          boxShadow: hovered ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
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
          <span className="text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: 'rgba(var(--text-rgb),var(--ta30))' }}>
            {/* A story carrying a challenge says so once, in the same weight as
                its branch count — a note, not a badge. */}
            {story.gameMode && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--gold)', opacity: 0.8 }}>
                <CaseMini /> case
              </span>
            )}
            {story.branchCount || 0} branches
          </span>
        </div>

        <h3
          className="font-story text-xl mb-3 leading-snug"
          style={{ color: hovered ? 'var(--gold)' : 'var(--parchment)', transition: 'color 0.3s ease' }}
        >
          {story.title}
        </h3>

        <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(var(--text-rgb),var(--ta55))', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {story.description}
        </p>

        {story.tags?.length > 0 && (
          <TagRow tags={story.tags.slice(0, 3)} style={{ marginBottom: '14px' }} />
        )}

        {/* Engagement metrics */}
        {(story.likeCount > 0 || story.ratingCount > 0 || story.commentCount > 0) && (
          <div className="flex items-center gap-4 mb-4" style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>
            {story.likeCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <HeartMini /> {story.likeCount}
              </span>
            )}
            {story.ratingCount > 0 && <StarRating value={story.ratingAvg} count={story.ratingCount} size={13} />}
            {story.commentCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CommentMini /> {story.commentCount}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          {story.authorUsername && !hasCoAuthors(story) ? (
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
              by {authorNames(story)}
            </span>
          )}
          <span
            className="text-xs card-read-cue"
            style={{ color: 'var(--gold)', opacity: hovered ? 1 : 0, transition: 'opacity 0.25s ease' }}
          >
            Read →
          </span>
        </div>
      </div>
    </Link>
  )
}

function HeartMini() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

function CaseMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="1.5" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function CommentMini() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  )
}
