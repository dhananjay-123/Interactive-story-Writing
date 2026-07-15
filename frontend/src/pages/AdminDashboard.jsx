import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import ConnectingLoader from '../components/ConnectingLoader'
import { useAuth } from '../context/AuthContext'
import AdminAchievementsPanel from '../components/achievements/AdminAchievementsPanel'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'stories', label: 'Stories' },
  { id: 'reports', label: 'Reports' },
  { id: 'requests', label: 'Requests' },
  { id: 'users', label: 'Users' },
  { id: 'achievements', label: 'Achievements' },
]

const genreLabel = (g) =>
  g === 'sci_fi' ? 'Sci-Fi' : (g || '').charAt(0).toUpperCase() + (g || '').slice(1)

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const [openReports, setOpenReports] = useState(0)
  const [openRequests, setOpenRequests] = useState(0)

  // Keep the reports badge fresh across tabs.
  const refreshBadge = useCallback(() => {
    api.get('/api/admin/reports?status=open')
      .then((r) => setOpenReports(r.data.length))
      .catch(() => {})
  }, [])

  const refreshRequestBadge = useCallback(() => {
    api.get('/api/admin/password-requests?status=pending')
      .then((r) => setOpenRequests(r.data.length))
      .catch(() => {})
  }, [])

  useEffect(() => { refreshBadge(); refreshRequestBadge() }, [refreshBadge, refreshRequestBadge])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div className="animate-fadeUp" style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.7 }}>
            Admin
          </p>
          <h1 className="font-story" style={{ fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Control room
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta45))', marginTop: '8px' }}>
            Everything on the platform, in one place — moderate stories, triage reports, and curate what readers see first.
          </p>
        </div>

        {/* Tabs */}
        <div
          className="animate-fadeUp delay-100"
          style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa10))', marginBottom: '28px', flexWrap: 'wrap' }}
        >
          {TABS.map((t) => {
            const on = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  position: 'relative',
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: on ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta50))',
                  borderBottom: `2px solid ${on ? 'var(--gold)' : 'transparent'}`,
                  marginBottom: '-1px',
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                }}
              >
                {t.label}
                {t.id === 'reports' && openReports > 0 && (
                  <span style={badgeStyle}>{openReports}</span>
                )}
                {t.id === 'requests' && openRequests > 0 && (
                  <span style={badgeStyle}>{openRequests}</span>
                )}
              </button>
            )
          })}
        </div>

        {tab === 'overview' && <Overview />}
        {tab === 'stories' && <StoriesPanel />}
        {tab === 'reports' && <ReportsPanel onChange={refreshBadge} />}
        {tab === 'requests' && <PasswordRequestsPanel onChange={refreshRequestBadge} />}
        {tab === 'users' && <UsersPanel />}
        {tab === 'achievements' && <AdminAchievementsPanel />}
      </div>
    </div>
  )
}

// ── Overview ─────────────────────────────────────────────────────────────────

function Overview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get('/api/admin/stats').then((r) => setData(r.data)).catch(() => setError(true))
  }, [])

  if (error) return <Empty>Couldn't load analytics.</Empty>
  if (!data) return <ConnectingLoader fullScreen={false} message="Gathering the numbers" />

  const { totals, genres, topStories } = data
  const cards = [
    { label: 'Stories', value: totals.totalStories, sub: `${totals.publishedStories} published` },
    { label: 'Featured', value: totals.featuredStories, sub: 'on the home rail' },
    { label: 'Authors & readers', value: totals.totalUsers, sub: `${totals.adminUsers} admin` },
    { label: 'Open reports', value: totals.openReports, sub: 'awaiting review', alert: totals.openReports > 0 },
    { label: 'Likes', value: totals.totalLikes, sub: 'all-time' },
    { label: 'Comments', value: totals.totalComments, sub: 'all-time' },
    { label: 'Ratings', value: totals.totalRatings, sub: 'all-time' },
    { label: 'New this week', value: totals.storiesThisWeek, sub: `${totals.usersThisWeek} new sign-ups` },
  ]
  const maxGenre = Math.max(1, ...genres.map((g) => g.count))

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '40px' }}>
        {cards.map((c) => (
          <div key={c.label} style={{ ...panel, padding: '20px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '10px' }}>
              {c.label}
            </p>
            <p className="font-story" style={{ fontSize: '34px', lineHeight: 1, color: c.alert ? 'var(--crimson)' : 'var(--parchment)' }}>
              {c.value}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '8px' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Genre breakdown */}
        <div style={{ ...panel, padding: '24px' }}>
          <SectionTitle>Stories by genre</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
            {genres.map((g) => (
              <div key={g.genre}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta60))' }}>{genreLabel(g.genre)}</span>
                  <span style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>{g.count}</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(var(--panel-rgb),var(--pa08))', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(g.count / maxGenre) * 100}%`, height: '100%', background: 'var(--gold)', opacity: 0.7, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
            {genres.length === 0 && <Muted>No stories yet.</Muted>}
          </div>
        </div>

        {/* Top stories */}
        <div style={{ ...panel, padding: '24px' }}>
          <SectionTitle>Most engaged</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '12px' }}>
            {topStories.map((s, i) => (
              <Link key={s._id} to={`/story/${s._id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < topStories.length - 1 ? '1px solid rgba(var(--panel-rgb),var(--pa06))' : 'none' }}>
                <span className="font-story" style={{ fontSize: '20px', color: 'rgba(var(--gold-rgb),0.4)', width: '22px' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '14px', color: 'var(--parchment)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                <span style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>♥ {s.likeCount} · ✦ {s.ratingCount}</span>
              </Link>
            ))}
            {topStories.length === 0 && <Muted>No stories yet.</Muted>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stories moderation ───────────────────────────────────────────────────────

function StoriesPanel() {
  const [stories, setStories] = useState(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (filter !== 'all') params.set('filter', filter)
    api.get(`/api/admin/stories?${params.toString()}`)
      .then((r) => setStories(r.data))
      .catch(() => setStories([]))
  }, [q, filter])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const patch = (id, next) =>
    setStories((list) => list.map((s) => (s._id === id ? { ...s, ...next } : s)))

  const toggleFeatured = async (s) => {
    setBusy(s._id)
    try {
      const r = await api.put(`/api/admin/stories/${s._id}/featured`, { featured: !s.featured })
      patch(s._id, { featured: r.data.featured })
    } catch {} finally { setBusy(null) }
  }

  const togglePublished = async (s) => {
    setBusy(s._id)
    try {
      const r = await api.put(`/api/admin/stories/${s._id}/published`, { published: !s.published })
      patch(s._id, { published: r.data.published })
    } catch {} finally { setBusy(null) }
  }

  const remove = async (s) => {
    if (!window.confirm(`Delete "${s.title}"? This removes the story and all its branches permanently.`)) return
    setBusy(s._id)
    try {
      await api.delete(`/api/admin/stories/${s._id}`)
      setStories((list) => list.filter((x) => x._id !== s._id))
    } catch {} finally { setBusy(null) }
  }

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title or author…"
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', 'featured', 'unpublished'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>
              {f === 'all' ? 'All' : f === 'featured' ? 'Featured' : 'Hidden'}
            </button>
          ))}
        </div>
      </div>

      {!stories ? (
        <ConnectingLoader fullScreen={false} message="Loading the catalogue" />
      ) : stories.length === 0 ? (
        <Empty>No stories match.</Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stories.map((s) => (
            <div key={s._id} style={{ ...panel, padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Link to={`/story/${s._id}`} style={{ fontSize: '15px', color: 'var(--parchment)', textDecoration: 'none', fontWeight: 500 }}>
                    {s.title}
                  </Link>
                  {s.featured && <Badge tone="gold">Featured</Badge>}
                  {!s.published && <Badge tone="crimson">Hidden</Badge>}
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '4px' }}>
                  {genreLabel(s.genre)} · by {s.author} · ♥ {s.likeCount} · 💬 {s.commentCount} · {s.branchCount} branches
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <ActionButton onClick={() => toggleFeatured(s)} disabled={busy === s._id} active={s.featured}>
                  {s.featured ? 'Unfeature' : 'Feature'}
                </ActionButton>
                <ActionButton onClick={() => togglePublished(s)} disabled={busy === s._id}>
                  {s.published ? 'Hide' : 'Restore'}
                </ActionButton>
                <ActionButton onClick={() => remove(s)} disabled={busy === s._id} danger>
                  Delete
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Reports ──────────────────────────────────────────────────────────────────

const REASON_LABEL = {
  spam: 'Spam', offensive: 'Offensive', plagiarism: 'Plagiarism', broken: 'Broken / bug', other: 'Other',
}

function ReportsPanel({ onChange }) {
  const [reports, setReports] = useState(null)
  const [status, setStatus] = useState('open')
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => {
    api.get(`/api/admin/reports?status=${status}`)
      .then((r) => setReports(r.data))
      .catch(() => setReports([]))
  }, [status])

  useEffect(() => { load() }, [load])

  const act = async (report, nextStatus) => {
    setBusy(report._id)
    try {
      await api.put(`/api/admin/reports/${report._id}`, { status: nextStatus })
      load()
      onChange?.()
    } catch {} finally { setBusy(null) }
  }

  const removeStory = async (report) => {
    if (!report.story) return
    if (!window.confirm(`Delete "${report.story.title}"? This removes the story permanently.`)) return
    setBusy(report._id)
    try {
      await api.delete(`/api/admin/stories/${report.storyId}`)
      await api.put(`/api/admin/reports/${report._id}`, { status: 'resolved' })
      load()
      onChange?.()
    } catch {} finally { setBusy(null) }
  }

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {['open', 'resolved', 'dismissed', 'all'].map((s) => (
          <button key={s} onClick={() => setStatus(s)} style={chip(status === s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {!reports ? (
        <ConnectingLoader fullScreen={false} message="Loading the queue" />
      ) : reports.length === 0 ? (
        <Empty>{status === 'open' ? 'Nothing to review — the queue is clear.' : 'No reports here.'}</Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reports.map((r) => (
            <div key={r._id} style={{ ...panel, padding: '18px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Badge tone="crimson">{REASON_LABEL[r.reason] || r.reason}</Badge>
                    {r.status !== 'open' && <Badge tone="muted">{r.status}</Badge>}
                    {r.story ? (
                      <Link to={`/story/${r.storyId}`} style={{ fontSize: '15px', color: 'var(--parchment)', textDecoration: 'none', fontWeight: 500 }}>
                        {r.story.title}
                      </Link>
                    ) : (
                      <span style={{ fontSize: '15px', color: 'rgba(var(--text-rgb),var(--ta40))', fontStyle: 'italic' }}>Story deleted</span>
                    )}
                  </div>
                  {r.details && (
                    <p style={{ fontSize: '13.5px', color: 'rgba(var(--text-rgb),var(--ta60))', marginTop: '8px', lineHeight: 1.5 }}>
                      “{r.details}”
                    </p>
                  )}
                  <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '8px' }}>
                    Reported by {r.reporter ? r.reporter.displayName : 'a former user'} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {r.status === 'open' && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <ActionButton onClick={() => act(r, 'dismissed')} disabled={busy === r._id}>Dismiss</ActionButton>
                    <ActionButton onClick={() => act(r, 'resolved')} disabled={busy === r._id} active>Resolve</ActionButton>
                    {r.story && (
                      <ActionButton onClick={() => removeStory(r)} disabled={busy === r._id} danger>Delete story</ActionButton>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Users ────────────────────────────────────────────────────────────────────

// ── Password reset requests ──────────────────────────────────────────────────

function PasswordRequestsPanel({ onChange }) {
  const [status, setStatus] = useState('pending')
  const [requests, setRequests] = useState(null)
  const [busy, setBusy] = useState(null)
  const [resetting, setResetting] = useState(null) // request id with an open form

  const load = useCallback(() => {
    setRequests(null)
    api.get(`/api/admin/password-requests?status=${status}`)
      .then((r) => setRequests(r.data))
      .catch(() => setRequests([]))
  }, [status])
  useEffect(() => { load() }, [load])

  const dismiss = async (request) => {
    setBusy(request._id)
    try {
      await api.put(`/api/admin/password-requests/${request._id}`, { status: 'dismissed' })
      load()
      onChange?.()
    } catch (e) {
      window.alert(e?.response?.data?.message || 'Could not dismiss the request.')
    } finally { setBusy(null) }
  }

  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['pending', 'resolved', 'dismissed', 'all'].map((s) => (
          <button key={s} onClick={() => setStatus(s)} style={chip(status === s)}>{s}</button>
        ))}
      </div>

      {!requests ? (
        <ConnectingLoader fullScreen={false} message="Loading requests" />
      ) : requests.length === 0 ? (
        <Empty>{status === 'pending' ? 'Nobody is locked out.' : `No ${status} requests.`}</Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {requests.map((r) => (
            <div key={r._id} style={{ ...panel, padding: '16px 18px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Link to={`/author/${r.user.username}`} style={{ fontSize: '15px', color: 'var(--parchment)', textDecoration: 'none', fontWeight: 500 }}>
                      {r.user.displayName}
                    </Link>
                    {r.user.role === 'admin' && <Badge tone="gold">Admin</Badge>}
                    {r.status !== 'pending' && <Badge>{r.status}</Badge>}
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '4px' }}>
                    @{r.user.username} · {r.user.email} · asked {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                  {r.note && (
                    <p className="font-story" style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta60))', marginTop: '10px', lineHeight: 1.6, fontStyle: 'italic' }}>
                      “{r.note}”
                    </p>
                  )}
                </div>

                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <ActionButton
                      onClick={() => setResetting(resetting === r._id ? null : r._id)}
                      active={resetting !== r._id}
                    >
                      {resetting === r._id ? 'Cancel' : 'Set password'}
                    </ActionButton>
                    <ActionButton onClick={() => dismiss(r)} disabled={busy === r._id} danger>
                      Dismiss
                    </ActionButton>
                  </div>
                )}
              </div>

              {resetting === r._id && (
                <SetPasswordForm
                  user={r.user}
                  requestId={r._id}
                  onDone={() => { setResetting(null); load(); onChange?.() }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Admin-facing reset form. The new password is shown in the clear on purpose —
// the admin has to read it back to the locked-out person somehow.
function SetPasswordForm({ user, requestId, onDone }) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [issued, setIssued] = useState('')

  const generate = () => {
    const bytes = new Uint8Array(9)
    crypto.getRandomValues(bytes)
    // base64 → url-safe, ~12 chars.
    setPassword(btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, 'x'))
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.put(`/api/admin/users/${user._id}/password`, {
        newPassword: password,
        requestId: requestId || undefined,
      })
      setIssued(password)
      setPassword('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not reset the password.')
    } finally { setSaving(false) }
  }

  if (issued) {
    return (
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(var(--panel-rgb),var(--pa08))' }}>
        <p style={{ fontSize: '13px', color: 'var(--gold)', marginBottom: '8px' }}>
          Password set for @{user.username}. Copy it now — it isn't stored anywhere.
        </p>
        <code style={{ display: 'inline-block', padding: '8px 12px', background: 'rgba(var(--panel-rgb),var(--pa06))', border: '1px solid rgba(var(--panel-rgb),var(--pa12))', borderRadius: '4px', fontSize: '14px', color: 'var(--parchment)', letterSpacing: '0.05em' }}>
          {issued}
        </code>
        <div style={{ marginTop: '12px' }}>
          <ActionButton onClick={onDone}>Done</ActionButton>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(var(--panel-rgb),var(--pa08))' }}>
      <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '10px' }}>
        Signs @{user.username} out everywhere. They'll need this password to get back in.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min 8 characters)"
          autoComplete="off"
          style={{ ...inputStyle, flex: '1 1 240px' }}
        />
        <ActionButton onClick={generate}>Generate</ActionButton>
        <button type="submit" disabled={saving || password.length < 8} style={primaryButton(saving || password.length < 8)}>
          {saving ? 'Setting…' : 'Set password'}
        </button>
      </div>
      {error && <p style={{ fontSize: '12px', color: 'var(--crimson)', marginTop: '10px' }}>{error}</p>}
    </form>
  )
}

function UsersPanel() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState(null)
  const [busy, setBusy] = useState(null)
  const [open, setOpen] = useState({}) // userId -> 'detail' | 'reset' | 'ban'
  const [q, setQ] = useState('')

  const load = useCallback(() => {
    api.get('/api/admin/users').then((r) => setUsers(r.data)).catch(() => setUsers([]))
  }, [])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    if (!users) return null
    const term = q.trim().toLowerCase()
    if (!term) return users
    return users.filter((u) =>
      u.username.toLowerCase().includes(term) ||
      (u.displayName || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    )
  }, [users, q])

  const toggle = (id, pane) =>
    setOpen((o) => ({ ...o, [id]: o[id] === pane ? null : pane }))

  const patch = (id, next) =>
    setUsers((list) => list.map((x) => (x._id === id ? { ...x, ...next } : x)))

  const setRole = async (u, role) => {
    if (role !== 'admin' && !window.confirm(`Remove admin access from ${u.displayName}?`)) return
    setBusy(u._id)
    try {
      const r = await api.put(`/api/admin/users/${u._id}/role`, { role })
      patch(u._id, { role: r.data.role })
    } catch (e) {
      window.alert(e?.response?.data?.message || 'Could not change role.')
    } finally { setBusy(null) }
  }

  const reinstate = async (u) => {
    setBusy(u._id)
    try {
      const r = await api.put(`/api/admin/users/${u._id}/ban`, { banned: false })
      patch(u._id, { banned: r.data.banned, banReason: null })
    } catch (e) {
      window.alert(e?.response?.data?.message || 'Could not reinstate the account.')
    } finally { setBusy(null) }
  }

  if (!users) return <ConnectingLoader fullScreen={false} message="Loading the roster" />
  if (users.length === 0) return <Empty>No users yet.</Empty>

  return (
    <div className="animate-fadeUp" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, username, or email…"
          style={inputStyle}
        />
        <span style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))', whiteSpace: 'nowrap' }}>
          {shown.length} of {users.length}
        </span>
      </div>

      {shown.length === 0 ? (
        <Empty>No one matches “{q.trim()}”.</Empty>
      ) : shown.map((u) => (
        <div key={u._id} style={{ ...panel, padding: '14px 18px', opacity: u.banned ? 0.72 : 1 }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Link to={`/author/${u.username}`} style={{ fontSize: '15px', color: 'var(--parchment)', textDecoration: 'none', fontWeight: 500 }}>
                  {u.displayName}
                </Link>
                {u.role === 'admin' && <Badge tone="gold">Admin</Badge>}
                {u.banned && <Badge tone="crimson">Suspended</Badge>}
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '4px' }}>
                @{u.username} · {u.email} · {u.storyCount} {u.storyCount === 1 ? 'story' : 'stories'} · joined {new Date(u.createdAt).toLocaleDateString()}
              </p>
              {u.banned && u.banReason && (
                <p style={{ fontSize: '12px', color: 'var(--crimson)', marginTop: '4px' }}>
                  Suspended: {u.banReason}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <ActionButton onClick={() => toggle(u._id, 'detail')} active={open[u._id] === 'detail'}>
                {open[u._id] === 'detail' ? 'Close' : 'View'}
              </ActionButton>
              <ActionButton onClick={() => toggle(u._id, 'reset')}>
                {open[u._id] === 'reset' ? 'Cancel' : 'Reset password'}
              </ActionButton>
              {/* Suspension is offered only where the server would allow it:
                  never on yourself, never on a sitting admin (demote first). */}
              {u.banned ? (
                <ActionButton onClick={() => reinstate(u)} disabled={busy === u._id} active>Reinstate</ActionButton>
              ) : u._id !== me?._id && u.role !== 'admin' ? (
                <ActionButton onClick={() => toggle(u._id, 'ban')} danger>
                  {open[u._id] === 'ban' ? 'Cancel' : 'Suspend'}
                </ActionButton>
              ) : null}
              {u.role === 'admin' ? (
                <ActionButton onClick={() => setRole(u, 'author')} disabled={busy === u._id}>Revoke admin</ActionButton>
              ) : (
                <ActionButton onClick={() => setRole(u, 'admin')} disabled={busy === u._id} active>Make admin</ActionButton>
              )}
            </div>
          </div>

          {open[u._id] === 'reset' && <SetPasswordForm user={u} onDone={() => toggle(u._id, 'reset')} />}
          {open[u._id] === 'ban' && (
            <BanForm
              user={u}
              onDone={(banned, reason) => { patch(u._id, { banned, banReason: reason }); toggle(u._id, 'ban') }}
            />
          )}
          {open[u._id] === 'detail' && <UserDetail userId={u._id} onStoriesChanged={load} />}
        </div>
      ))}
    </div>
  )
}

// Suspension needs a reason on the record — "why" matters more than "who" a year later.
function BanForm({ user, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const r = await api.put(`/api/admin/users/${user._id}/ban`, { banned: true, reason: reason.trim() || null })
      onDone(r.data.banned, r.data.banReason)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not suspend the account.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={subPanel}>
      <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '10px' }}>
        Signs @{user.username} out everywhere and blocks them from signing back in. Their stories
        stay published — hide or delete those separately.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional, max 300 chars)"
          maxLength={300}
          style={{ ...inputStyle, flex: '1 1 260px' }}
        />
        <button type="submit" disabled={saving} style={dangerButton(saving)}>
          {saving ? 'Suspending…' : 'Suspend account'}
        </button>
      </div>
      {error && <p style={{ fontSize: '12px', color: 'var(--crimson)', marginTop: '10px' }}>{error}</p>}
    </form>
  )
}

// Everything about one account, plus their catalogue (including hidden stories).
function UserDetail({ userId, onStoriesChanged }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => {
    api.get(`/api/admin/users/${userId}`)
      .then((r) => setData(r.data))
      .catch(() => setData({ error: true }))
  }, [userId])
  useEffect(() => { load() }, [load])

  const act = async (story, fn) => {
    setBusy(story._id)
    try { await fn() } catch (e) {
      window.alert(e?.response?.data?.message || 'That action failed.')
    } finally { setBusy(null) }
  }

  const toggleFeatured = (s) => act(s, async () => {
    const r = await api.put(`/api/admin/stories/${s._id}/featured`, { featured: !s.featured })
    setData((d) => ({ ...d, stories: d.stories.map((x) => (x._id === s._id ? { ...x, featured: r.data.featured } : x)) }))
    onStoriesChanged?.()
  })

  const togglePublished = (s) => act(s, async () => {
    const r = await api.put(`/api/admin/stories/${s._id}/published`, { published: !s.published })
    setData((d) => ({ ...d, stories: d.stories.map((x) => (x._id === s._id ? { ...x, published: r.data.published } : x)) }))
  })

  const remove = (s) => {
    if (!window.confirm(`Delete "${s.title}"? This removes the story and all its branches permanently.`)) return
    act(s, async () => {
      await api.delete(`/api/admin/stories/${s._id}`)
      setData((d) => ({ ...d, stories: d.stories.filter((x) => x._id !== s._id) }))
      onStoriesChanged?.()
    })
  }

  if (!data) return <div style={subPanel}><Muted>Loading…</Muted></div>
  if (data.error) return <div style={subPanel}><Muted>Could not load this account.</Muted></div>

  const { user, stories } = data
  const facts = [
    ['Email', user.email],
    ['Role', user.role],
    ['Joined', new Date(user.createdAt).toLocaleDateString()],
    ['Stories', `${user.publishedCount} published / ${user.storyCount} total`],
    ['Followers', user.followerCount],
    ['Following', user.followingCount],
    ['Likes received', user.likesReceived],
    ['Comments written', user.commentCount],
    ['Open reports', user.openReports],
    ['Status', user.banned ? `suspended${user.banReason ? ` — ${user.banReason}` : ''}` : 'in good standing'],
  ]

  return (
    <div style={subPanel}>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px 20px', margin: 0 }}>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta35))' }}>
              {label}
            </dt>
            <dd style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--parchment)', wordBreak: 'break-word' }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {user.bio && (
        <p className="font-story" style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta60))', marginTop: '16px', lineHeight: 1.6, fontStyle: 'italic' }}>
          “{user.bio}”
        </p>
      )}

      <div style={{ marginTop: '20px' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta35))', marginBottom: '10px' }}>
          Their stories
        </p>
        {stories.length === 0 ? (
          <Muted>Nothing written yet.</Muted>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stories.map((s) => (
              <div key={s._id} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', padding: '10px 12px', border: '1px solid rgba(var(--panel-rgb),var(--pa08))', borderRadius: '4px' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Link to={`/story/${s._id}`} style={{ fontSize: '14px', color: 'var(--parchment)', textDecoration: 'none' }}>
                      {s.title}
                    </Link>
                    {s.featured && <Badge tone="gold">Featured</Badge>}
                    {!s.published && <Badge tone="crimson">Hidden</Badge>}
                  </div>
                  <p style={{ fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '3px' }}>
                    {genreLabel(s.genre)} · ♥ {s.likeCount} · 💬 {s.commentCount} · {s.branchCount} branches
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <ActionButton onClick={() => toggleFeatured(s)} disabled={busy === s._id} active={s.featured}>
                    {s.featured ? 'Unfeature' : 'Feature'}
                  </ActionButton>
                  <ActionButton onClick={() => togglePublished(s)} disabled={busy === s._id}>
                    {s.published ? 'Hide' : 'Restore'}
                  </ActionButton>
                  <ActionButton onClick={() => remove(s)} disabled={busy === s._id} danger>Delete</ActionButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shared bits ──────────────────────────────────────────────────────────────

const panel = {
  background: 'rgba(var(--panel-rgb),var(--pa02))',
  border: '1px solid rgba(var(--panel-rgb),var(--pa08))',
  borderRadius: '8px',
}

const inputStyle = {
  flex: '1 1 220px',
  background: 'rgba(var(--panel-rgb),var(--pa04))',
  border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
  borderRadius: '4px',
  padding: '8px 14px',
  color: 'var(--parchment)',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
}

const badgeStyle = {
  marginLeft: '7px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '16px',
  height: '16px',
  padding: '0 4px',
  fontSize: '10px',
  fontWeight: 700,
  borderRadius: '8px',
  background: 'var(--crimson)',
  color: '#fff',
  verticalAlign: 'middle',
}

// The expandable drawer under a roster row.
const subPanel = {
  marginTop: '16px',
  paddingTop: '16px',
  borderTop: '1px solid rgba(var(--panel-rgb),var(--pa08))',
}

const dangerButton = (disabled) => ({
  padding: '7px 16px',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  border: '1px solid rgba(139,26,46,0.5)',
  background: 'rgba(139,26,46,0.15)',
  color: '#c45a6e',
  borderRadius: '4px',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  fontFamily: 'inherit',
})

const primaryButton = (disabled) => ({
  padding: '7px 16px',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  border: 'none',
  background: 'var(--gold-solid)',
  color: 'var(--on-gold)',
  borderRadius: '4px',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  fontFamily: 'inherit',
})

const chip = (on) => ({
  padding: '6px 14px',
  fontSize: '12px',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  border: `1px solid ${on ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa12))'}`,
  background: on ? 'rgba(var(--gold-rgb),0.1)' : 'transparent',
  color: on ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta50))',
  cursor: 'pointer',
  borderRadius: '4px',
  fontFamily: 'inherit',
  transition: 'all 0.2s ease',
})

// type defaults to "button": these sit inside forms, and a bare <button> would
// submit them.
function ActionButton({ children, onClick, disabled, active, danger, type = 'button' }) {
  const color = danger ? 'var(--crimson)' : active ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta60))'
  const border = danger ? 'rgba(139,26,46,0.4)' : active ? 'rgba(var(--gold-rgb),0.4)' : 'rgba(var(--panel-rgb),var(--pa12))'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        fontSize: '12px',
        letterSpacing: '0.04em',
        border: `1px solid ${border}`,
        background: 'transparent',
        color,
        borderRadius: '4px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
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

function SectionTitle({ children }) {
  return (
    <h2 className="font-story" style={{ fontSize: '18px', fontWeight: 400, color: 'var(--parchment)' }}>
      {children}
    </h2>
  )
}

function Muted({ children }) {
  return <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>{children}</p>
}

function Empty({ children }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 0' }}>
      <p style={{ color: 'rgba(var(--text-rgb),var(--ta35))', fontSize: '15px' }}>{children}</p>
    </div>
  )
}
