import { useEffect, useState } from 'react'
import { useNarration } from '../narration/useNarration'

// Read-aloud controls for one passage. Sits quietly above the prose as a single
// "Listen" line; playing state brings pause/stop and a position marker, and a
// separate toggle opens the voice/pace/pitch settings. Renders nothing at all
// on browsers without speechSynthesis.
export default function NarrationPanel({ text, nodeId }) {
  const { supported, voices, prefs, setPrefs, playing, paused, position, play, pause, resume, stop } =
    useNarration()
  const [showSettings, setShowSettings] = useState(false)

  // Moving to another passage stops the voice — it belongs to the page it read.
  useEffect(() => {
    stop()
  }, [nodeId, stop])

  if (!supported || !text?.trim()) return null

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {!playing ? (
          <button
            onClick={() => play(text)}
            style={controlStyle('var(--gold)')}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.75)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
          >
            <PlayIcon /> Listen
          </button>
        ) : (
          <>
            <button onClick={paused ? resume : pause} style={controlStyle('var(--gold)')}>
              {paused ? <PlayIcon /> : <PauseIcon />} {paused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={stop} style={controlStyle('rgba(var(--text-rgb),var(--ta45))')}>
              <StopIcon /> Stop
            </button>
            <span
              aria-live="off"
              style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(var(--text-rgb),var(--ta35))' }}
            >
              {position.current} / {position.total}
            </span>
          </>
        )}

        <button
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
          style={controlStyle(showSettings ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta35))')}
        >
          Voice settings
        </button>
      </div>

      {showSettings && (
        <div
          className="animate-fadeUp"
          style={{
            marginTop: '14px',
            padding: '16px 18px',
            border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            maxWidth: '420px',
          }}
        >
          <label style={settingLabel}>
            Voice
            <select
              value={prefs.voiceURI || ''}
              onChange={(e) => setPrefs({ voiceURI: e.target.value || null })}
              style={selectStyle}
            >
              <option value="">Device default</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>

          <label style={settingLabel}>
            Pace — {prefs.rate.toFixed(1)}×
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.1"
              value={prefs.rate}
              onChange={(e) => setPrefs({ rate: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--gold)' }}
            />
          </label>

          <label style={settingLabel}>
            Pitch — {prefs.pitch.toFixed(1)}
            <input
              type="range"
              min="0.6"
              max="1.5"
              step="0.1"
              value={prefs.pitch}
              onChange={(e) => setPrefs({ pitch: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--gold)' }}
            />
          </label>

          <p style={{ fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta30))', lineHeight: 1.5 }}>
            Narration uses your device's own voices — nothing leaves this page.
            Changes apply from the next play.
          </p>
        </div>
      )}
    </div>
  )
}

const controlStyle = (color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  background: 'none',
  border: 'none',
  padding: 0,
  fontFamily: 'inherit',
  fontSize: '12px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color,
  cursor: 'pointer',
  transition: 'opacity 0.2s ease, color 0.2s ease',
})

const settingLabel = {
  display: 'flex',
  flexDirection: 'column',
  gap: '7px',
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'rgba(var(--text-rgb),var(--ta45))',
}

const selectStyle = {
  background: 'rgba(var(--panel-rgb),var(--pa04))',
  border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
  borderRadius: '3px',
  padding: '9px 10px',
  color: 'var(--parchment)',
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
  maxWidth: '100%',
}

function PlayIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M2 1.5v9l8-4.5-8-4.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M2 1h3v10H2zM7 1h3v10H7z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M1.5 1.5h9v9h-9z" />
    </svg>
  )
}
