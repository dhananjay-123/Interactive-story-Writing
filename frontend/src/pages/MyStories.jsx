import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ConnectingLoader from '../components/ConnectingLoader'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { authorNames } from '../utils/authors'

const genreLabel = (g) =>
  g === 'sci_fi' ? 'Sci-Fi' : (g || '').charAt(0).toUpperCase() + (g || '').slice(1)

export default function MyStories() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [stories, setStories] = useState(null)
  const [collabs, setCollabs] = useState([])
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null) // story queued for confirmation

  const load = useCallback(() => {
    api.get('/api/stories/mine')
      .then((r) => setStories(r.data))
      .catch(() => setStories([]))
    // Stories I co-write but don't own — surfaced separately so a collaborator
    // can find their way into the map. Best-effort; failure just hides the rail.
    api.get('/api/stories/collaborations')
      .then((r) => setCollabs(r.data))
      .catch(() => setCollabs([]))
  }, [])

  // Sign-in gate — this is your own shelf, so it needs a session.
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/my-stories' } })
      return
    }
    load()
  }, [authLoading, user, navigate, load])

  const patch = (id, next) =>
    setStories((list) => list.map((s) => (s._id === id ? { ...s, ...next } : s)))

  const togglePublished = async (s) => {
    setBusy(s._id)
    setError('')
    try {
      const r = await api.put(`/api/stories/${s._id}/published`, { published: !s.published })
      patch(s._id, { published: r.data.published })
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not update the story.')
    } finally {
      setBusy(null)
    }
  }

  // Deletion routes through a themed confirm dialog rather than window.confirm.
  const confirmDelete = async () => {
    const s = pendingDelete
    if (!s) return
    setBusy(s._id)
    setError('')
    try {
      await api.delete(`/api/stories/${s._id}`)
      setStories((list) => list.filter((x) => x._id !== s._id))
      setPendingDelete(null)
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not delete the story.')
      setPendingDelete(null)
    } finally {
      setBusy(null)
    }
  }

  if (authLoading || !stories) {
    return <ConnectingLoader message="Gathering your stories" />
  }

  const published = stories.filter((s) => s.published).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 80px' }}>
        {/* Header */}
        <div className="animate-fadeUp" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '36px' }}>
          <div>
            <p className="eyebrow">Your desk</p>
            <h1 className="font-story" style={{ fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
              My stories
            </h1>
            {stories.length > 0 && (
              <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '8px' }}>
                {stories.length} {stories.length === 1 ? 'story' : 'stories'} · {published} published · {stories.length - published} hidden
              </p>
            )}
          </div>
          <Link to="/create" style={newButtonStyle}>
            New story
          </Link>
        </div>

        {error && (
          <div className="animate-fadeIn" style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: 'var(--r-sm)', border: '1px solid rgba(139,26,46,0.4)', background: 'rgba(139,26,46,0.12)', color: '#c45a6e', fontSize: '13.5px' }}>
            {error}
          </div>
        )}

        {stories.length === 0 ? (
          <EmptyState
            title="A blank page, waiting."
            hint="Every story starts with a single passage. Yours is next."
            actionLabel="Write your first story"
            actionTo="/create"
          />
        ) : (
          <div className="animate-fadeUp delay-100" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stories.map((s) => (
              <div key={s._id} style={{ ...panel, padding: '18px 20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Link to={`/story/${s._id}`} className="font-story" style={{ fontSize: '18px', color: 'var(--parchment)', textDecoration: 'none' }}>
                        {s.title}
                      </Link>
                      {s.featured && <Badge tone="gold">Featured</Badge>}
                      {!s.published && <Badge tone="crimson">Hidden</Badge>}
                    </div>
                    {s.description && (
                      <p style={{ fontSize: '13.5px', color: 'rgba(var(--text-rgb),var(--ta50))', marginTop: '6px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {s.description}
                      </p>
                    )}
                    <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '8px' }}>
                      {genreLabel(s.genre)} · {s.branchCount} {s.branchCount === 1 ? 'branch' : 'branches'} · {s.likeCount} {s.likeCount === 1 ? 'like' : 'likes'} · {s.commentCount} {s.commentCount === 1 ? 'comment' : 'comments'}
                      {s.ratingCount > 0 && <> · rated {s.ratingAvg} ({s.ratingCount})</>}
                      {' · '}{new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <LinkButton to={`/story/${s._id}`}>Read</LinkButton>
                    <LinkButton to={`/story/${s._id}/edit`} active>Edit map</LinkButton>
                    <ActionButton onClick={() => togglePublished(s)} disabled={busy === s._id}>
                      {s.published ? 'Hide' : 'Publish'}
                    </ActionButton>
                    <ActionButton onClick={() => setPendingDelete(s)} disabled={busy === s._id} danger>
                      Delete
                    </ActionButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stories you co-write but don't own. */}
        {collabs.length > 0 && (
          <div style={{ marginTop: '56px' }}>
            <div className="animate-fadeUp" style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
              <h2 className="font-story" style={{ fontSize: '22px', fontWeight: 400, color: 'var(--parchment)' }}>
                Co-writing
              </h2>
              <span style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta30))' }}>{collabs.length}</span>
            </div>
            <div className="animate-fadeUp" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {collabs.map((s) => (
                <div key={s._id} style={{ ...panel, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Link to={`/story/${s._id}`} className="font-story" style={{ fontSize: '18px', color: 'var(--parchment)', textDecoration: 'none' }}>
                          {s.title}
                        </Link>
                        <Badge tone="gold">Collaborator</Badge>
                        {!s.published && <Badge tone="crimson">Hidden</Badge>}
                      </div>
                      <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '8px' }}>
                        {genreLabel(s.genre)} · by {authorNames(s)} · {s.branchCount} {s.branchCount === 1 ? 'branch' : 'branches'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <LinkButton to={`/story/${s._id}`}>Read</LinkButton>
                      <LinkButton to={`/story/${s._id}/edit`} active>Edit map</LinkButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `Delete “${pendingDelete.title}”?` : ''}
        message="This removes the story and every branch permanently. It can't be undone."
        confirmLabel="Delete story"
        cancelLabel="Keep it"
        danger
        busy={Boolean(pendingDelete) && busy === pendingDelete._id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

// ── Shared bits ──────────────────────────────────────────────────────────────

const panel = {
  background: 'var(--surface)',
  border: '1px solid rgba(var(--panel-rgb),var(--pa06))',
  borderRadius: '8px',
  boxShadow: 'var(--card-shadow)',
}

const newButtonStyle = {
  padding: '11px 24px',
  background: 'var(--gold-solid)',
  color: 'var(--on-gold)',
  textDecoration: 'none',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  borderRadius: '4px',
  whiteSpace: 'nowrap',
}

const buttonBase = (active, danger) => ({
  padding: '6px 12px',
  fontSize: '12px',
  letterSpacing: '0.04em',
  border: `1px solid ${danger ? 'rgba(139,26,46,0.4)' : active ? 'rgba(var(--gold-rgb),0.4)' : 'rgba(var(--panel-rgb),var(--pa12))'}`,
  background: 'transparent',
  color: danger ? 'var(--crimson)' : active ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta60))',
  borderRadius: '4px',
  fontFamily: 'inherit',
  textDecoration: 'none',
  display: 'inline-block',
  transition: 'all 0.2s ease',
})

function ActionButton({ children, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ ...buttonBase(false, danger), cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  )
}

function LinkButton({ to, children, active }) {
  return (
    <Link to={to} style={buttonBase(active, false)}>
      {children}
    </Link>
  )
}

function Badge({ children, tone = 'muted' }) {
  const tones = {
    gold: { bg: 'rgba(var(--gold-rgb),0.12)', color: 'var(--gold)', border: 'rgba(var(--gold-rgb),0.3)' },
    crimson: { bg: 'rgba(139,26,46,0.15)', color: '#c45a6e', border: 'rgba(139,26,46,0.4)' },
    muted: { bg: 'rgba(var(--panel-rgb),var(--pa06))', color: 'rgba(var(--text-rgb),var(--ta45))', border: 'rgba(var(--panel-rgb),var(--pa12))' },
  }
  const t = tones[tone] || tones.muted
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px', background: t.bg, color: t.color, border: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}
