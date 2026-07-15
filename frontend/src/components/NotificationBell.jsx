import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext'
import { avatarSrc } from '../avatars/catalog'

// Turn a stored notification into the line the tray shows and the place it links.
function present(n) {
  const who = n.actor?.displayName || 'Someone'
  const title = n.story?.title || 'a story'
  const storyId = n.story?._id
  switch (n.type) {
    case 'comment':
      return { who, verb: 'commented on', title, extra: n.data?.snippet, to: storyId && `/story/${storyId}` }
    case 'collaborator':
      return { who, verb: 'added you as a co-author on', title, to: storyId && `/story/${storyId}/edit` }
    case 'story':
      return { who, verb: 'published a new story:', title, to: storyId && `/story/${storyId}` }
    default:
      return { who, verb: 'did something with', title, to: storyId && `/story/${storyId}` }
  }
}

function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function NotificationBell() {
  const { items, unseen, markAllSeen } = useNotifications()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Close when the route changes (e.g. after tapping a notification).
  useEffect(() => setOpen(false), [location.pathname])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && unseen) markAllSeen()
  }

  const openItem = (n) => {
    const { to } = present(n)
    setOpen(false)
    if (to) navigate(to)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={toggle}
        aria-label={unseen ? `Notifications, ${unseen} unread` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '30px',
          height: '30px',
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: open ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta50))',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = open ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta50))')
        }
      >
        <BellIcon />
        {unseen > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '15px',
              height: '15px',
              padding: '0 4px',
              borderRadius: '8px',
              background: 'var(--gold-solid)',
              color: 'var(--on-gold)',
              fontSize: '9px',
              fontWeight: 700,
              lineHeight: '15px',
              textAlign: 'center',
            }}
          >
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
      </button>

      {open && (
        <div
          className="animate-fadeUp"
          style={{
            position: 'absolute',
            top: '40px',
            right: 0,
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: '70vh',
            overflowY: 'auto',
            background: 'var(--ink-soft)',
            border: '1px solid rgba(var(--gold-rgb),0.2)',
            borderRadius: '10px',
            boxShadow: '0 14px 40px -14px rgba(0,0,0,0.55)',
            zIndex: 60,
          }}
        >
          <div
            style={{
              padding: '13px 16px',
              borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa10))',
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(var(--text-rgb),var(--ta55))',
            }}
          >
            Notifications
          </div>

          {items.length === 0 ? (
            <p
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                fontSize: '13px',
                color: 'rgba(var(--text-rgb),var(--ta50))',
              }}
            >
              Nothing yet. Comments, co-author invites, and new stories from authors
              you follow will land here.
            </p>
          ) : (
            items.map((n) => {
              const v = present(n)
              return (
                <button
                  key={n._id}
                  onClick={() => openItem(n)}
                  style={{
                    display: 'flex',
                    gap: '11px',
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    background: n.seen ? 'none' : 'rgba(var(--gold-rgb),0.07)',
                    border: 'none',
                    borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa10))',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(var(--gold-rgb),0.12)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = n.seen
                      ? 'none'
                      : 'rgba(var(--gold-rgb),0.07)')
                  }
                >
                  <ActorDot actor={n.actor} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        lineHeight: 1.45,
                        color: 'rgba(var(--text-rgb),var(--ta80))',
                      }}
                    >
                      <strong style={{ color: 'var(--parchment)', fontWeight: 600 }}>{v.who}</strong>{' '}
                      {v.verb}{' '}
                      <strong style={{ color: 'var(--parchment)', fontWeight: 600 }}>{v.title}</strong>
                    </span>
                    {v.extra && (
                      <span
                        style={{
                          display: 'block',
                          marginTop: '3px',
                          fontSize: '12px',
                          fontStyle: 'italic',
                          color: 'rgba(var(--text-rgb),var(--ta55))',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        “{v.extra}”
                      </span>
                    )}
                    <span
                      style={{
                        display: 'block',
                        marginTop: '4px',
                        fontSize: '10px',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'rgba(var(--text-rgb),var(--ta45))',
                      }}
                    >
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function ActorDot({ actor }) {
  const initial = (actor?.displayName || '?').charAt(0).toUpperCase()
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'rgba(var(--gold-rgb),0.18)',
        color: 'var(--gold)',
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
      }}
    >
      {actor?.avatarUrl ? (
        <img src={avatarSrc(actor.avatarUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initial
      )}
    </span>
  )
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
