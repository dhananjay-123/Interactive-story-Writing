import BadgeIcon from './BadgeIcon'

// One progression ladder (Author or Reader): the current tier, an emblem, and a
// bar showing progress toward the next rung. Styled to sit inside the existing
// panelled surfaces — gold accent, serif tier names, flat bar.

const METRIC_LABEL = {
  stories_published: 'stories published',
  stories_completed: 'stories completed',
}

export default function TierTrack({ tier, compact = false }) {
  if (!tier) return null
  const { label, current, next, value, toNext, percent, metric } = tier

  return (
    <div style={{ padding: compact ? 0 : '20px', background: compact ? 'none' : 'rgba(var(--panel-rgb),var(--pa03))', border: compact ? 'none' : '1px solid rgba(var(--panel-rgb),var(--pa08))', borderRadius: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '52px', height: '52px', flexShrink: 0, borderRadius: '50%',
          background: 'radial-gradient(circle at 34% 28%, rgba(var(--gold-rgb),0.9), rgba(var(--gold-rgb),0.45) 80%)',
          border: '1px solid rgba(var(--gold-rgb),0.5)',
          boxShadow: '0 4px 12px -6px rgba(var(--gold-rgb),0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-gold)',
        }}>
          <BadgeIcon shape={current.icon} size={26} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '2px' }}>{label} tier</p>
          <p className="font-story" style={{ fontSize: '19px', color: 'var(--parchment)', lineHeight: 1.15 }}>{current.label}</p>
        </div>
      </div>

      {next ? (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta45))', marginBottom: '6px' }}>
            <span>{value} {METRIC_LABEL[metric] || ''}</span>
            <span>{toNext} to {next.label}</span>
          </div>
          <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(var(--panel-rgb),var(--pa10))', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${percent}%`, background: 'var(--gold)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      ) : (
        <p style={{ marginTop: '14px', fontSize: '12px', color: 'var(--gold)', letterSpacing: '0.06em' }}>
          Highest tier reached.
        </p>
      )}
    </div>
  )
}
