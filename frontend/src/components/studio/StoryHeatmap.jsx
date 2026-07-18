// The heatmap panel. Reads the existing /api/stories/:id/analytics payload and
// reports it beside the graph, which it tints by traffic. Bars are plain divs —
// no chart library, same as the rest of the app.

export default function StoryHeatmap({ data, error, loading, analysis, selectedId }) {
  if (loading) return <p style={muted}>Reading the traffic…</p>
  if (error === 'forbidden') {
    return (
      <div style={{ lineHeight: 1.7 }}>
        <p className="font-story" style={{ fontSize: '17px', color: 'var(--parchment)', marginBottom: '8px' }}>
          Author's eyes only
        </p>
        <p style={muted}>Reader analytics belong to the story's owner. Co-authors can write the tree, but not read the numbers.</p>
      </div>
    )
  }
  if (error) return <p style={{ ...muted, color: 'var(--crimson)' }}>Could not load analytics.</p>
  if (!data) return null

  const { totals, passages, endings } = data
  const busiest = passages.filter((p) => p.totalTaken > 0).slice(0, 5)
  const selected = selectedId && passages.find((p) => p.nodeId === selectedId)
  const maxEnding = Math.max(1, ...endings.map((e) => e.count))

  if (totals.choices === 0) {
    return (
      <div style={{ lineHeight: 1.7 }}>
        <p className="font-story" style={{ fontSize: '17px', color: 'var(--parchment)', marginBottom: '8px' }}>
          No one has walked it yet
        </p>
        <p style={muted}>
          Once readers start choosing, their paths light up here and the graph warms where traffic is heaviest.
          Your own reading isn't counted.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 10px' }}>
          <Metric n={totals.readers} label="signed-in readers" />
          <Metric n={totals.choices} label="choices taken" />
          <Metric n={totals.endingsReached} label="endings reached" />
          <Metric n={totals.anonymousChoices} label="anonymous choices" />
        </div>
        <p style={{ ...muted, marginTop: '10px', fontSize: '11.5px' }}>
          Anonymous readers can't be told apart, so they're counted separately rather than as readers.
        </p>
      </div>

      {/* Heat legend for the graph beside it. */}
      <div>
        <Label>Heat scale</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ ...muted, fontSize: '11px' }}>cold</span>
          <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, var(--surface), var(--gold-solid))', border: '1px solid rgba(var(--panel-rgb),var(--pa12))' }} />
          <span style={{ ...muted, fontSize: '11px' }}>busy</span>
        </div>
        <p style={{ ...muted, marginTop: '7px', fontSize: '11.5px' }}>
          Passages warm with arrivals; edges thicken with the traffic down that branch.
        </p>
      </div>

      {/* The passage the author clicked — its exact split. */}
      {selected && selected.choices.length > 0 && (
        <div className="animate-fadeIn">
          <Label>This fork</Label>
          <p className="font-story" style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta65))', lineHeight: 1.6, marginBottom: '12px' }}>
            {selected.snippet || '(no text)'}
          </p>
          {selected.totalTaken === 0 ? (
            <p style={muted}>Nobody has reached this fork yet.</p>
          ) : (
            <Split choices={selected.choices} />
          )}
        </div>
      )}

      {busiest.length > 0 && (
        <div>
          <Label>Busiest forks</Label>
          <ul style={list}>
            {busiest.map((p) => (
              <li key={p.nodeId} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', fontSize: '13px' }}>
                <span className="font-story" style={{ color: 'var(--gold)', minWidth: '28px', fontVariantNumeric: 'tabular-nums' }}>{p.totalTaken}</span>
                <span style={{ flex: 1, color: 'rgba(var(--text-rgb),var(--ta65))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.isRoot ? 'Opening — ' : ''}{p.snippet}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {endings.length > 0 && (
        <div>
          <Label>Endings readers land on</Label>
          <ul style={{ ...list, gap: '10px' }}>
            {endings.slice(0, 6).map((e) => (
              <li key={e.nodeId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12.5px', marginBottom: '4px' }}>
                  <span className="font-story" style={{ color: 'rgba(var(--text-rgb),var(--ta70))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(e.text || '').replace(/\s+/g, ' ').slice(0, 46) || '(no text)'}
                  </span>
                  <span style={{ color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>{e.count}</span>
                </div>
                <Bar pct={(e.count / maxEnding) * 100} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Split({ choices }) {
  return (
    <ul style={{ ...list, gap: '10px' }}>
      {choices.map((c) => (
        <li key={c.index}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12.5px', marginBottom: '4px' }}>
            <span style={{ color: 'rgba(var(--text-rgb),var(--ta70))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span className="font-story" style={{ color: 'var(--gold)', opacity: 0.8, marginRight: '6px' }}>
                {String.fromCharCode(65 + c.index)}.
              </span>
              {c.text}
            </span>
            <span style={{ color: 'rgba(var(--text-rgb),var(--ta55))', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {Math.round(c.share * 100)}% · {c.count}
            </span>
          </div>
          <Bar pct={c.share * 100} />
        </li>
      ))}
    </ul>
  )
}

function Bar({ pct }) {
  return (
    <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(var(--panel-rgb),var(--pa08))', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(2, pct)}%`, height: '100%', background: 'var(--gold-solid)', opacity: 0.85, transition: 'width 0.3s ease' }} />
    </div>
  )
}

function Metric({ n, label }) {
  return (
    <div>
      <div className="font-story" style={{ fontSize: '22px', color: 'var(--parchment)', lineHeight: 1.1 }}>{n}</div>
      <div style={{ fontSize: '10.5px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta45))', marginTop: '3px' }}>{label}</div>
    </div>
  )
}

const Label = ({ children }) => (
  <p style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.7, marginBottom: '10px' }}>{children}</p>
)

const muted = { fontSize: '12.5px', color: 'rgba(var(--text-rgb),var(--ta50))', lineHeight: 1.6 }
const list = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '7px' }
