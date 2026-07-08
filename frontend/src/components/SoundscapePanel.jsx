import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAudio } from '../audio/AudioProvider'
import { AMBIENCE_BY_GENRE, GENRE_LABELS, findAmbience } from '../audio/ambience'

// The author's soundscape picker. Each preset has a test player (▶) so they can
// audition it before choosing; the selected one plays for readers of the story.
export default function SoundscapePanel({ story, onChange }) {
  const { previewAmbience, stopPreview } = useAudio()
  const [selected, setSelected] = useState(story.ambience || null)
  const [previewing, setPreviewing] = useState(null)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  // Stop any preview when the panel unmounts (e.g. navigating away).
  useEffect(() => () => stopPreview(), [stopPreview])

  const togglePreview = (id) => {
    if (previewing === id) {
      stopPreview()
      setPreviewing(null)
    } else {
      previewAmbience(id)
      setPreviewing(id)
    }
  }

  const choose = async (id) => {
    setError('')
    setSaving(id || 'none')
    try {
      const { data } = await api.put(`/api/stories/${story._id}/ambience`, { ambience: id })
      const next = data.ambience || null
      setSelected(next)
      onChange?.(next)
    } catch {
      setError('Could not save that soundscape. Try again.')
    } finally {
      setSaving(null)
    }
  }

  const genrePresets = AMBIENCE_BY_GENRE[story.genre] || []
  const chosen = findAmbience(selected)

  return (
    <section
      className="animate-fadeUp"
      style={{
        marginBottom: '36px',
        border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
        borderRadius: '8px',
        padding: '22px 22px 18px',
        background: 'rgba(var(--panel-rgb),var(--pa03))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', opacity: 0.75 }}>
          Soundscape
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta45))' }}>
          {chosen ? <>Playing for readers: <span style={{ color: 'var(--gold)' }}>{chosen.name}</span></> : 'No background sound'}
        </p>
      </div>

      <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta45))', lineHeight: 1.6, margin: '10px 0 18px', maxWidth: '560px' }}>
        Pick a background ambience and readers will hear it while they move through your story. Press ▶ to audition
        each one — you don’t need sound switched on to test them here.
      </p>

      <PresetList
        presets={genrePresets}
        selected={selected}
        previewing={previewing}
        saving={saving}
        onPreview={togglePreview}
        onChoose={choose}
      />

      {/* Silence option */}
      <button
        onClick={() => choose(null)}
        style={{
          marginTop: '10px',
          background: 'none',
          border: `1px solid ${selected === null ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa15))'}`,
          color: selected === null ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta55))',
          fontSize: '11px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          padding: '9px 16px',
          borderRadius: '4px',
          width: '100%',
          fontFamily: 'inherit',
        }}
      >
        {saving === 'none' ? 'Saving…' : selected === null ? '✓ Silence (no soundscape)' : 'Use silence — no soundscape'}
      </button>

      {error && <p style={{ fontSize: '13px', color: 'var(--crimson)', marginTop: '12px' }}>{error}</p>}

      {/* Browse the rest */}
      <button
        onClick={() => setShowAll((v) => !v)}
        style={{
          marginTop: '16px',
          background: 'none',
          border: 'none',
          color: 'rgba(var(--text-rgb),var(--ta45))',
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
        }}
      >
        {showAll ? '▾ Hide other genres' : '▸ Browse every soundscape'}
      </button>

      {showAll && (
        <div className="animate-fadeIn" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(AMBIENCE_BY_GENRE)
            .filter(([g]) => g !== story.genre)
            .map(([g, presets]) => (
              <div key={g}>
                <p style={{ fontSize: '10px', letterSpacing: '0.18em', color: 'rgba(var(--text-rgb),var(--ta40))', textTransform: 'uppercase', marginBottom: '10px' }}>
                  {GENRE_LABELS[g] || g}
                </p>
                <PresetList
                  presets={presets}
                  selected={selected}
                  previewing={previewing}
                  saving={saving}
                  onPreview={togglePreview}
                  onChoose={choose}
                />
              </div>
            ))}
        </div>
      )}
    </section>
  )
}

function PresetList({ presets, selected, previewing, saving, onPreview, onChoose }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {presets.map((p) => {
        const isSelected = selected === p.id
        const isPreviewing = previewing === p.id
        return (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              borderRadius: '6px',
              border: `1px solid ${isSelected ? 'rgba(var(--gold-rgb),0.5)' : 'rgba(var(--panel-rgb),var(--pa10))'}`,
              background: isSelected ? 'rgba(var(--gold-rgb),0.06)' : 'transparent',
            }}
          >
            <button
              onClick={() => onPreview(p.id)}
              aria-label={isPreviewing ? `Stop ${p.name}` : `Play ${p.name}`}
              title={isPreviewing ? 'Stop' : 'Play'}
              style={{
                flexShrink: 0,
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: `1px solid ${isPreviewing ? 'var(--gold)' : 'rgba(var(--gold-rgb),0.4)'}`,
                background: isPreviewing ? 'rgba(var(--gold-rgb),0.12)' : 'transparent',
                color: 'var(--gold)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPreviewing ? <StopIcon /> : <PlayIcon />}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="font-story" style={{ fontSize: '15px', color: 'var(--parchment)', lineHeight: 1.3 }}>
                {p.name}
                {isPreviewing && (
                  <span style={{ marginLeft: '8px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8 }}>
                    ● auditioning
                  </span>
                )}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta45))', lineHeight: 1.4, marginTop: '2px' }}>
                {p.desc}
              </p>
            </div>

            <button
              onClick={() => onChoose(p.id)}
              disabled={isSelected || saving === p.id}
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                color: isSelected ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta55))',
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: isSelected ? 'default' : 'pointer',
                padding: '6px 4px',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {saving === p.id ? 'Saving…' : isSelected ? '✓ Selected' : 'Use this'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  )
}
