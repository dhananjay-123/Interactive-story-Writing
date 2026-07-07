import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const GENRES = ['fantasy', 'mystery', 'sci_fi', 'romance', 'horror', 'thriller', 'literary']

export default function CreateStory() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: '',
    description: '',
    genre: '',
    author: '',
    openingText: '',
    choices: [{ text: '' }, { text: '' }],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const updateChoice = (i, val) => {
    const choices = [...form.choices]
    choices[i] = { text: val }
    setForm(f => ({ ...f, choices }))
  }

  const addChoice = () => {
    if (form.choices.length >= 4) return
    setForm(f => ({ ...f, choices: [...f.choices, { text: '' }] }))
  }

  const removeChoice = (i) => {
    if (form.choices.length <= 2) return
    setForm(f => ({ ...f, choices: f.choices.filter((_, idx) => idx !== i) }))
  }

  const canProceed = () => {
    if (step === 1) return form.title.trim() && form.genre && form.author.trim()
    if (step === 2) return form.description.trim() && form.openingText.trim()
    if (step === 3) return form.choices.every(c => c.text.trim())
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await axios.post('/api/stories', form)
      navigate(`/story/${res.data._id}`)
    } catch {
      setError('Could not publish. Please try again.')
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '3px',
    padding: '12px 16px',
    color: 'var(--parchment)',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'rgba(250,248,243,0.4)',
    marginBottom: '8px',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px 100px' }}>

        <div className="animate-fadeUp mb-12">
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.7 }}>
            New story
          </p>
          <h1 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Tell your story
          </h1>
        </div>

        {/* Step indicator */}
        <div className="animate-fadeIn delay-100 flex gap-3 mb-12">
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: `1px solid ${step >= s ? 'var(--gold)' : 'rgba(255,255,255,0.12)'}`,
                  background: step > s ? 'rgba(201,168,76,0.2)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: step >= s ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.3s ease',
                }}
              >
                {step > s ? '✓' : s}
              </div>
              <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: step === s ? 'var(--parchment)' : 'rgba(255,255,255,0.25)', transition: 'color 0.3s ease' }}>
                {['Details', 'Content', 'Choices'][s - 1]}
              </span>
              {s < 3 && <div style={{ width: '32px', height: '1px', background: step > s ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)', marginLeft: '4px', transition: 'background 0.3s ease' }} />}
            </div>
          ))}
        </div>

        <div className="animate-pageFlip">
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input
                  style={inputStyle}
                  placeholder="What is your story called?"
                  value={form.title}
                  onChange={e => update('title', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div>
                <label style={labelStyle}>Your name</label>
                <input
                  style={inputStyle}
                  placeholder="Author"
                  value={form.author}
                  onChange={e => update('author', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div>
                <label style={labelStyle}>Genre</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => update('genre', g)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        letterSpacing: '0.08em',
                        border: `1px solid ${form.genre === g ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`,
                        background: form.genre === g ? 'rgba(201,168,76,0.12)' : 'transparent',
                        color: form.genre === g ? 'var(--gold)' : 'rgba(250,248,243,0.5)',
                        cursor: 'pointer',
                        borderRadius: '3px',
                        transition: 'all 0.2s ease',
                        textTransform: 'capitalize',
                      }}
                    >
                      {g.replace('_', '-')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={labelStyle}>Short description</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  placeholder="A few sentences to hook the reader..."
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div>
                <label style={labelStyle}>Opening passage</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '220px', fontFamily: 'Georgia, serif', lineHeight: 1.7 }}
                  placeholder="Begin your story here. Set the scene. End at a moment of decision..."
                  value={form.openingText}
                  onChange={e => update('openingText', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <p style={{ fontSize: '11px', color: 'rgba(250,248,243,0.25)', marginTop: '8px' }}>
                  {form.openingText.length} characters
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(250,248,243,0.5)', marginBottom: '24px', lineHeight: 1.6 }}>
                Write 2–4 choices that readers can make at the end of your opening passage.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {form.choices.map((choice, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span
                      className="font-story"
                      style={{ color: 'var(--gold)', opacity: 0.7, fontSize: '16px', marginTop: '12px', minWidth: '20px' }}
                    >
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                      value={choice.text}
                      onChange={e => updateChoice(i, e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    {form.choices.length > 2 && (
                      <button
                        onClick={() => removeChoice(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(250,248,243,0.25)',
                          cursor: 'pointer',
                          fontSize: '16px',
                          marginTop: '10px',
                          transition: 'color 0.2s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--crimson)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(250,248,243,0.25)'}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {form.choices.length < 4 && (
                <button
                  onClick={addChoice}
                  style={{
                    background: 'none',
                    border: '1px dashed rgba(255,255,255,0.12)',
                    color: 'rgba(250,248,243,0.35)',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    padding: '10px 20px',
                    borderRadius: '3px',
                    transition: 'all 0.2s ease',
                    width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.color = 'var(--gold)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(250,248,243,0.35)' }}
                >
                  + Add choice
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
          <button
            onClick={() => step > 1 && setStep(s => s - 1)}
            style={{
              background: 'none',
              border: 'none',
              color: step > 1 ? 'rgba(250,248,243,0.4)' : 'transparent',
              fontSize: '12px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: step > 1 ? 'pointer' : 'default',
              padding: 0,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => step > 1 && (e.currentTarget.style.color = 'var(--parchment)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(250,248,243,0.4)')}
          >
            ← Back
          </button>

          {error && <p style={{ fontSize: '13px', color: 'var(--crimson)' }}>{error}</p>}

          {step < 3 ? (
            <button
              onClick={() => canProceed() && setStep(s => s + 1)}
              disabled={!canProceed()}
              style={{
                padding: '12px 32px',
                background: canProceed() ? 'var(--gold)' : 'rgba(201,168,76,0.2)',
                color: canProceed() ? 'var(--ink)' : 'rgba(250,248,243,0.3)',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                borderRadius: '3px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => canProceed() && (e.currentTarget.style.background = 'var(--gold-dark)')}
              onMouseLeave={e => canProceed() && (e.currentTarget.style.background = 'var(--gold)')}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              style={{
                padding: '12px 32px',
                background: canProceed() ? 'var(--gold)' : 'rgba(201,168,76,0.2)',
                color: canProceed() ? 'var(--ink)' : 'rgba(250,248,243,0.3)',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: canProceed() && !submitting ? 'pointer' : 'not-allowed',
                borderRadius: '3px',
                transition: 'all 0.2s ease',
              }}
            >
              {submitting ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
