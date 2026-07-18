import { useEffect, useMemo, useRef, useState } from 'react'
import { NODE_W, NODE_H } from '../../utils/storyGraph'

// A pan/zoom SVG map of the passage tree. Pure SVG + CSS — no graph library.
// `analysis` is the output of analyzeStory. Optional overlays:
//   traffic       — { [nodeId]: visits } to tint nodes as a heatmap
//   edgeTraffic   — { [`${nodeId}:${choiceIndex}`]: count } to weight edges
//   activePath    — array of node ids to highlight (debugger)
//   issueNodes    — Set of node ids to flag with a warning dot (validator)
export default function StoryGraph({
  analysis,
  rootId,
  selectedId,
  onSelect,
  traffic,
  edgeTraffic,
  activePath,
  issueNodes,
  height = 520,
}) {
  const { map, pos } = analysis
  const wrapRef = useRef(null)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const drag = useRef(null)
  // mouseup fires before click, so drag.current is already null by the time a
  // node's onClick runs. This ref survives the release to tell a pan from a click.
  const justDragged = useRef(false)

  const bounds = useMemo(() => {
    const xs = Object.values(pos).map((p) => p.x)
    const ys = Object.values(pos).map((p) => p.y)
    if (!xs.length) return { minX: 0, minY: 0, w: NODE_W, h: NODE_H }
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    return {
      minX,
      minY,
      w: Math.max(...xs) - minX + NODE_W,
      h: Math.max(...ys) - minY + NODE_H,
    }
  }, [pos])

  const fit = () => {
    const el = wrapRef.current
    if (!el) return
    const cw = el.clientWidth
    const k = Math.min(1, Math.min(cw / (bounds.w + 80), height / (bounds.h + 80)))
    setView({
      x: cw / 2 - (bounds.minX + bounds.w / 2) * k,
      y: 46 - bounds.minY * k,
      k,
    })
  }

  useEffect(() => {
    fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.w, bounds.h])

  const onWheel = (e) => {
    e.preventDefault()
    const rect = wrapRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    setView((v) => {
      const k = Math.min(2.2, Math.max(0.18, v.k * (e.deltaY < 0 ? 1.12 : 0.89)))
      return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k }
    })
  }

  const onDown = (e) => {
    justDragged.current = false
    drag.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }
  }
  const onMove = (e) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.sx
    const dy = e.clientY - drag.current.sy
    if (Math.abs(dx) + Math.abs(dy) > 3) justDragged.current = true
    setView((v) => ({ ...v, x: drag.current.ox + dx, y: drag.current.oy + dy }))
  }
  const onUp = () => { drag.current = null }

  const maxTraffic = useMemo(
    () => (traffic ? Math.max(1, ...Object.values(traffic)) : 0),
    [traffic]
  )
  const maxEdge = useMemo(
    () => (edgeTraffic ? Math.max(1, ...Object.values(edgeTraffic)) : 0),
    [edgeTraffic]
  )
  const pathSet = useMemo(() => new Set(activePath || []), [activePath])

  const edges = []
  for (const node of Object.values(map)) {
    const from = pos[node._id]
    if (!from) continue
    ;(node.choices || []).forEach((c, i) => {
      const to = c.nextNodeId && pos[c.nextNodeId]
      if (!to) return
      const x1 = from.x + NODE_W / 2
      const y1 = from.y + NODE_H
      const x2 = to.x + NODE_W / 2
      const y2 = to.y
      const my = (y1 + y2) / 2
      const idx = activePath ? activePath.indexOf(node._id) : -1
      const onPath = idx >= 0 && activePath[idx + 1] === c.nextNodeId
      const weight = edgeTraffic ? (edgeTraffic[`${node._id}:${i}`] || 0) / maxEdge : 0
      edges.push({
        key: `${node._id}-${i}`,
        d: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`,
        onPath,
        weight,
      })
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={wrapRef}
        onWheel={onWheel}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        style={{
          height,
          borderRadius: 'var(--r-md)',
          border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
          background:
            'radial-gradient(circle at 1px 1px, rgba(var(--panel-rgb),var(--pa06)) 1px, transparent 0) 0 0 / 26px 26px, rgba(var(--panel-rgb),var(--pa02))',
          overflow: 'hidden',
          cursor: drag.current ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <svg width="100%" height={height} style={{ display: 'block' }}>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {edges.map((e) => (
              <path
                key={e.key}
                d={e.d}
                fill="none"
                stroke={e.onPath ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa18))'}
                strokeWidth={e.onPath ? 2.4 : 1 + e.weight * 4}
                strokeOpacity={e.onPath ? 1 : 0.55 + e.weight * 0.45}
                style={{ transition: 'stroke 0.18s ease' }}
              />
            ))}
            {Object.values(map).map((node) => {
              const p = pos[node._id]
              if (!p) return null
              return (
                <GraphNode
                  key={node._id}
                  node={node}
                  x={p.x}
                  y={p.y}
                  rootId={rootId}
                  selected={selectedId === node._id}
                  onPath={pathSet.has(node._id)}
                  orphan={!analysis.reachable.has(node._id) && node._id !== rootId}
                  flagged={issueNodes && issueNodes.has(node._id)}
                  heat={traffic ? (traffic[node._id] || 0) / maxTraffic : -1}
                  onSelect={() => { if (!justDragged.current) onSelect?.(node._id) }}
                />
              )
            })}
          </g>
        </svg>
      </div>

      <div style={{ position: 'absolute', right: '12px', bottom: '12px', display: 'flex', gap: '6px' }}>
        <CtrlBtn onClick={() => setView((v) => ({ ...v, k: Math.min(2.2, v.k * 1.2) }))}>+</CtrlBtn>
        <CtrlBtn onClick={() => setView((v) => ({ ...v, k: Math.max(0.18, v.k * 0.83) }))}>−</CtrlBtn>
        <CtrlBtn onClick={fit} title="Fit to view">⤢</CtrlBtn>
      </div>
    </div>
  )
}

function GraphNode({ node, x, y, rootId, selected, onPath, orphan, flagged, heat, onSelect }) {
  const kind = node._id === rootId ? 'opening' : (node.choices || []).length === 0 ? 'ending' : 'passage'
  const base =
    kind === 'opening'
      ? { fill: 'rgba(var(--gold-rgb),0.14)', stroke: 'var(--gold)', label: 'var(--gold)' }
      : kind === 'ending'
      ? { fill: 'rgba(139,26,46,0.16)', stroke: '#c45a6e', label: '#c45a6e' }
      : { fill: 'var(--surface)', stroke: 'rgba(var(--panel-rgb),var(--pa18))', label: 'rgba(var(--text-rgb),var(--ta50))' }

  const fill =
    heat >= 0
      ? `color-mix(in srgb, var(--gold-solid) ${Math.round(10 + heat * 70)}%, var(--surface))`
      : base.fill
  const stroke = orphan ? '#c45a6e' : selected || onPath ? 'var(--gold)' : base.stroke
  const label = snippet(node.text) || (node.content ? '· image / embed ·' : '(empty passage)')

  return (
    <g transform={`translate(${x} ${y})`} onClick={onSelect} style={{ cursor: 'pointer' }}>
      <rect
        width={NODE_W}
        height={NODE_H}
        rx="8"
        fill={fill}
        stroke={stroke}
        strokeWidth={selected || onPath ? 2.2 : 1.2}
        strokeDasharray={orphan ? '5 4' : 'none'}
        style={{ transition: 'stroke 0.18s ease, stroke-width 0.18s ease' }}
      />
      {flagged && (
        <circle cx={NODE_W - 12} cy={12} r="5" fill="#e0b34a" stroke="var(--ink)" strokeWidth="1.5" />
      )}
      <text x="12" y="20" fontSize="8.5" letterSpacing="0.12em" fill={base.label} style={{ textTransform: 'uppercase' }}>
        {kind}
      </text>
      <text x="12" y="41" fontSize="12.5" fontFamily="var(--serif)" fill="rgba(var(--text-rgb),var(--ta82))">
        {label}
      </text>
    </g>
  )
}

function CtrlBtn({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '30px',
        height: '30px',
        borderRadius: 'var(--r-sm)',
        border: '1px solid rgba(var(--panel-rgb),var(--pa15))',
        background: 'var(--surface)',
        color: 'rgba(var(--text-rgb),var(--ta70))',
        cursor: 'pointer',
        fontSize: '15px',
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  )
}

const snippet = (text) => {
  if (!text) return ''
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 22 ? clean.slice(0, 22) + '…' : clean
}
