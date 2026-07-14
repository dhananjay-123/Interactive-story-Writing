import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ConnectingLoader from '../components/ConnectingLoader'
import Badge from '../components/achievements/Badge'
import BadgeDetail from '../components/achievements/BadgeDetail'
import TierTrack from '../components/achievements/TierTrack'
import { rarityOf, rarityRank } from '../components/achievements/rarity'

const CATEGORY_LABELS = {
  publishing: 'Publishing', writing_quality: 'Writing Quality', story_design: 'Story Design',
  community: 'Community', popularity: 'Popularity', retention: 'Retention',
  reading: 'Reading', exploration: 'Exploration', engagement: 'Engagement',
  challenges: 'Challenges', genres: 'Genres', seasonal: 'Seasonal', special_events: 'Special Events',
  platform_events: 'Platform Events', founder: 'Founder', premium: 'Premium', hidden: 'Hidden',
  administrative: 'Administrative',
}

export default function Achievements() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeline, setTimeline] = useState(null)
  const [detail, setDetail] = useState(null)
  const [filter, setFilter] = useState('all') // all | earned | progress | rarity id
  const [showcaseIds, setShowcaseIds] = useState([])
  const [pinBusy, setPinBusy] = useState(false)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    api.get('/api/achievements/me').then((r) => {
      setData(r.data)
      setShowcaseIds((r.data.showcase || []).map((b) => b.id))
    }).catch(() => setData(null)).finally(() => setLoading(false))
    // Timeline lazy-loads alongside — a separate, paginated section.
    api.get('/api/achievements/me/timeline?limit=15').then((r) => setTimeline(r.data)).catch(() => setTimeline([]))
  }, [user])

  const MAX_SHOWCASE = 8
  const togglePin = async (badgeId) => {
    const pinned = showcaseIds.includes(badgeId)
    const next = pinned ? showcaseIds.filter((id) => id !== badgeId) : [...showcaseIds, badgeId].slice(0, MAX_SHOWCASE)
    setPinBusy(true)
    try {
      await api.put('/api/achievements/me/showcase', { badgeIds: next })
      setShowcaseIds(next)
      // Reflect the new showcase without a full reload.
      setData((d) => {
        if (!d) return d
        const badges = d.badges.map((b) => ({ ...b, featured: next.includes(b.id) }))
        const showcase = next.map((id) => badges.find((b) => b.id === id)).filter(Boolean)
        return { ...d, badges, showcase }
      })
    } catch { /* leave as-is on failure */ } finally { setPinBusy(false) }
  }

  const grouped = useMemo(() => {
    if (!data) return []
    let badges = data.badges
    if (filter === 'earned') badges = badges.filter((b) => b.state === 'unlocked')
    else if (filter === 'progress') badges = badges.filter((b) => b.state === 'progress')
    else if (filter !== 'all') badges = badges.filter((b) => b.rarity === filter)

    const byCat = new Map()
    for (const b of badges) {
      if (!byCat.has(b.category)) byCat.set(b.category, [])
      byCat.get(b.category).push(b)
    }
    // Earned first, then by rarity, within each category.
    for (const list of byCat.values()) {
      list.sort((a, b) => (b.state === 'unlocked') - (a.state === 'unlocked') || rarityRank[b.rarity] - rarityRank[a.rarity])
    }
    return [...byCat.entries()]
  }, [data, filter])

  if (loading) return <ConnectingLoader message="Opening your achievements" />

  if (!user) {
    return (
      <Centered>
        <p className="font-story" style={{ fontSize: '22px', color: 'rgba(var(--text-rgb),var(--ta60))', fontStyle: 'italic', marginBottom: '20px' }}>
          Sign in to track your achievements.
        </p>
        <Link to="/login" style={goldLink}>Sign in →</Link>
      </Centered>
    )
  }

  if (!data) {
    return <Centered><p style={{ color: 'rgba(var(--text-rgb),var(--ta50))' }}>Could not load your achievements.</p></Centered>
  }

  const { tiers, stats, summary, showcase } = data

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 90px' }}>
        {/* Header */}
        <div className="animate-fadeUp" style={{ marginBottom: '36px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '10px', opacity: 0.7 }}>Your journey</p>
          <h1 className="font-story" style={{ fontSize: 'clamp(30px, 4.5vw, 46px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>Achievements</h1>
        </div>

        {/* Tiers */}
        <div className="animate-fadeUp delay-100" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
          {tiers.map((t) => <TierTrack key={t.trackId} tier={t} />)}
        </div>

        {/* Summary */}
        <div className="animate-fadeUp delay-200" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '40px' }}>
          <Stat label="Badges earned" value={`${summary.unlocked} / ${summary.total}`} />
          <Stat label="Completion" value={`${summary.completion}%`} />
          <Stat label="Rare or better" value={rareCount(summary.byRarity)} />
          <Stat label="Hidden found" value={summary.hiddenFound} />
        </div>

        {/* Showcase */}
        {showcase && showcase.length > 0 && (
          <Section title="Showcase" subtitle="Your pinned badges">
            <Wall badges={showcase} onSelect={setDetail} />
          </Section>
        )}

        {/* Filter bar */}
        <div className="animate-fadeUp" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '10px 0 26px' }}>
          {['all', 'earned', 'progress', 'legendary', 'epic', 'rare', 'mythic'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>
              {f === 'all' ? 'All' : f === 'earned' ? 'Earned' : f === 'progress' ? 'In progress' : rarityOf(f).label}
            </button>
          ))}
        </div>

        {/* Badge wall by category */}
        {grouped.length === 0 ? (
          <p style={{ color: 'rgba(var(--text-rgb),var(--ta45))', padding: '30px 0' }}>Nothing here yet — keep reading and writing.</p>
        ) : (
          grouped.map(([cat, badges]) => (
            <Section key={cat} title={CATEGORY_LABELS[cat] || cat} subtitle={`${badges.filter((b) => b.state === 'unlocked').length}/${badges.length} earned`}>
              <Wall badges={badges} onSelect={setDetail} />
            </Section>
          ))
        )}

        {/* Timeline */}
        {timeline && timeline.length > 0 && (
          <Section title="Recent unlocks" subtitle="Your latest milestones">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {timeline.map((e) => <TimelineRow key={e.id} entry={e} />)}
            </div>
          </Section>
        )}

        {/* Statistics */}
        <Section title="Statistics" subtitle="Everything you've done here">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <StatCard title="As an author" rows={[
              ['Stories published', stats.author.storiesPublished], ['Branches authored', stats.author.branches],
              ['Passages written', stats.author.passages], ['Endings crafted', stats.author.endings],
              ['Likes received', stats.author.likesReceived], ['Followers', stats.author.followers],
            ]} />
            <StatCard title="As a reader" rows={[
              ['Stories completed', stats.reader.storiesCompleted], ['Stories started', stats.reader.storiesStarted],
              ['Choices made', stats.reader.choices], ['Genres explored', stats.reader.genresRead],
              ['Current streak', `${stats.reader.streak} day${stats.reader.streak === 1 ? '' : 's'}`], ['Longest streak', `${stats.reader.longestStreak} days`],
            ]} />
          </div>
        </Section>
      </div>

      {detail && (
        <BadgeDetail
          badge={detail}
          onClose={() => setDetail(null)}
          pinControl={detail.state === 'unlocked' ? {
            pinned: showcaseIds.includes(detail.id),
            busy: pinBusy,
            onToggle: () => togglePin(detail.id),
          } : undefined}
        />
      )}
    </div>
  )
}

function Wall({ badges, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))', gap: '20px', justifyItems: 'center' }}>
      {badges.map((b) => <Badge key={b.id} badge={b} onClick={() => onSelect(b)} earnedDate />)}
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div className="animate-fadeUp" style={{ marginBottom: '48px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '22px' }}>
        <h2 className="font-story" style={{ fontSize: '21px', fontWeight: 400, color: 'var(--parchment)' }}>{title}</h2>
        {subtitle && <span style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ padding: '18px', background: 'rgba(var(--panel-rgb),var(--pa03))', border: '1px solid rgba(var(--panel-rgb),var(--pa08))', borderRadius: '6px' }}>
      <p className="font-story" style={{ fontSize: '26px', color: 'var(--gold)', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '8px' }}>{label}</p>
    </div>
  )
}

function StatCard({ title, rows }) {
  return (
    <div style={{ padding: '22px', background: 'rgba(var(--panel-rgb),var(--pa03))', border: '1px solid rgba(var(--panel-rgb),var(--pa08))', borderRadius: '6px' }}>
      <p style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '14px', opacity: 0.8 }}>{title}</p>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa04))' }}>
          <span style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta55))' }}>{k}</span>
          <span className="font-story" style={{ fontSize: '15px', color: 'var(--parchment)' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

function TimelineRow({ entry }) {
  const isTier = entry.kind === 'tier'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa04))' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTier ? 'var(--gold)' : 'rgba(var(--gold-rgb),0.5)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '14px', color: 'var(--parchment)' }}>
          {isTier ? 'Reached a new tier' : 'Unlocked a badge'}
          {entry.storyTitle && <span style={{ color: 'rgba(var(--text-rgb),var(--ta45))' }}> · {entry.storyTitle}</span>}
        </span>
      </div>
      <span style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))', whiteSpace: 'nowrap' }}>
        {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    </div>
  )
}

function Centered({ children }) {
  return <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>{children}</div>
}

const rareCount = (byRarity) => ['rare', 'epic', 'legendary', 'mythic', 'administrator'].reduce((s, r) => s + (byRarity[r] || 0), 0)

const chip = (active) => ({
  padding: '7px 14px', borderRadius: '3px', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: 'inherit',
  background: active ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa04))',
  color: active ? 'var(--on-gold)' : 'rgba(var(--text-rgb),var(--ta55))',
  border: `1px solid ${active ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa10))'}`,
})

const goldLink = { color: 'var(--gold)', textDecoration: 'none', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }
