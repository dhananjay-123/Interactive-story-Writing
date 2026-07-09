// Honest loading screen for cold starts. The frontend, backend (Render) and
// database (Neon) are on free tiers that sleep when idle, so the first request
// after a while can take up to ~60s while they wake. Rather than a vague
// "Loading…" we tell the reader exactly what's happening.

export default function ConnectingLoader({
  fullScreen = true,
  message = 'Connecting to the database and backend',
  hint = 'Free-tier services sleep when idle — waking them can take up to a minute.',
}) {
  const body = (
    <div
      className="animate-fadeIn"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '22px',
        maxWidth: '340px',
      }}
    >
      <ConnectingMark />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p
          style={{
            margin: 0,
            color: 'rgba(var(--text-rgb),var(--ta50))',
            fontSize: '12px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          Please wait
        </p>
        <p
          className="font-story"
          style={{
            margin: 0,
            color: 'rgba(var(--text-rgb),var(--ta60))',
            fontSize: '17px',
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          {message}
        </p>
        <p
          style={{
            margin: 0,
            color: 'rgba(var(--text-rgb),var(--ta35))',
            fontSize: '12.5px',
            lineHeight: 1.6,
          }}
        >
          {hint}
        </p>
      </div>
    </div>
  )

  if (!fullScreen) {
    return <div style={{ padding: '72px 0', display: 'flex', justifyContent: 'center' }}>{body}</div>
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      {body}
    </div>
  )
}

// A quill nib on the left, a stack of pages (the store) on the right, and ink
// travelling the wire between them. CSS animations only — no JS, no libraries.
function ConnectingMark() {
  const gold = 'var(--gold)'
  const wire = 'rgba(var(--text-rgb),var(--ta25))'
  return (
    <svg
      width="132"
      height="60"
      viewBox="0 0 132 60"
      fill="none"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* Nib — the writer's end */}
      <g style={{ animation: 'connBreath 2.4s ease-in-out infinite', transformOrigin: '20px 30px' }}>
        <path
          d="M20 12 L27 34 L20 40 L13 34 Z"
          stroke={gold}
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="none"
        />
        <line x1="20" y1="22" x2="20" y2="40" stroke={gold} strokeWidth="1.6" />
        <circle cx="20" cy="40" r="1.6" fill={gold} />
      </g>

      {/* The wire */}
      <line x1="34" y1="34" x2="96" y2="30" stroke={wire} strokeWidth="1.4" strokeDasharray="2 4" strokeLinecap="round" />

      {/* Ink beads travelling toward the store, staggered so they read as flow */}
      <circle cx="48" cy="33" r="2.4" fill={gold} style={{ animation: 'connFlow 1.5s ease-in-out infinite' }} />
      <circle cx="65" cy="32" r="2.4" fill={gold} style={{ animation: 'connFlow 1.5s ease-in-out 0.25s infinite' }} />
      <circle cx="82" cy="31" r="2.4" fill={gold} style={{ animation: 'connFlow 1.5s ease-in-out 0.5s infinite' }} />

      {/* Stacked pages — the database / backend end */}
      <g stroke={gold} strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M104 16 h20 a2 2 0 0 1 2 2 v24 a2 2 0 0 1 -2 2 h-20 a2 2 0 0 1 -2 -2 v-24 a2 2 0 0 1 2 -2 Z" />
        <line x1="108" y1="24" x2="120" y2="24" />
        <line x1="108" y1="30" x2="120" y2="30" />
        <line x1="108" y1="36" x2="116" y2="36" />
      </g>
    </svg>
  )
}
