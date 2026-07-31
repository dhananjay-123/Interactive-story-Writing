import { useEffect } from 'react'
import Badge from './Badge'
import { rarityOf } from './rarity'

// The expanded view of one badge: large medallion, rarity, description, unlock
// criteria, live progress and the earned date. Reuses the same medallion the wall
// shows, so the look is identical. Rendered as a light modal matching the app's
// existing overlay pattern (see Profile's FollowList).

export default function BadgeDetail({ badge, onClose, pinControl }) {
  // Escape closes it. Clicking the backdrop already did, but that is no use to
  // anyone reading with a keyboard.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!badge) return null
  const rarity = rarityOf(badge.rarity)
  const unlocked = badge.state === 'unlocked'
  const p = badge.progress

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 60, animation: 'fadeIn 0.2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${badge.name} — ${rarity.label}`}
        className="animate-fadeUp"
        style={{ width: '100%', maxWidth: '380px', background: 'var(--ink-soft)', border: `1px solid ${unlocked ? rarity.ring : 'rgba(var(--panel-rgb),var(--pa15))'}`, borderRadius: '8px', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 12px 0' }}>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'rgba(var(--text-rgb),var(--ta45))', fontSize: '22px', lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        <div style={{ padding: '4px 28px 30px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
            <Badge badge={badge} size={112} showLabel={false} />
          </div>

          <p style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: unlocked ? rarity.ring : 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '8px' }}>
            {rarity.label}
          </p>
          <h3 className="font-story" style={{ fontSize: '24px', fontWeight: 400, color: 'var(--parchment)', marginBottom: '12px', lineHeight: 1.2 }}>
            {badge.name}
          </h3>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'rgba(var(--text-rgb),var(--ta65))', marginBottom: '18px' }}>
            {badge.description}
          </p>

          {/* Unlock criteria */}
          {badge.hint && (
            <div style={{ padding: '12px 16px', background: 'rgba(var(--panel-rgb),var(--pa04))', borderRadius: '4px', border: '1px solid rgba(var(--panel-rgb),var(--pa08))', marginBottom: p && !unlocked ? '14px' : 0 }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '5px' }}>How to earn</p>
              <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta70))' }}>{badge.hint}</p>
            </div>
          )}

          {/* Live progress */}
          {p && !unlocked && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta50))', marginBottom: '6px' }}>
                <span>{p.current} / {p.target}</span>
                <span>{p.percent}%</span>
              </div>
              <div style={{ height: '5px', borderRadius: '4px', background: 'rgba(var(--panel-rgb),var(--pa10))', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p.percent}%`, background: rarity.ring, borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )}

          {/* Earned date */}
          {unlocked && badge.unlockedAt && (
            <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '4px' }}>
              Earned {new Date(badge.unlockedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              {badge.source === 'manual' ? ' · awarded by an admin' : ''}
            </p>
          )}

          {/* Owner-only: pin to the profile showcase */}
          {unlocked && pinControl && (
            <button
              onClick={pinControl.onToggle}
              disabled={pinControl.busy}
              style={{
                marginTop: '18px', padding: '9px 20px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
                background: pinControl.pinned ? 'transparent' : 'var(--gold)',
                color: pinControl.pinned ? 'rgba(var(--text-rgb),var(--ta60))' : 'var(--on-gold)',
                border: `1px solid ${pinControl.pinned ? 'rgba(var(--panel-rgb),var(--pa15))' : 'var(--gold)'}`,
                opacity: pinControl.busy ? 0.6 : 1,
              }}
            >
              {pinControl.pinned ? 'Unpin from showcase' : 'Pin to showcase'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
