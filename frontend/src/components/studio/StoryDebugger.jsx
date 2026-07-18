import { useMemo } from 'react'

// Step through the story the way a reader would, but with a debugger's
// instruments: a call stack (the path taken), a watch panel (live state), and
// breakpoints you can drop on any passage. `path` (array of node ids) is owned
// by the studio so the graph can highlight it in lockstep.
export default function StoryDebugger({
  analysis,
  rootId,
  path,
  setPath,
  breakpoints,
  toggleBreakpoint,
}) {
  const { map, depth, reachable } = analysis
  const currentId = path[path.length - 1] || rootId
  const current = map[currentId]

  const stepInto = (choiceIndex) => {
    const next = current?.choices?.[choiceIndex]?.nextNodeId
    if (next && map[next]) setPath((p) => [...p, next])
  }
  const stepBack = () => setPath((p) => (p.length > 1 ? p.slice(0, -1) : p))
  const restart = () => setPath([rootId])

  // Auto-run a random path until an ending, a dead end, or a breakpoint.
  const run = () => {
    setPath((p) => {
      const trail = [...p]
      let guard = 0
      while (guard++ < 500) {
        const node = map[trail[trail.length - 1]]
        if (!node || node.choices.length === 0) break // ending
        const open = node.choices.filter((c) => c.nextNodeId && map[c.nextNodeId])
        if (open.length === 0) break // unwritten dead end
        const pick = open[Math.floor(Math.random() * open.length)].nextNodeId
        trail.push(pick)
        if (breakpoints.has(pick)) break // paused at a breakpoint
      }
      return trail
    })
  }

  if (!current) {
    return <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta50))' }}>No opening passage to debug yet.</p>
  }

  const choices = current.choices || []
  const isEnding = choices.length === 0
  const openHere = choices.filter((c) => !c.nextNodeId).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Controls — flat, typographic, no glowing pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <DbgBtn onClick={restart} label="⟲ Restart" />
        <DbgBtn onClick={stepBack} label="◂ Step back" disabled={path.length <= 1} />
        <DbgBtn onClick={run} label="▶ Run path" primary />
      </div>

      {/* Watch — live reader state */}
      <Section title="Watch">
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px' }}>
          <Watch k="passage" v={`#${shortId(currentId)}`} />
          <Watch k="kind" v={currentId === rootId ? 'opening' : isEnding ? 'ending' : 'passage'} accent={isEnding} />
          <Watch k="depth" v={depth[currentId] ?? '—'} />
          <Watch k="steps taken" v={path.length - 1} />
          <Watch k="choices here" v={choices.length} />
          <Watch k="unwritten here" v={openHere} accent={openHere > 0} />
          <Watch k="reachable" v={reachable.has(currentId) ? 'yes' : 'no'} accent={!reachable.has(currentId)} />
        </dl>
      </Section>

      {/* Current passage preview */}
      <Section title="Now reading">
        <p className="font-story" style={{ fontSize: '14px', lineHeight: 1.65, color: 'rgba(var(--text-rgb),var(--ta82))', whiteSpace: 'pre-wrap' }}>
          {snippet(current.text) || (current.content ? '(an image or embed)' : '(empty passage)')}
        </p>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginTop: '12px', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: breakpoints.has(currentId) ? '#c45a6e' : 'rgba(var(--text-rgb),var(--ta45))' }}>
          <input
            type="checkbox"
            checked={breakpoints.has(currentId)}
            onChange={() => toggleBreakpoint(currentId)}
            style={{ accentColor: '#8b1a2e' }}
          />
          Breakpoint here
        </label>
      </Section>

      {/* Step into a choice */}
      <Section title={isEnding ? 'The End' : 'Step into'}>
        {isEnding ? (
          <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta50))', fontStyle: 'italic' }} className="font-story">
            This passage is an ending — the trail stops here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {choices.map((c, i) => {
              const written = c.nextNodeId && map[c.nextNodeId]
              return (
                <button
                  key={i}
                  onClick={() => written && stepInto(i)}
                  disabled={!written}
                  style={{
                    textAlign: 'left',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'baseline',
                    padding: '10px 12px',
                    borderRadius: 'var(--r-sm)',
                    border: `1px solid ${written ? 'rgba(var(--panel-rgb),var(--pa12))' : 'rgba(139,26,46,0.35)'}`,
                    background: 'rgba(var(--panel-rgb),var(--pa02))',
                    color: 'rgba(var(--text-rgb),var(--ta82))',
                    cursor: written ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                    fontSize: '13.5px',
                  }}
                >
                  <span className="font-story" style={{ color: 'var(--gold)', opacity: 0.8 }}>{String.fromCharCode(65 + i)}.</span>
                  <span style={{ flex: 1 }}>{c.text || <em style={{ color: 'rgba(var(--text-rgb),var(--ta40))' }}>(no label)</em>}</span>
                  {!written && (
                    <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c45a6e' }}>dead end</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </Section>

      {/* Call stack — the path taken so far */}
      <Section title={`Call stack · ${path.length}`}>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {path.map((id, i) => (
            <li key={i}>
              <button
                onClick={() => setPath(path.slice(0, i + 1))}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  gap: '10px',
                  padding: '5px 8px',
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: i === path.length - 1 ? 'rgba(var(--gold-rgb),0.08)' : 'transparent',
                  color: i === path.length - 1 ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta55))',
                  cursor: 'pointer',
                  fontFamily: 'var(--serif)',
                  fontSize: '13px',
                }}
              >
                <span style={{ opacity: 0.5, fontVariantNumeric: 'tabular-nums' }}>{String(i).padStart(2, '0')}</span>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {snippet(map[id]?.text, 40) || `#${shortId(id)}`}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.7, marginBottom: '10px' }}>{title}</p>
      {children}
    </div>
  )
}

function Watch({ k, v, accent }) {
  return (
    <>
      <dt style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta45))', fontFamily: 'var(--sans)' }}>{k}</dt>
      <dd style={{ margin: 0, fontSize: '13px', fontVariantNumeric: 'tabular-nums', color: accent ? '#d2a63f' : 'rgba(var(--text-rgb),var(--ta82))', fontFamily: 'var(--sans)' }}>{v}</dd>
    </>
  )
}

function DbgBtn({ label, onClick, disabled, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 14px',
        borderRadius: 'var(--r-sm)',
        border: primary ? 'none' : '1px solid rgba(var(--panel-rgb),var(--pa15))',
        background: primary ? 'var(--gold-solid)' : 'transparent',
        color: primary ? 'var(--on-gold)' : 'rgba(var(--text-rgb),var(--ta70))',
        fontSize: '12px',
        letterSpacing: '0.05em',
        fontWeight: primary ? 600 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )
}

const shortId = (id) => (id ? String(id).slice(0, 6) : '——')
const snippet = (text, n = 90) => {
  if (!text) return ''
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > n ? clean.slice(0, n) + '…' : clean
}
