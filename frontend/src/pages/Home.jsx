import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import StoryCard from '../components/StoryCard'
import ContinueReading from '../components/ContinueReading'
import { Button, Logo } from '../components/ui'

const OPENING_LINES = [
  "Every choice rewrites the ending.",
  "Turn left, and the whole world changes.",
  "Some doors only open once.",
  "The story remembers what you chose.",
]

export default function Home() {
  const [lineIndex, setLineIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [featured, setFeatured] = useState([])
  const intervalRef = useRef(null)
  const pausedRef = useRef(false)

  // Rotate the opening lines slowly, and hold whenever the reader is hovering
  // the quote — motion shouldn't pull the eye off the page on a fast loop.
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return
      setVisible(false)
      setTimeout(() => {
        setLineIndex(i => (i + 1) % OPENING_LINES.length)
        setVisible(true)
      }, 400)
    }, 5200)
    return () => clearInterval(intervalRef.current)
  }, [])

  // Admin-curated picks. The section hides itself when nothing is featured.
  useEffect(() => {
    api.get('/api/stories/featured')
      .then(r => setFeatured(r.data))
      .catch(() => setFeatured([]))
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
            backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(var(--gold-rgb),0.06) 0%, transparent 70%)`,
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
            background: 'linear-gradient(to bottom, transparent, rgba(var(--gold-rgb),0.3), transparent)',
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
            background: 'linear-gradient(to bottom, transparent, rgba(var(--gold-rgb),0.3), transparent)',
          }}
        />

        <div className="text-center max-w-3xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
          <Logo variant="mark" width={132} className="animate-fadeIn hero-logo" />

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
            Craft&Tales
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
              color: 'rgba(var(--text-rgb),var(--ta60))',
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
            onMouseEnter={() => { pausedRef.current = true }}
            onMouseLeave={() => { pausedRef.current = false }}
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
            <Button to="/stories" variant="primary" size="lg" className="hero-cta">
              Explore Stories
            </Button>
            <Button to="/create" variant="ghost" size="lg">
              Write a Story
            </Button>
          </div>
        </div>
      </section>

      <ContinueReading />

      {/* Featured — admin-curated stories */}
      {featured.length > 0 && (
        <section style={{ padding: '40px 24px 20px', maxWidth: '1100px', margin: '0 auto' }}>
          <div className="animate-fadeUp" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '28px' }}>
            <div>
              <p className="eyebrow">Editor's picks</p>
              <h2 className="font-story" style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
                Featured stories
              </h2>
            </div>
            <Link to="/featured" className="section-link">
              See the whole shelf →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {featured.slice(0, 6).map((story, i) => (
              <StoryCard key={story._id} story={story} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* How it works — an editorial numbered list threaded on a single hairline,
          not the usual three equal feature columns. */}
      <section style={{ padding: '120px 24px', maxWidth: '820px', margin: '0 auto' }}>
        <div className="mb-16">
          <p className="eyebrow">How it works</p>
          <h2 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Stories that breathe
          </h2>
        </div>

        <div style={{ position: 'relative' }}>
          {/* The thread the steps hang from. */}
          <div style={{ position: 'absolute', left: '31px', top: '12px', bottom: '12px', width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(var(--gold-rgb),0.3) 12%, rgba(var(--gold-rgb),0.3) 88%, transparent)' }} />
          {[
            { num: '01', title: 'Pick your story', desc: 'Browse tales across fantasy, mystery, sci-fi, and more. Each one hides dozens of endings.' },
            { num: '02', title: 'Read and decide', desc: 'At each turning point, you choose what happens next. No one path is the right one.' },
            { num: '03', title: 'Shape the ending', desc: 'Your choices accumulate. The world you leave behind is entirely your own.' },
          ].map(({ num, title, desc }, i) => (
            <div
              key={num}
              className="animate-fadeUp"
              style={{ animationDelay: `${i * 0.12}s`, display: 'flex', gap: '28px', alignItems: 'flex-start', padding: i === 0 ? '0 0 44px' : '44px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(var(--panel-rgb),var(--pa04))' }}
            >
              <div style={{ position: 'relative', flexShrink: 0, width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--ink)', border: '1px solid rgba(var(--gold-rgb),0.25)' }}>
                <span className="font-story" style={{ fontSize: '22px', color: 'var(--gold)' }}>{num}</span>
              </div>
              <div style={{ paddingTop: '6px' }}>
                <h3 className="font-story" style={{ fontSize: '22px', color: 'var(--parchment)', fontWeight: 400, marginBottom: '8px', letterSpacing: '-0.01em' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '15.5px', color: 'rgba(var(--text-rgb),var(--ta55))', lineHeight: 1.7, maxWidth: '460px' }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
