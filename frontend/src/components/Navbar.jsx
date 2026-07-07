import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAudio } from '../audio/AudioProvider'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { enabled, toggle } = useAudio()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav
      style={{
        background: scrolled ? 'rgba(var(--bg-rgb),0.95)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(201,168,76,0.15)' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
      }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="font-story text-xl tracking-wide"
          style={{ color: 'var(--gold)', textDecoration: 'none' }}
        >
          CraftnTales
        </Link>

        <div className="flex items-center gap-7">
          <NavLink to="/stories" label="Browse" active={location.pathname === '/stories'} />

          {user ? (
            <>
              <NavLink to="/create" label="Write" active={location.pathname === '/create'} />
              <NavLink
                to={`/author/${user.username}`}
                label={user.displayName}
                active={location.pathname === `/author/${user.username}`}
              />
              <button onClick={handleLogout} style={textLinkStyle('rgba(var(--text-rgb),0.45)')}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" label="Sign in" active={location.pathname === '/login'} />
              <Link
                to="/register"
                style={{
                  fontSize: '12px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--on-gold)',
                  background: 'var(--gold)',
                  padding: '8px 18px',
                  borderRadius: '3px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Join
              </Link>
            </>
          )}

          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            style={iconButtonStyle('rgba(var(--text-rgb),0.5)')}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),0.5)')}
          >
            <ThemeIcon theme={theme} />
          </button>

          <button
            onClick={toggle}
            aria-pressed={enabled}
            aria-label={enabled ? 'Mute sound' : 'Enable sound'}
            title={enabled ? 'Sound on' : 'Sound off'}
            style={iconButtonStyle(enabled ? 'var(--gold)' : 'rgba(var(--text-rgb),0.5)')}
          >
            <SoundIcon on={enabled} />
          </button>
        </div>
      </div>
    </nav>
  )
}

const textLinkStyle = (color) => ({
  fontSize: '12px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'inherit',
  transition: 'color 0.2s ease',
})

const iconButtonStyle = (color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '30px',
  height: '30px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color,
  transition: 'color 0.2s ease',
})

function ThemeIcon({ theme }) {
  // Show the sun in dark mode (tap to go light), the moon in light mode.
  if (theme === 'dark') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      className="transition-colors duration-200"
      style={{
        fontSize: '12px',
        color: active ? 'var(--gold)' : 'rgba(var(--text-rgb),0.65)',
        textDecoration: 'none',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        maxWidth: '160px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Link>
  )
}

function SoundIcon({ on }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      {on ? (
        <>
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 6a8 8 0 0 1 0 12" />
        </>
      ) : (
        <path d="M17 9l4 6M21 9l-4 6" />
      )}
    </svg>
  )
}
