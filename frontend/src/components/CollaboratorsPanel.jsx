import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

// Manage (owner) or view (collaborator) the co-authors on a story. Adding and
// removing collaborators are owner-only server-side; a collaborator can remove
// only themselves. Live presence/locks are handled separately in the editor.
export default function CollaboratorsPanel({ storyId, isOwner }) {
  const { user } = useAuth()
  const [list, setList] = useState(null)
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.get(`/api/stories/${storyId}/collaborators`)
      .then((r) => setList(r.data))
      .catch(() => setList([]))
  }, [storyId])

  useEffect(() => { load() }, [load])

  const invite = async (e) => {
    e.preventDefault()
    const name = username.trim()
    if (!name) return
    setBusy(true)
    setError('')
    try {
      const r = await api.post(`/api/stories/${storyId}/collaborators`, { username: name })
      setList(r.data)
      setUsername('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not add that person.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (u) => {
    setBusy(true)
    setError('')
    try {
      const r = await api.delete(`/api/stories/${storyId}/collaborators/${u._id}`)
      setList(r.data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not remove that person.')
    } finally {
      setBusy(false)
    }
  }

  const count = list?.length ?? 0

  return (
    <div style={{ margin: '0 0 36px', padding: '20px 22px', border: '1px solid rgba(var(--panel-rgb),var(--pa08))', borderRadius: '8px', background: 'rgba(var(--panel-rgb),var(--pa02))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 className="font-story" style={{ fontSize: '18px', fontWeight: 400, color: 'var(--parchment)' }}>
            Co-authors {count > 0 && <span style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>· {count}</span>}
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '4px' }}>
            {isOwner ? 'Invite other authors to write this story with you, live.' : 'You’re writing this story alongside its team.'}
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ background: 'none', border: '1px solid rgba(var(--panel-rgb),var(--pa12))', color: 'rgba(var(--text-rgb),var(--ta60))', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', letterSpacing: '0.05em', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {open ? 'Hide' : 'Manage'}
        </button>
      </div>

      {open && (
        <div className="animate-fadeUp" style={{ marginTop: '20px' }}>
          {isOwner && (
            <form onSubmit={invite} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: list && list.length ? '18px' : '0' }}>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Invite by username…"
                autoComplete="off"
                style={{ flex: '1 1 220px', background: 'rgba(var(--panel-rgb),var(--pa04))', border: '1px solid rgba(var(--panel-rgb),var(--pa10))', borderRadius: '4px', padding: '9px 14px', color: 'var(--parchment)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                type="submit"
                disabled={busy || !username.trim()}
                style={{ padding: '9px 20px', background: 'var(--gold-solid)', color: 'var(--on-gold)', border: 'none', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: '4px', cursor: busy || !username.trim() ? 'default' : 'pointer', opacity: busy || !username.trim() ? 0.5 : 1, fontFamily: 'inherit' }}
              >
                {busy ? 'Adding…' : 'Invite'}
              </button>
            </form>
          )}

          {error && <p style={{ fontSize: '12px', color: 'var(--crimson)', marginBottom: '12px' }}>{error}</p>}

          {list === null ? (
            <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>Loading…</p>
          ) : list.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>
              {isOwner ? 'No co-authors yet — invite someone above.' : 'No other co-authors yet.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {list.map((u) => {
                const isMe = user && u._id === user._id
                return (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                    <span className="font-story" style={{ width: '34px', height: '34px', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: 'var(--gold)', border: '1px solid rgba(var(--gold-rgb),0.4)' }}>
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        (u.displayName || '?').charAt(0).toUpperCase()
                      )}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={`/author/${u.username}`} className="font-story" style={{ fontSize: '15px', color: 'var(--parchment)', textDecoration: 'none' }}>
                        {u.displayName}
                      </Link>
                      <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>@{u.username}</p>
                    </div>
                    {(isOwner || isMe) && (
                      <button
                        onClick={() => remove(u)}
                        disabled={busy}
                        style={{ background: 'none', border: '1px solid rgba(139,26,46,0.4)', color: 'var(--crimson)', borderRadius: '4px', padding: '5px 12px', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.5 : 1 }}
                      >
                        {isMe && !isOwner ? 'Leave' : 'Remove'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
