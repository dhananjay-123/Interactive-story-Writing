// The validator panel: a human-readable health report derived from analyzeStory.
// Clicking an issue selects its passage so it lights up in the graph.

const LEVELS = {
  error: { color: '#c45a6e', ring: 'rgba(139,26,46,0.45)', label: 'Error' },
  warning: { color: '#d2a63f', ring: 'rgba(201,168,76,0.4)', label: 'Warning' },
  info: { color: 'rgba(var(--text-rgb),var(--ta55))', ring: 'rgba(var(--panel-rgb),var(--pa18))', label: 'Note' },
}

export default function StoryValidator({ analysis, onSelect, selectedId }) {
  const { issues, stats } = analysis
  const clean = issues.length === 0

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <Pill tone={stats.errors ? 'error' : 'ok'} n={stats.errors} label={stats.errors === 1 ? 'error' : 'errors'} />
        <Pill tone={stats.warnings ? 'warning' : 'ok'} n={stats.warnings} label={stats.warnings === 1 ? 'warning' : 'warnings'} />
        <Pill tone="muted" n={stats.reachableEndings} label={stats.reachableEndings === 1 ? 'reachable ending' : 'reachable endings'} />
      </div>

      {clean ? (
        <div
          className="animate-fadeUp"
          style={{
            padding: '28px 22px',
            textAlign: 'center',
            border: '1px solid rgba(var(--gold-rgb),0.3)',
            borderRadius: 'var(--r-md)',
            background: 'rgba(var(--gold-rgb),0.05)',
          }}
        >
          <div style={{ fontSize: '26px', color: 'var(--gold)', marginBottom: '8px' }}>✓</div>
          <p className="font-story" style={{ fontSize: '18px', color: 'var(--parchment)', marginBottom: '6px' }}>
            The story checks out
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta50))', lineHeight: 1.6 }}>
            Every passage is reachable, no dead ends, and at least one path reaches an ending.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {issues.map((issue, i) => {
            const lv = LEVELS[issue.level]
            const active = issue.nodeId === selectedId
            return (
              <li key={i}>
                <button
                  onClick={() => onSelect?.(issue.nodeId)}
                  className="ct-issue"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    padding: '12px 14px',
                    borderRadius: 'var(--r-md)',
                    border: `1px solid ${active ? 'var(--gold)' : lv.ring}`,
                    background: active ? 'rgba(var(--gold-rgb),0.06)' : 'rgba(var(--panel-rgb),var(--pa03))',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: lv.color, marginTop: '5px', flexShrink: 0 }} />
                  <span>
                    <span style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '14px', color: 'var(--parchment)' }}>{issue.title}</span>
                      <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: lv.color }}>
                        {lv.label}
                      </span>
                    </span>
                    <span style={{ display: 'block', fontSize: '12.5px', color: 'rgba(var(--text-rgb),var(--ta55))', lineHeight: 1.55, marginTop: '3px' }}>
                      {issue.detail}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Pill({ tone, n, label }) {
  const tones = {
    error: { color: '#c45a6e', border: 'rgba(139,26,46,0.45)' },
    warning: { color: '#d2a63f', border: 'rgba(201,168,76,0.4)' },
    ok: { color: 'var(--gold)', border: 'rgba(var(--gold-rgb),0.3)' },
    muted: { color: 'rgba(var(--text-rgb),var(--ta60))', border: 'rgba(var(--panel-rgb),var(--pa15))' },
  }
  const t = tones[tone] || tones.muted
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: 'var(--r-sm)',
        border: `1px solid ${t.border}`,
      }}
    >
      <span className="font-story" style={{ fontSize: '17px', color: t.color }}>{n}</span>
      <span style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta45))' }}>{label}</span>
    </span>
  )
}
