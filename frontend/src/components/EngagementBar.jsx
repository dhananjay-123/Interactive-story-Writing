import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import StarRating, { StarInput } from './StarRating'

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'var(--crimson)' : 'none'} stroke={filled ? 'var(--crimson)' : 'currentColor'} strokeWidth="1.7" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

function BookmarkIcon({ filled }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'var(--gold)' : 'none'} stroke={filled ? 'var(--gold)' : 'currentColor'} strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export default function EngagementBar({ story }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [liked, setLiked] = useState(story.liked)
  const [likeCount, setLikeCount] = useState(story.likeCount || 0)
  const [bookmarked, setBookmarked] = useState(story.bookmarked)
  const [myRating, setMyRating] = useState(story.myRating || 0)
  const [avg, setAvg] = useState(story.ratingAvg || 0)
  const [ratingCount, setRatingCount] = useState(story.ratingCount || 0)
  const [busy, setBusy] = useState(false)

  const requireLogin = () => {
    navigate('/login', { state: { from: `/story/${story._id}` } })
  }

  const toggleLike = async () => {
    if (!user) return requireLogin()
    if (busy) return
    setBusy(true)
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1)) // optimistic
    try {
      const r = next ? await api.post(`/api/stories/${story._id}/like`) : await api.delete(`/api/stories/${story._id}/like`)
      setLiked(r.data.liked)
      setLikeCount(r.data.likeCount)
    } catch {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1)) // revert
    } finally {
      setBusy(false)
    }
  }

  const toggleBookmark = async () => {
    if (!user) return requireLogin()
    const next = !bookmarked
    setBookmarked(next)
    try {
      const r = next ? await api.post(`/api/stories/${story._id}/bookmark`) : await api.delete(`/api/stories/${story._id}/bookmark`)
      setBookmarked(r.data.bookmarked)
    } catch {
      setBookmarked(!next)
    }
  }

  const rate = async (value) => {
    if (!user) return requireLogin()
    const prev = myRating
    setMyRating(value)
    try {
      const r = await api.put(`/api/stories/${story._id}/rating`, { value })
      setMyRating(r.data.myRating)
      setAvg(r.data.avg)
      setRatingCount(r.data.count)
    } catch {
      setMyRating(prev)
    }
  }

  const pill = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    background: active ? 'rgba(var(--gold-rgb),0.08)' : 'transparent',
    border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
    borderRadius: '4px',
    color: active ? 'var(--parchment)' : 'rgba(var(--text-rgb),var(--ta55))',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease, color 0.2s ease',
  })

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginTop: '24px' }}>
      <button
        onClick={toggleLike}
        style={pill(liked)}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--gold-rgb),0.4)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--panel-rgb),var(--pa10))')}
        title={liked ? 'Unlike' : 'Like this story'}
      >
        <HeartIcon filled={liked} />
        <span>{likeCount > 0 ? likeCount : ''} {likeCount === 1 ? 'Like' : 'Likes'}</span>
      </button>

      <button
        onClick={toggleBookmark}
        style={pill(bookmarked)}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--gold-rgb),0.4)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--panel-rgb),var(--pa10))')}
        title={bookmarked ? 'Remove from saved' : 'Save for later'}
      >
        <BookmarkIcon filled={bookmarked} />
        <span>{bookmarked ? 'Saved' : 'Save'}</span>
      </button>

      {/* Ratings */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta35))' }}>
            {myRating ? 'Your rating' : 'Rate'}
          </span>
          <StarInput value={myRating} size={22} onRate={rate} />
        </div>
        <span style={{ width: '1px', height: '18px', background: 'rgba(var(--panel-rgb),var(--pa10))' }} />
        <StarRating value={avg} count={ratingCount} size={14} />
      </div>
    </div>
  )
}
