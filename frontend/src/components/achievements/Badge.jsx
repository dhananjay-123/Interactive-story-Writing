import { useState } from 'react'
import BadgeIcon from './BadgeIcon'
import { rarityOf, rarityRank, isRadiant } from './rarity'

// A single badge medallion: a gilt/gem disc, locked / in-progress / unlocked
// treatments, and — for a badge part-way earned — a short rule beneath it.
// Pure CSS: the gradient, bevel, glow and shimmer are layered background +
// box-shadow, and the only motion is a light hover lift plus a slow sheen on
// Legendary+.
//
// Progress is drawn as a rule rather than an arc around the disc. A ring is on
// the house list of AI-generic tells (CLAUDE.md), and the tier tracks further up
// the same page already read as horizontal bars, so this matches them.

export default function Badge({ badge, size = 92, onClick, showLabel = true, earnedDate = false }) {
  const [hover, setHover] = useState(false)
  const rarity = rarityOf(badge.rarity)
  const unlocked = badge.state === 'unlocked'
  const pct = badge.progress?.percent || 0
  const inProgress = !unlocked && pct > 0
  const darkIcon = badge.rarity === 'legendary'

  const iconColor = unlocked
    ? (darkIcon ? 'rgba(26,22,12,0.9)' : 'rgba(255,255,255,0.94)')
    : 'rgba(var(--text-rgb),var(--ta40))'

  const discGradient = unlocked
    ? `radial-gradient(circle at 34% 28%, ${rarity.hi}, ${rarity.lo} 78%)`
    : `radial-gradient(circle at 34% 28%, rgba(var(--panel-rgb),var(--pa10)), rgba(var(--panel-rgb),var(--pa04)) 80%)`

  const lift = hover ? 'translateY(-3px)' : 'translateY(0)'
  const glow = unlocked
    ? `0 6px 18px -6px ${rarity.glow}, inset 0 2px 5px rgba(255,255,255,0.28), inset 0 -4px 8px rgba(0,0,0,0.3)`
    : 'inset 0 1px 3px rgba(0,0,0,0.18)'

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`${badge.name} — ${rarity.label}${unlocked ? ', unlocked' : inProgress ? `, ${pct}% complete` : ', locked'}`}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        width: showLabel ? Math.max(size + 40, 128) : size,
      }}
    >
      <div style={{ position: 'relative', width: size, height: size, transition: 'transform 0.25s ease', transform: lift }}>
        {/* Medallion disc */}
        <div
          className={unlocked && isRadiant(badge.rarity) ? 'badge-radiant' : undefined}
          style={{
            position: 'absolute', inset: '4%', borderRadius: '50%',
            background: discGradient,
            border: `1px solid ${unlocked ? 'rgba(255,255,255,0.25)' : 'rgba(var(--panel-rgb),var(--pa12))'}`,
            boxShadow: glow,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: iconColor,
            filter: unlocked ? 'none' : 'saturate(0.5)',
            transition: 'box-shadow 0.25s ease',
            overflow: 'hidden',
          }}
        >
          <BadgeIcon shape={badge.icon?.shape || 'star'} size={size * 0.42} />
        </div>

        {/* Rarity gemstone marker */}
        <span
          title={rarity.label}
          style={{
            position: 'absolute', bottom: '2%', right: '2%', width: '14px', height: '14px', borderRadius: '4px',
            transform: 'rotate(45deg)',
            background: unlocked ? `linear-gradient(135deg, ${rarity.hi}, ${rarity.lo})` : 'rgba(var(--panel-rgb),var(--pa15))',
            border: '1.5px solid var(--ink)',
            boxShadow: unlocked ? `0 0 6px ${rarity.glow}` : 'none',
          }}
        />
      </div>

      {/* How far along, for a badge not yet earned. Always laid out, hidden when
          there is nothing to report, so every label in a row sits on one line. */}
      <div
        aria-hidden={!inProgress}
        style={{
          width: Math.round(size * 0.68),
          marginTop: '-4px',
          visibility: inProgress ? 'visible' : 'hidden',
        }}
      >
        <div style={{ height: '2px', background: 'rgba(var(--panel-rgb),var(--pa10))' }}>
          <div
            style={{
              width: `${Math.max(2, Math.min(100, pct))}%`,
              height: '100%',
              background: rarity.ring,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <p style={{
          fontSize: '9px', letterSpacing: '0.08em', marginTop: '4px', textAlign: 'center',
          color: 'rgba(var(--text-rgb),var(--ta45))',
        }}>{pct}%</p>
      </div>

      {showLabel && (
        <div style={{ textAlign: 'center', maxWidth: '128px' }}>
          <p className="font-story" style={{
            fontSize: '13px', lineHeight: 1.25, color: unlocked ? 'var(--parchment)' : 'rgba(var(--text-rgb),var(--ta50))',
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{badge.name}</p>
          <p style={{
            fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '3px',
            color: unlocked ? rarity.ring : 'rgba(var(--text-rgb),var(--ta30))',
          }}>
            {rarityRank[badge.rarity] >= 7 ? rarity.label.split(' ')[0] : rarity.label}
          </p>
          {earnedDate && unlocked && badge.unlockedAt && (
            <p style={{ fontSize: '10px', color: 'rgba(var(--text-rgb),var(--ta30))', marginTop: '2px' }}>
              {new Date(badge.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      )}
    </button>
  )
}
