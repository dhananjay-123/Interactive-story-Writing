import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import Badge from './Badge'
import BadgeDetail from './BadgeDetail'
import TierTrack from './TierTrack'
import { rarityRank } from './rarity'

// The achievements block on an author profile: their two tier ladders and a wall
// of earned badges (pinned showcase first, then rarest). Read-only and public —
// works for any profile. Pinning/management lives on the owner's /achievements
// page. Renders nothing until data loads so it never flashes an empty shell.

export default function ProfileAchievements({ username, isOwn }) {
  const [data, setData] = useState(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    setData(null)
    api.get(`/api/achievements/user/${username}`).then((r) => setData(r.data)).catch(() => setData(null))
  }, [username])

  if (!data) return null

  const { tiers, badges, showcase, summary } = data
  const showcaseIds = new Set((showcase || []).map((b) => b.id))
  // Showcase first, then the rest by rarity — capped so the profile stays tidy.
  const rest = badges.filter((b) => !showcaseIds.has(b.id)).sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity])
  const wall = [...(showcase || []), ...rest].slice(0, 12)

  const hasAnything = wall.length > 0 || tiers.some((t) => t.current.level > 0)
  if (!hasAnything && !isOwn) return null

  return (
    <div style={{ marginTop: '64px' }}>
      <div className="animate-fadeUp" style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '24px' }}>
        <h2 className="font-story" style={{ fontSize: '20px', fontWeight: 400, color: 'var(--parchment)' }}>Achievements</h2>
        <span style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta30))' }}>{summary.unlocked} earned</span>
        <Link to="/achievements" style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--gold)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase', display: isOwn ? 'inline' : 'none' }}>
          View all →
        </Link>
      </div>

      <div className="animate-fadeUp" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: wall.length ? '30px' : 0 }}>
        {tiers.map((t) => <TierTrack key={t.trackId} tier={t} />)}
      </div>

      {wall.length > 0 && (
        <div className="animate-fadeUp" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: '18px', justifyItems: 'center' }}>
          {wall.map((b) => <Badge key={b.id} badge={b} size={78} onClick={() => setDetail(b)} />)}
        </div>
      )}

      {isOwn && wall.length === 0 && (
        <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta45))' }}>
          No badges yet — <Link to="/achievements" style={{ color: 'var(--gold)', textDecoration: 'none' }}>see what you can earn →</Link>
        </p>
      )}

      {detail && <BadgeDetail badge={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
