import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Badge from './Badge'
import BadgeIcon from './BadgeIcon'
import { rarityOf, rarityRank } from './rarity'

// Surfaces achievement unlocks to the signed-in user without polling: it refreshes
// the notification tray on mount, whenever the route changes (a natural, user-
// driven beat), and on demand via refresh() — which pages call after a moment
// that could have earned something (e.g. finishing a story). The most impressive
// new badge gets a celebratory modal with light confetti; the rest slide in as
// toasts, and everything is marked read server-side so it never repeats.

const Ctx = createContext({ refresh: () => {} })
export const useAchievements = () => useContext(Ctx)

const CONFETTI_COLORS = ['#c9a84c', '#8a5ba8', '#4a72a8', '#5b8c6e', '#c56a4a']

export function AchievementsProvider({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const [catalog, setCatalog] = useState(null)
  const [toasts, setToasts] = useState([])
  const [modal, setModal] = useState(null)
  const seenLocally = useRef(new Set())
  const pinged = useRef(false)

  // Catalogue (badge + tier metadata) once, to describe notifications.
  useEffect(() => {
    if (!user || catalog) return
    api.get('/api/achievements/catalog').then((r) => {
      const badges = new Map(r.data.badges.map((b) => [b.id, b]))
      const tiers = new Map()
      for (const t of r.data.tracks) for (const tier of t.tiers) tiers.set(`${t.id}:${tier.id}`, { ...tier, track: t.label })
      setCatalog({ badges, tiers })
    }).catch(() => {})
  }, [user, catalog])

  const describe = useCallback((notif) => {
    if (!catalog) return null
    if (notif.kind === 'badge') {
      const b = catalog.badges.get(notif.badgeId)
      if (!b) return null
      return { kind: 'badge', name: b.name, description: b.description, rarity: b.rarity, icon: b.icon, state: 'unlocked' }
    }
    const tier = catalog.tiers.get(`${notif.trackId}:${notif.tierId}`)
    if (!tier) return null
    return { kind: 'tier', name: tier.label, description: `New ${tier.track} tier reached.`, icon: { shape: tier.icon }, rarity: 'legendary' }
  }, [catalog])

  const refresh = useCallback(async () => {
    if (!user || !catalog) return
    let data
    try { data = (await api.get('/api/achievements/me/notifications')).data } catch { return }
    const fresh = (data.items || []).filter((n) => !n.seen && !seenLocally.current.has(n.id))
    if (!fresh.length) return
    fresh.forEach((n) => seenLocally.current.add(n.id))

    const described = fresh.map((n) => ({ notif: n, view: describe(n) })).filter((x) => x.view)
    if (!described.length) return

    // The single most impressive new item headlines a modal; the rest are toasts.
    described.sort((a, b) => rarityRank[b.view.rarity] - rarityRank[a.view.rarity])
    const [headline, ...rest] = described
    setModal(headline.view)
    if (rest.length) {
      setToasts((t) => [...t, ...rest.map((r, i) => ({ id: r.notif.id + i, view: r.view }))])
    }

    // Mark them read so they don't resurface.
    api.post('/api/achievements/me/notifications/seen', { ids: fresh.map((n) => n.id) }).catch(() => {})
  }, [user, catalog, describe])

  // Daily heartbeat (keeps streaks alive) + first check once the catalogue is in.
  useEffect(() => {
    if (!user || !catalog || pinged.current) return
    pinged.current = true
    api.post('/api/achievements/me/active').catch(() => {}).finally(refresh)
  }, [user, catalog, refresh])

  // Re-check on navigation — surfaces unlocks earned since the last page.
  useEffect(() => {
    if (user && catalog) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Reset per-session state on sign-out.
  useEffect(() => {
    if (!user) { pinged.current = false; seenLocally.current = new Set(); setToasts([]); setModal(null) }
  }, [user])

  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id))

  return (
    <Ctx.Provider value={{ refresh }}>
      {children}
      {modal && <UnlockModal view={modal} onClose={() => setModal(null)} />}
      <div style={{ position: 'fixed', right: '20px', bottom: '20px', zIndex: 70, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '320px' }}>
        {toasts.map((t) => <UnlockToast key={t.id} view={t.view} onDone={() => dismissToast(t.id)} />)}
      </div>
    </Ctx.Provider>
  )
}

function UnlockModal({ view, onClose }) {
  const rarity = rarityOf(view.rarity)
  const isTier = view.kind === 'tier'
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 80, animation: 'fadeIn 0.25s ease both' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: '360px', background: 'var(--ink-soft)', border: `1px solid ${rarity.ring}`, borderRadius: '10px', padding: '34px 28px 28px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Lightweight confetti */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="confetti-piece" style={{
              left: `${8 + i * 6.4}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${(i % 5) * 0.08}s`,
            }} />
          ))}
        </div>

        <p style={{ position: 'relative', fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: rarity.ring, marginBottom: '18px' }}>
          {isTier ? 'Tier reached' : 'Achievement unlocked'}
        </p>
        <div className="animate-unlockPop" style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px', position: 'relative' }}>
          <Badge badge={view} size={118} showLabel={false} />
        </div>
        <h3 className="font-story" style={{ position: 'relative', fontSize: '25px', fontWeight: 400, color: 'var(--parchment)', marginBottom: '10px' }}>{view.name}</h3>
        <p style={{ position: 'relative', fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta65))', lineHeight: 1.6, marginBottom: '22px' }}>{view.description}</p>
        <div style={{ position: 'relative', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Link to="/achievements" onClick={onClose} style={btn(true)}>View all</Link>
          <button onClick={onClose} style={btn(false)}>Nice</button>
        </div>
      </div>
    </div>
  )
}

function UnlockToast({ view, onDone }) {
  const [leaving, setLeaving] = useState(false)
  const rarity = rarityOf(view.rarity)
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 4600)
    return () => clearTimeout(t)
  }, [])
  return (
    <div
      className={leaving ? 'achv-toast-out' : 'achv-toast-in'}
      onAnimationEnd={() => leaving && onDone()}
      onClick={() => setLeaving(true)}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--ink-soft)', border: `1px solid ${rarity.ring}`, borderRadius: '8px', boxShadow: '0 8px 24px -10px rgba(0,0,0,0.5)', cursor: 'pointer' }}
    >
      <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', background: `radial-gradient(circle at 34% 28%, ${rarity.hi}, ${rarity.lo} 80%)`, border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: view.rarity === 'legendary' ? 'rgba(26,22,12,0.9)' : 'rgba(255,255,255,0.94)' }}>
        <BadgeIcon shape={view.icon?.shape} size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: rarity.ring }}>{view.kind === 'tier' ? 'Tier reached' : 'Unlocked'}</p>
        <p className="font-story" style={{ fontSize: '15px', color: 'var(--parchment)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{view.name}</p>
      </div>
    </div>
  )
}

const btn = (primary) => ({
  padding: '9px 20px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
  background: primary ? 'var(--gold)' : 'transparent',
  color: primary ? 'var(--on-gold)' : 'rgba(var(--text-rgb),var(--ta60))',
  border: primary ? '1px solid var(--gold)' : '1px solid rgba(var(--panel-rgb),var(--pa15))',
})
