import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import ConnectingLoader from '../ConnectingLoader'
import Badge from './Badge'
import BadgeDetail from './BadgeDetail'
import { rarityOf, rarityRank } from './rarity'
import { avatarSrc } from '../../avatars/catalog'
import { focusBorder, blurBorder } from '../authStyles'

// Admin management for the achievement system. Three views: platform analytics,
// per-user management (grant/revoke/tier/reset/recalculate with live preview), and
// the audit trail. Badge/tier definitions are config records in the codebase, so
// this surfaces and awards them rather than editing them at runtime — new badges
// ship as config, which the catalogue browser here previews.

const VIEWS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'manage', label: 'Manage user' },
  { id: 'catalogue', label: 'Catalogue' },
  { id: 'audit', label: 'Audit log' },
]

export default function AdminAchievementsPanel() {
  const [view, setView] = useState('analytics')
  return (
    <div className="animate-fadeUp">
      <div style={{ display: 'flex', gap: '6px', marginBottom: '22px', flexWrap: 'wrap' }}>
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => setView(v.id)} style={chip(view === v.id)}>{v.label}</button>
        ))}
      </div>
      {view === 'analytics' && <Analytics />}
      {view === 'manage' && <ManageUser />}
      {view === 'catalogue' && <Catalogue />}
      {view === 'audit' && <AuditLog />}
    </div>
  )
}

// ── Analytics ────────────────────────────────────────────────────────────────

function Analytics() {
  const [data, setData] = useState(null)
  const [recalcing, setRecalcing] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState('')

  useEffect(() => {
    api.get('/api/admin/achievements/overview').then((r) => setData(r.data)).catch(() => setData({ error: true }))
  }, [])

  const recalcAll = async () => {
    if (!window.confirm('Recalculate achievements for every user from source? This can take a moment on a large database.')) return
    setRecalcing(true); setRecalcMsg('')
    try {
      const r = await api.post('/api/admin/achievements/recalculate-all')
      setRecalcMsg(`Recalculated ${r.data.processed} users.`)
    } catch { setRecalcMsg('Recalculation failed.') } finally { setRecalcing(false) }
  }

  if (!data) return <ConnectingLoader fullScreen={false} message="Counting badges" />
  if (data.error) return <Empty>Couldn't load achievement analytics.</Empty>

  const { overview, badges, tiers } = data
  const cards = [
    { label: 'Badges unlocked', value: overview.totalUnlocks, sub: 'all-time' },
    { label: 'Collectors', value: overview.usersWithBadges, sub: 'users with ≥1 badge' },
    { label: 'Manual grants', value: overview.manualGrants, sub: 'by admins' },
    { label: 'Unlocked this week', value: overview.unlocksThisWeek, sub: 'last 7 days' },
    { label: 'Stories completed', value: overview.totalCompletions, sub: 'reader finishes' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', flex: 1 }}>
          {cards.map((c) => (
            <div key={c.label} style={{ ...panel, padding: '16px' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '8px' }}>{c.label}</p>
              <p className="font-story" style={{ fontSize: '28px', lineHeight: 1, color: 'var(--parchment)' }}>{c.value}</p>
              <p style={{ fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '6px' }}>{c.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '26px' }}>
        <button onClick={recalcAll} disabled={recalcing} style={primaryButton(recalcing)}>
          {recalcing ? 'Recalculating…' : 'Recalculate all users'}
        </button>
        {recalcMsg && <span style={{ fontSize: '13px', color: 'var(--gold)' }}>{recalcMsg}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={{ ...panel, padding: '20px' }}>
          <SectionTitle>Badge holders</SectionTitle>
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
            {badges.map((b) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', transform: 'rotate(45deg)', background: rarityOf(b.rarity).ring, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--parchment)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.name}{b.hidden ? ' ·hidden' : ''}{b.manual ? ' ·manual' : ''}
                </span>
                <span className="font-story" style={{ fontSize: '14px', color: 'var(--gold)' }}>{b.holders}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...panel, padding: '20px' }}>
          <SectionTitle>Tier occupancy</SectionTitle>
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {tiers.length === 0 ? <Muted>No tiers reached yet.</Muted> : tiers.map((t) => (
              <div key={`${t.trackId}:${t.tierId}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa04))' }}>
                <span style={{ color: 'rgba(var(--text-rgb),var(--ta60))' }}>{t.trackId} · {t.tierId.replace(/_/g, ' ')}</span>
                <span className="font-story" style={{ color: 'var(--gold)' }}>{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Manage user ──────────────────────────────────────────────────────────────

function ManageUser() {
  const [query, setQuery] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [catalog, setCatalog] = useState(null)
  const [pickBadge, setPickBadge] = useState('')
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState(null)
  const [roster, setRoster] = useState([])
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    api.get('/api/admin/achievements/catalog').then((r) => setCatalog(r.data)).catch(() => {})
    api.get('/api/admin/users').then((r) => setRoster(r.data)).catch(() => {})
  }, [])

  const load = useCallback(async (username) => {
    if (!username.trim()) return
    setLoading(true); setError('')
    try {
      const r = await api.get(`/api/admin/achievements/users/${username.trim()}`)
      setData(r.data)
    } catch (e) {
      setError(e?.response?.data?.message || 'User not found.'); setData(null)
    } finally { setLoading(false) }
  }, [])

  // Live matches as the admin types — filtered from the roster we already hold.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return roster
      .filter((u) =>
        u.username.toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [query, roster])

  const pick = (u) => {
    setQuery(u.username)
    setFocused(false)
    setError('')
    load(u.username)
  }

  const reload = () => data && load(data.user.username)

  const act = async (fn) => {
    setBusy(true)
    try { await fn(); await reload() } catch (e) { window.alert(e?.response?.data?.message || 'That action failed.') } finally { setBusy(false) }
  }

  const userId = data?.user?._id
  const grant = () => pickBadge && act(() => api.post(`/api/admin/achievements/users/${userId}/grant`, { badgeId: pickBadge }))
  const revoke = (badgeId) => act(() => api.post(`/api/admin/achievements/users/${userId}/revoke`, { badgeId }))
  const assignTier = (trackId, tierId) => act(() => api.post(`/api/admin/achievements/users/${userId}/tier`, { trackId, tierId }))
  const reset = () => window.confirm('Reset this user’s computed progress? Manual grants are kept.') && act(() => api.post(`/api/admin/achievements/users/${userId}/reset`))
  const recalc = () => act(() => api.post(`/api/admin/achievements/users/${userId}/recalculate`))

  const earned = data ? data.profile.badges.filter((b) => b.state === 'unlocked') : []

  return (
    <div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (matches[0]) pick(matches[0]) }}
        style={{ position: 'relative', maxWidth: '420px', marginBottom: '20px' }}
      >
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setFocused(true) }}
          onFocus={(e) => { setFocused(true); focusBorder(e) }}
          onBlur={(e) => { setTimeout(() => setFocused(false), 120); blurBorder(e) }}
          placeholder="Search by name, username, or email…"
          autoComplete="off"
          style={{ ...inputStyle, width: '100%' }}
        />
        {focused && query.trim() && (
          <div style={dropdown}>
            {matches.length === 0 ? (
              <p style={{ padding: '12px 14px', fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>No one matches “{query.trim()}”.</p>
            ) : (
              matches.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(u)}
                  style={matchRow}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--gold-rgb),0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={matchAvatar}>
                    {u.avatarUrl
                      ? <img src={avatarSrc(u.avatarUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (u.displayName || '?').charAt(0).toUpperCase()}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '14px', color: 'var(--parchment)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.displayName}
                      {u.role === 'admin' && <span style={{ marginLeft: '6px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)' }}>admin</span>}
                    </span>
                    <span style={{ display: 'block', fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>@{u.username}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </form>
      {error && <p style={{ fontSize: '13px', color: 'var(--crimson)', marginBottom: '16px' }}>{error}</p>}

      {loading ? <ConnectingLoader fullScreen={false} message="Loading user" /> : data && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <Link to={`/author/${data.user.username}`} className="font-story" style={{ fontSize: '20px', color: 'var(--parchment)', textDecoration: 'none' }}>{data.user.displayName}</Link>
            <span style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>@{data.user.username}</span>
            <span style={{ fontSize: '13px', color: 'var(--gold)' }}>{data.profile.summary.unlocked}/{data.profile.summary.total} badges</span>
          </div>

          {/* Tiers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '22px' }}>
            {data.profile.tiers.map((t) => (
              <div key={t.trackId} style={{ ...panel, padding: '16px' }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '8px' }}>{t.label} tier</p>
                <p className="font-story" style={{ fontSize: '18px', color: 'var(--parchment)', marginBottom: '10px' }}>{t.current.label}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {catalog?.tracks.find((tr) => tr.id === t.trackId)?.tiers.map((tier) => (
                    <button key={tier.id} onClick={() => assignTier(t.trackId, tier.id)} disabled={busy} style={miniBtn(tier.id === t.current.id)}>{tier.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Grant / revoke */}
          <div style={{ ...panel, padding: '18px', marginBottom: '22px' }}>
            <SectionTitle>Grant a badge</SectionTitle>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <select value={pickBadge} onChange={(e) => setPickBadge(e.target.value)} style={{ ...inputStyle, flex: '1 1 260px' }}>
                <option value="">Select a badge…</option>
                {catalog?.badges.map((b) => (
                  <option key={b.id} value={b.id}>{rarityOf(b.rarity).label} — {b.name}{b.manual ? ' (manual)' : ''}</option>
                ))}
              </select>
              <button onClick={grant} disabled={busy || !pickBadge} style={primaryButton(busy || !pickBadge)}>Grant</button>
            </div>
          </div>

          {/* Earned badges with revoke */}
          <div style={{ marginBottom: '22px' }}>
            <SectionTitle>Earned badges ({earned.length})</SectionTitle>
            {earned.length === 0 ? <Muted>No badges yet.</Muted> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))', gap: '18px', marginTop: '14px', justifyItems: 'center' }}>
                {earned.map((b) => (
                  <div key={b.id} style={{ textAlign: 'center' }}>
                    <Badge badge={b} size={78} onClick={() => setDetail(b)} />
                    <button onClick={() => revoke(b.id)} disabled={busy} style={{ ...miniBtn(false), color: 'var(--crimson)', borderColor: 'rgba(139,26,46,0.4)', marginTop: '4px' }}>Revoke</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger / maintenance */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={recalc} disabled={busy} style={primaryButton(busy)}>Recalculate</button>
            <button onClick={reset} disabled={busy} style={dangerButton(busy)}>Reset progress</button>
          </div>

          {/* Recent activity for this user */}
          {data.timeline.length > 0 && (
            <div style={{ marginTop: '26px' }}>
              <SectionTitle>Recent unlocks</SectionTitle>
              <div style={{ marginTop: '10px' }}>
                {data.timeline.slice(0, 8).map((e) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa04))' }}>
                    <span style={{ color: 'rgba(var(--text-rgb),var(--ta60))' }}>{e.kind === 'tier' ? `Tier · ${e.tierId?.replace(/_/g, ' ')}` : `Badge · ${e.badgeId}`}</span>
                    <span style={{ color: 'rgba(var(--text-rgb),var(--ta35))' }}>{new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {detail && <BadgeDetail badge={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

// ── Catalogue browser ────────────────────────────────────────────────────────

function Catalogue() {
  const [catalog, setCatalog] = useState(null)
  const [detail, setDetail] = useState(null)
  const [q, setQ] = useState('')

  useEffect(() => { api.get('/api/admin/achievements/catalog').then((r) => setCatalog(r.data)).catch(() => setCatalog({ badges: [] })) }, [])

  const badges = useMemo(() => {
    if (!catalog) return []
    const list = catalog.badges.map((b) => ({ ...b, state: 'unlocked' })) // preview as unlocked
    if (!q.trim()) return list.sort((a, b) => rarityRank[a.rarity] - rarityRank[b.rarity])
    const s = q.toLowerCase()
    return list.filter((b) => b.name.toLowerCase().includes(s) || b.category.includes(s) || b.rarity.includes(s))
  }, [catalog, q])

  if (!catalog) return <ConnectingLoader fullScreen={false} message="Loading the catalogue" />

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta45))', marginBottom: '16px' }}>
        {catalog.badges.length} badges defined. New badges are added as configuration records in the codebase — this is a live preview of every definition.
      </p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search badges, categories, rarities…" style={{ ...inputStyle, marginBottom: '22px', maxWidth: '360px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))', gap: '20px', justifyItems: 'center' }}>
        {badges.map((b) => <Badge key={b.id} badge={b} onClick={() => setDetail(b)} />)}
      </div>
      {detail && <BadgeDetail badge={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

// ── Audit log ────────────────────────────────────────────────────────────────

function AuditLog() {
  const [rows, setRows] = useState(null)
  useEffect(() => { api.get('/api/admin/achievements/audit?limit=100').then((r) => setRows(r.data)).catch(() => setRows([])) }, [])
  if (!rows) return <ConnectingLoader fullScreen={false} message="Loading the audit trail" />
  if (rows.length === 0) return <Empty>No manual actions recorded yet.</Empty>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa04))', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--gold)', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '120px' }}>{r.action.replace(/_/g, ' ')}</span>
          <span style={{ fontSize: '13px', color: 'var(--parchment)' }}>
            {r.actorUsername ? `@${r.actorUsername}` : 'system'} → {r.targetUsername ? `@${r.targetUsername}` : '—'}
            {r.badgeId ? ` · ${r.badgeId}` : ''}{r.trackId ? ` · ${r.trackId}` : ''}
          </span>
          <span style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))', marginLeft: 'auto' }}>{new Date(r.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ── Shared bits (kept local to avoid clashing with AdminDashboard's helpers) ───

const panel = { background: 'rgba(var(--panel-rgb),var(--pa02))', border: '1px solid rgba(var(--panel-rgb),var(--pa08))', borderRadius: '8px' }
const inputStyle = { background: 'rgba(var(--panel-rgb),var(--pa04))', border: '1px solid rgba(var(--panel-rgb),var(--pa10))', borderRadius: '4px', padding: '8px 14px', color: 'var(--parchment)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }
const chip = (on) => ({ padding: '7px 14px', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', border: `1px solid ${on ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa12))'}`, background: on ? 'rgba(var(--gold-rgb),0.1)' : 'transparent', color: on ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta50))', cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit' })
const miniBtn = (on) => ({ padding: '5px 10px', fontSize: '11px', border: `1px solid ${on ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa12))'}`, background: on ? 'rgba(var(--gold-rgb),0.12)' : 'transparent', color: on ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta55))', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' })
const primaryButton = (disabled) => ({ padding: '8px 18px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', background: 'var(--gold-solid)', color: 'var(--on-gold)', borderRadius: '4px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'inherit' })
const dropdown = { position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid rgba(var(--gold-rgb),0.25)', borderRadius: '6px', boxShadow: '0 14px 34px rgba(10,10,20,0.4)', overflow: 'hidden', zIndex: 30 }
const matchRow = { display: 'flex', alignItems: 'center', gap: '11px', width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa04))', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.15s ease' }
const matchAvatar = { flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(var(--gold-rgb),0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'var(--gold)' }
const dangerButton = (disabled) => ({ padding: '8px 18px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(139,26,46,0.5)', background: 'rgba(139,26,46,0.15)', color: '#c45a6e', borderRadius: '4px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: 'inherit' })

function SectionTitle({ children }) { return <h3 className="font-story" style={{ fontSize: '16px', fontWeight: 400, color: 'var(--parchment)' }}>{children}</h3> }
function Muted({ children }) { return <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>{children}</p> }
function Empty({ children }) { return <div style={{ textAlign: 'center', padding: '48px 0' }}><p style={{ color: 'rgba(var(--text-rgb),var(--ta35))', fontSize: '15px' }}>{children}</p></div> }
