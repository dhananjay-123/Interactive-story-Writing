import { useEffect, useState } from 'react'
import api from '../api/client'

const pct = (n) => `${Math.round(n * 100)}%`

// What readers actually did at each fork. Author-only; the API refuses anyone else.
export default function ReaderPaths({ storyId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/api/stories/${storyId}/analytics`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.message || 'Could not load reader paths.'))
  }, [storyId])

  if (error) return <p style={muted}>{error}</p>
  if (!data) return <p style={muted}>Reading the tea leaves…</p>

  const { totals, passages, endings } = data
  const withTraffic = passages.filter((p) => p.totalTaken > 0)

  if (totals.choices === 0) {
    return (
      <p style={muted}>
        No one has made a choice here yet. Once readers start branching, you'll see which
        way they went.
      </p>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <Stat label="Choices made" value={totals.choices} />
        <Stat label="Signed-in readers" value={totals.readers} />
        <Stat label="Endings reached" value={totals.endingsReached} />
        {totals.anonymousChoices > 0 && (
          <Stat label="By anonymous readers" value={totals.anonymousChoices} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {withTraffic.map((p) => (
          <div key={p.nodeId}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {p.isRoot && (
                <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)' }}>
                  Opening
                </span>
              )}
              <p className="font-story" style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta55))', fontStyle: 'italic' }}>
                {p.snippet}…
              </p>
              <span style={{ fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta35))', marginLeft: 'auto' }}>
                {p.totalTaken} {p.totalTaken === 1 ? 'reader' : 'readers'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {p.choices.map((c) => {
                // The most-walked branch at this fork earns the gold.
                const top = c.count > 0 && c.count === Math.max(...p.choices.map((x) => x.count))
                return (
                  <div key={c.index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ flex: '1 1 auto', fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta65))', minWidth: 0 }}>
                      {c.text}
                      {!c.nextNodeId && (
                        <span style={{ color: 'rgba(var(--text-rgb),var(--ta30))', fontSize: '11px' }}> — unwritten</span>
                      )}
                    </span>
                    <div style={{ flex: '0 0 180px', height: '6px', background: 'rgba(var(--panel-rgb),var(--pa06))', borderRadius: '1px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: pct(c.share),
                          height: '100%',
                          background: top ? 'var(--gold)' : 'rgba(var(--gold-rgb),0.32)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <span style={{ flex: '0 0 68px', textAlign: 'right', fontSize: '12px', color: top ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta40))' }}>
                      {pct(c.share)} · {c.count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {endings.length > 0 && (
        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid rgba(var(--panel-rgb),var(--pa08))' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta35))', marginBottom: '12px' }}>
            Endings readers reach
          </p>
          {endings.map((e) => (
            <div key={e.nodeId} style={{ display: 'flex', gap: '12px', alignItems: 'baseline', marginBottom: '8px' }}>
              <span className="font-story" style={{ flex: 1, fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta60))', fontStyle: 'italic', minWidth: 0 }}>
                {(e.text || '').replace(/\s+/g, ' ').slice(0, 90)}…
              </span>
              <span style={{ fontSize: '12px', color: 'var(--gold)' }}>{e.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="font-story" style={{ fontSize: '26px', color: 'var(--parchment)', lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '4px' }}>
        {label}
      </p>
    </div>
  )
}

const muted = { fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))', lineHeight: 1.6 }
