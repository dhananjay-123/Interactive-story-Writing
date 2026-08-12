import { Link, useNavigate } from 'react-router-dom'
import StarRating from './StarRating'
import TagRow from './TagRow'
import { GenreBadge } from './ui'
import { authorNames, hasCoAuthors } from '../utils/authors'

// The card the whole library is built from.
//
// Two things changed here beyond the styling. The genre chip used to carry a
// hardcoded hex palette — the one part of the UI that never re-themed, which
// dropped it to 1.7:1 on the cream theme; it now reads from the shared genre
// tokens. And the hover lift used to be a useState in this component, so every
// card in a grid of thirty re-rendered on mouse-over and a keyboard reader
// tabbing through the grid saw no lift and no "Read →" cue at all. Both are
// CSS now: :hover and :focus-within on .ct-card--interactive.

export default function StoryCard({ story, index }) {
  const navigate = useNavigate()

  // Navigate to the author without triggering the card's own link (avoids nested <a>).
  const goToAuthor = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/author/${story.authorUsername}`)
  }

  return (
    <Link
      to={`/story/${story._id}`}
      className="animate-fadeUp story-card ct-card ct-card--interactive"
      style={{ animationDelay: `${Math.min(index, 6) * 0.08}s` }}
    >
      <div className="story-card__top">
        <GenreBadge genre={story.genre} />
        <span className="story-card__meta">
          {/* A story carrying a challenge says so once, in the same weight as
              its branch count — a note, not a badge. */}
          {story.gameMode && (
            <span className="story-card__case">
              <CaseMini /> case
            </span>
          )}
          {story.branchCount || 0} branches
        </span>
      </div>

      <h3 className="font-story story-card__title">{story.title}</h3>

      <p className="story-card__desc">{story.description}</p>

      {story.tags?.length > 0 && (
        <TagRow tags={story.tags.slice(0, 3)} style={{ marginBottom: 'var(--s-4)' }} />
      )}

      {/* Engagement metrics */}
      {(story.likeCount > 0 || story.ratingCount > 0 || story.commentCount > 0) && (
        <div className="story-card__stats">
          {story.likeCount > 0 && (
            <span className="story-card__stat">
              <HeartMini /> {story.likeCount}
              <span className="sr-only"> likes</span>
            </span>
          )}
          {story.ratingCount > 0 && <StarRating value={story.ratingAvg} count={story.ratingCount} size={13} />}
          {story.commentCount > 0 && (
            <span className="story-card__stat">
              <CommentMini /> {story.commentCount}
              <span className="sr-only"> comments</span>
            </span>
          )}
        </div>
      )}

      <div className="story-card__foot">
        {story.authorUsername && !hasCoAuthors(story) ? (
          <span
            role="link"
            tabIndex={0}
            onClick={goToAuthor}
            onKeyDown={(e) => e.key === 'Enter' && goToAuthor(e)}
            className="story-card__author story-card__author--link"
          >
            by {story.author || 'Anonymous'}
          </span>
        ) : (
          <span className="story-card__author">by {authorNames(story)}</span>
        )}
        {/* Decorative: the card is already a link with an accessible name, so
            this cue is hidden from assistive tech rather than repeated. */}
        <span className="story-card__cue card-read-cue" aria-hidden="true">Read →</span>
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
