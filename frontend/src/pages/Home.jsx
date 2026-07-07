import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const OPENING_LINES = [
  "Every choice rewrites the ending.",
  "Turn left, and the whole world changes.",
  "Some doors only open once.",
  "The story remembers what you chose.",
]

export default function Home() {
  const [lineIndex, setLineIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setLineIndex(i => (i + 1) % OPENING_LINES.length)
        setVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      {/* Hero */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Decorative lines */}
        <div
          className="animate-fadeIn delay-500"
          style={{
            position: 'absolute',
            top: '15%',
            left: '8%',
            width: '1px',
            height: '120px',
            background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.3), transparent)',
          }}
        />
        <div
          className="animate-fadeIn delay-500"
          style={{
            position: 'absolute',
            top: '15%',
            right: '8%',
            width: '1px',
            height: '120px',
            background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.3), transparent)',
          }}
        />

        <div className="text-center max-w-3xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
          <p
            className="animate-fadeUp text-xs uppercase tracking-widest mb-8"
            style={{ color: 'var(--gold)', letterSpacing: '0.25em', opacity: 0.8 }}
          >
            Interactive Narrative
          </p>

          <h1
            className="animate-fadeUp delay-100 font-story"
            style={{
              fontSize: 'clamp(48px, 8vw, 88px)',
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: 'var(--parchment)',
              marginBottom: '24px',
            }}
          >
            CraftnTales
          </h1>

          <div
            style={{
              height: '2px',
              width: '60px',
              background: 'var(--gold)',
              margin: '0 auto 32px',
              opacity: 0.6,
            }}
            className="animate-fadeIn delay-200"
          />

          <p
            className="animate-fadeUp delay-200"
            style={{
              fontSize: '18px',
              color: 'rgba(250,248,243,0.6)',
              lineHeight: 1.7,
              marginBottom: '20px',
              maxWidth: '520px',
              margin: '0 auto 20px',
            }}
          >
            Choose-your-path fiction, told branch by branch.
            Read a tale where every decision leads somewhere new — or write one of your own.
          </p>

          <p
            style={{
              fontSize: '15px',
              color: 'var(--gold)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.4s ease',
              marginBottom: '52px',
              fontStyle: 'italic',
              fontFamily: 'Georgia, serif',
              minHeight: '24px',
            }}
          >
            &ldquo;{OPENING_LINES[lineIndex]}&rdquo;
          </p>

          <div className="animate-fadeUp delay-400 flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/stories"
              style={{
                display: 'inline-block',
                padding: '14px 36px',
                background: 'var(--gold)',
                color: 'var(--ink)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '3px',
                transition: 'background 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold-dark)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              Explore Stories
            </Link>
            <Link
              to="/create"
              style={{
                display: 'inline-block',
                padding: '14px 36px',
                background: 'transparent',
                color: 'var(--parchment)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '3px',
                border: '1px solid rgba(250,248,243,0.25)',
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.color = 'var(--gold)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(250,248,243,0.25)'; e.currentTarget.style.color = 'var(--parchment)' }}
            >
              Write a Story
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '120px 24px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="text-center mb-20">
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '16px', opacity: 0.7 }}>
            How it works
          </p>
          <h2 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Stories that breathe
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '40px' }}>
          {[
            {
              num: '01',
              title: 'Pick your story',
              desc: 'Browse tales across fantasy, mystery, sci-fi, and more. Each one hides dozens of endings.',
            },
            {
              num: '02',
              title: 'Read and decide',
              desc: 'At each turning point, you choose what happens next. No one path is the right one.',
            },
            {
              num: '03',
              title: 'Shape the ending',
              desc: 'Your choices accumulate. The world you leave behind is entirely your own.',
            },
          ].map(({ num, title, desc }, i) => (
            <div
              key={num}
              className="animate-fadeUp"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <p className="font-story" style={{ fontSize: '42px', color: 'rgba(201,168,76,0.15)', fontWeight: 400, marginBottom: '12px', lineHeight: 1 }}>
                {num}
              </p>
              <h3 style={{ fontSize: '18px', color: 'var(--parchment)', fontWeight: 500, marginBottom: '12px' }}>
                {title}
              </h3>
              <p style={{ fontSize: '15px', color: 'rgba(250,248,243,0.5)', lineHeight: 1.7 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
