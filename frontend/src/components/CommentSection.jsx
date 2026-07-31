import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { avatarSrc } from '../avatars/catalog'

export default function CommentSection({ storyId, storyAuthorId }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    api.get(`/api/stories/${storyId}/comments`)
      .then((r) => active && setComments(r.data))
      .catch(() => active && setComments([]))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [storyId])

  const submit = async (e) => {
    e.preventDefault()
    const text = body.trim()
    if (!text || posting) return
    setPosting(true)
    setError('')
    try {
      const r = await api.post(`/api/stories/${storyId}/comments`, { body: text })
      setComments((c) => [r.data, ...c])
      setBody('')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post your comment.')
    } finally {
      setPosting(false)
    }
  }

  const remove = async (id) => {
    const keep = comments
    setComments((c) => c.filter((x) => x._id !== id)) // optimistic
    try {
      await api.delete(`/api/stories/${storyId}/comments/${id}`)
    } catch {
      setComments(keep)
    }
  }

  const canDelete = (c) => user && (c.author._id === user._id || storyAuthorId === user._id)

  return (
    <section style={{ marginTop: '56px', paddingTop: '32px', borderTop: '1px solid rgba(var(--panel-rgb),var(--pa08))' }}>
      <h2 className="font-story" style={{ fontSize: '20px', fontWeight: 400, color: 'var(--parchment)', marginBottom: '20px' }}>
        Comments {comments.length > 0 && <span style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta30))' }}>· {comments.length}</span>}
      </h2>

      {user ? (
        <form onSubmit={submit} style={{ marginBottom: '32px' }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share what you thought of this story…"
            // The placeholder disappears the moment anyone types, so it can't be
            // the field's only name.
            aria-label="Write a comment"
            maxLength={2000}
            style={{
              width: '100%', minHeight: '84px', resize: 'vertical',
              background: 'rgba(var(--panel-rgb),var(--pa04))',
              border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
              borderRadius: '4px', padding: '12px 14px', color: 'var(--parchment)',
              fontSize: '14px', lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(var(--gold-rgb),0.4)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(var(--panel-rgb),var(--pa10))')}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            {error ? <span style={{ fontSize: '12px', color: 'var(--crimson)' }}>{error}</span> : <span />}
            <button
              type="submit"
              disabled={!body.trim() || posting}
              style={{
                padding: '9px 22px', background: body.trim() ? 'var(--gold)' : 'rgba(var(--gold-rgb),0.2)',
                color: body.trim() ? 'var(--on-gold)' : 'rgba(var(--text-rgb),var(--ta30))',
                border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: body.trim() && !posting ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              }}
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <p style={{ marginBottom: '28px', fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta45))' }}>
          <button
            onClick={() => navigate('/login', { state: { from: `/story/${storyId}` } })}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: '14px' }}
          >
            Sign in
          </button>{' '}
          to join the conversation.
        </p>
      )}

      {loading ? (
        <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta30))', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading…</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta40))', fontStyle: 'italic' }} className="font-story">
          No comments yet. Be the first to respond.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {comments.map((c) => (
            <div key={c._id} className="animate-fadeIn" style={{ display: 'flex', gap: '12px' }}>
              <Link to={`/author/${c.author.username}`} style={{ flexShrink: 0 }}>
                <div className="font-story" style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(var(--gold-rgb),0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: 'var(--gold)' }}>
                  {c.author.avatarUrl ? (
                    <img src={avatarSrc(c.author.avatarUrl)} alt={c.author.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    c.author.displayName.charAt(0).toUpperCase()
                  )}
                </div>
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <Link to={`/author/${c.author.username}`} className="font-story" style={{ fontSize: '15px', color: 'var(--parchment)', textDecoration: 'none' }}>
                    {c.author.displayName}
                  </Link>
                  <span style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta30))' }}>{timeAgo(c.createdAt)}</span>
                  {canDelete(c) && (
                    <button
                      onClick={() => remove(c._id)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(var(--text-rgb),var(--ta30))', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--crimson)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta30))')}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '14.5px', color: 'rgba(var(--text-rgb),var(--ta70))', lineHeight: 1.65, marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
