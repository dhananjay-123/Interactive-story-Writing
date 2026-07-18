import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

// The story's world map, as the reader has walked it. Places the trail has
// passed through are lit and joined by a dotted route; the rest sit faint on
// the parchment, name withheld, until the reader gets there. Pure SVG — the
// decorations are drawn from a hash of the story id, so every story's map has
// its own hills and its own compass, and the same story always draws the same.
export default function WorldMap({ storyId, trail, currentPlaceId }) {
  const [places, setPlaces] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .get(`/api/stories/${storyId}/places`)
      .then(({ data }) => { if (!cancelled) setPlaces(data) })
      .catch(() => { if (!cancelled) setPlaces([]) })
    return () => { cancelled = true }
  }, [storyId])

  const visited = useMemo(() => new Set(trail), [trail])

  if (!places || places.length === 0) return null

  const seen = places.filter((p) => visited.has(p._id)).length

  return (
    <div style={{ margin: '0 0 34px' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '9px',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '11px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(var(--text-rgb),var(--ta50))',
        }}
      >
        <CompassGlyph />
        World map · {seen} of {places.length} places
        <span style={{ color: 'var(--gold)' }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="animate-fadeIn" style={{ marginTop: '14px' }}>
          <MapCanvas
            seedKey={storyId}
            places={places}
            visited={visited}
            trail={trail}
            currentPlaceId={currentPlaceId}
          />
          <p style={{ fontSize: '11.5px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '8px' }}>
            Places light as your path reaches them. The unnamed marks are still out there.
          </p>
        </div>
      )}
    </div>
  )
}

// Shared between the reader map and the editor's pin canvas.
export function MapCanvas({ seedKey, places, visited, trail, currentPlaceId, onMapClick, onPinClick, selectedId, height = 'auto' }) {
  const deco = useMemo(() => decorations(seedKey), [seedKey])

  // The reader's route: unique places in first-visit order.
  const route = useMemo(() => {
    if (!trail) return []
    const seen = new Set()
    const pts = []
    for (const pid of trail) {
      if (seen.has(pid)) continue
      const p = places.find((pl) => pl._id === pid)
      if (p) { seen.add(pid); pts.push(p) }
    }
    return pts
  }, [trail, places])

  const handleClick = (e) => {
    if (!onMapClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    onMapClick({
      x: Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10,
      y: Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10,
    })
  }

  return (
    <svg
      viewBox="0 0 100 62"
      onClick={handleClick}
      style={{
        display: 'block',
        width: '100%',
        height,
        borderRadius: 'var(--r-md)',
        background: 'rgba(var(--gold-rgb),0.05)',
        border: '1px solid rgba(var(--gold-rgb),0.25)',
        cursor: onMapClick ? 'crosshair' : 'default',
      }}
    >
      {/* Inked border, twice — the inner line wanders slightly, like a steady hand. */}
      <rect x="2" y="2" width="96" height="58" rx="1.4" fill="none" stroke="rgba(var(--gold-rgb),0.4)" strokeWidth="0.35" />
      <path d={deco.innerBorder} fill="none" stroke="rgba(var(--gold-rgb),0.25)" strokeWidth="0.25" />

      {/* Hills and shorelines, hatch-drawn. */}
      {deco.ranges.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(var(--text-rgb),0.16)" strokeWidth="0.3" strokeLinecap="round" />
      ))}

      {/* Compass rose */}
      <g transform={`translate(${deco.compass.x} ${deco.compass.y})`} opacity="0.55">
        <circle r="3.4" fill="none" stroke="var(--gold)" strokeWidth="0.25" />
        <path d="M0 -2.9 L0.7 0 L0 2.9 L-0.7 0 Z" fill="var(--gold)" opacity="0.8" />
        <path d="M-2.9 0 L0 0.55 L2.9 0 L0 -0.55 Z" fill="var(--gold)" opacity="0.4" />
        <text y="-4.1" textAnchor="middle" fontSize="1.9" fill="var(--gold)" fontFamily="var(--serif)">N</text>
      </g>

      {/* The reader's route so far. */}
      {route.length > 1 && (
        <path
          d={route.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y * 0.62}`).join(' ')}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="0.35"
          strokeDasharray="1 1.1"
          opacity="0.75"
        />
      )}

      {places.map((p) => {
        const isVisited = visited ? visited.has(p._id) : true
        const isHere = p._id === currentPlaceId
        const isSelected = p._id === selectedId
        const cy = p.y * 0.62
        return (
          <g
            key={p._id}
            transform={`translate(${p.x} ${cy})`}
            onClick={(e) => { if (onPinClick) { e.stopPropagation(); onPinClick(p) } }}
            style={{ cursor: onPinClick ? 'pointer' : 'default' }}
          >
            {isHere && <circle r="2.4" fill="none" stroke="var(--gold)" strokeWidth="0.3" className="wm-here" />}
            <circle
              r={isVisited ? 1.15 : 0.85}
              fill={isVisited ? 'var(--gold)' : 'none'}
              stroke={isVisited ? 'var(--gold-dark)' : 'rgba(var(--text-rgb),0.35)'}
              strokeWidth={isSelected ? 0.5 : 0.3}
              strokeDasharray={isVisited ? 'none' : '0.6 0.5'}
            />
            {(isVisited || onPinClick) && (
              <text
                y="-2.2"
                textAnchor="middle"
                fontSize="2.6"
                fontFamily="var(--serif)"
                fill={isHere || isSelected ? 'var(--gold)' : 'rgba(var(--text-rgb),0.72)'}
                fontStyle="italic"
              >
                {p.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function CompassGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
      <path d="M10 4.5 L11.6 10 L10 15.5 L8.4 10 Z" fill="var(--gold)" />
    </svg>
  )
}

// Deterministic decorations from any string key, so a story's map always
// draws the same but no two stories match.
function decorations(key) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const rng = () => {
    h = Math.imul(h ^ (h >>> 15), h | 1)
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61)
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296
  }

  // Wandering inner border.
  let inner = 'M 3.5 3.5'
  const wob = () => 3.5 + (rng() - 0.5) * 0.7
  inner += ` L ${96.5 + (rng() - 0.5) * 0.6} ${wob()} L ${96.5 + (rng() - 0.5) * 0.6} ${58.5 + (rng() - 0.5) * 0.6} L ${wob()} ${58.5 + (rng() - 0.5) * 0.6} Z`

  // A few hatch-stroke hill ranges.
  const ranges = []
  const nRanges = 3 + Math.floor(rng() * 3)
  for (let r = 0; r < nRanges; r++) {
    const cx = 12 + rng() * 76
    const cy = 10 + rng() * 42
    let d = ''
    const peaks = 2 + Math.floor(rng() * 3)
    for (let p = 0; p < peaks; p++) {
      const px = cx + p * (2.6 + rng() * 1.4)
      const ph = 1.6 + rng() * 1.8
      d += `M ${px - 1.6} ${cy} Q ${px} ${cy - ph}, ${px + 1.6} ${cy} `
    }
    ranges.push(d)
  }

  const corners = [
    { x: 9, y: 52 }, { x: 91, y: 52 }, { x: 91, y: 10 }, { x: 9, y: 10 },
  ]
  return { innerBorder: inner, ranges, compass: corners[Math.floor(rng() * corners.length)] }
}
