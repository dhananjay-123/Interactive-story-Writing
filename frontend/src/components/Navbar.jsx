import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAudio } from '../audio/AudioProvider'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
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

  // Collapse the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  const authorPath = user ? `/author/${user.username}` : null

  return (
    <nav
      style={{
        background: scrolled || menuOpen ? 'rgba(var(--bg-rgb),0.95)' : 'transparent',
        borderBottom:
          scrolled || menuOpen
            ? '1px solid rgba(var(--gold-rgb),0.15)'
            : '1px solid transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(12px)' : 'none',
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

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-7">
          <NavLink to="/stories" label="Browse" active={location.pathname === '/stories'} />

          {user ? (
            <>
              <NavLink to="/create" label="Write" active={location.pathname === '/create'} />
              <button onClick={handleLogout} style={textLinkStyle('rgba(var(--text-rgb),var(--ta45))')}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" label="Sign in" active={location.pathname === '/login'} />
              <Link to="/register" style={joinButtonStyle}>
                Join
              </Link>
            </>
          )}

          <IconButtons
            theme={theme}
            toggleTheme={toggleTheme}
            enabled={enabled}
            toggle={toggle}
          />

          {user && (
            <Avatar
              to={authorPath}
              name={user.displayName}
              active={location.pathname === authorPath}
            />
          )}
        </div>

        {/* Mobile top-bar controls */}
        <div className="flex md:hidden items-center gap-3">
          <IconButtons
            theme={theme}
            toggleTheme={toggleTheme}
            enabled={enabled}
            toggle={toggle}
          />

          {user && (
            <Avatar
              to={authorPath}
              name={user.displayName}
              active={location.pathname === authorPath}
            />
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            style={iconButtonStyle('rgba(var(--text-rgb),var(--ta65))')}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          className="md:hidden animate-fadeUp"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(var(--gold-rgb),0.12)',
          }}
        >
          <MobileLink to="/stories" label="Browse" active={location.pathname === '/stories'} />
          {user ? (
            <>
              <MobileLink to="/create" label="Write" active={location.pathname === '/create'} />
              <MobileLink
                to={authorPath}
                label="My profile"
                active={location.pathname === authorPath}
              />
              <button
                onClick={handleLogout}
                style={{ ...mobileLinkStyle(false), textAlign: 'left' }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <MobileLink to="/login" label="Sign in" active={location.pathname === '/login'} />
              <MobileLink to="/register" label="Join" active={location.pathname === '/register'} />
            </>
          )}
        </div>
      )}
    </nav>
  )
}

function IconButtons({ theme, toggleTheme, enabled, toggle }) {
  return (
    <>
      <button
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        style={iconButtonStyle('rgba(var(--text-rgb),var(--ta50))')}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta50))')}
      >
        <ThemeIcon theme={theme} />
      </button>

      <button
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={enabled ? 'Mute sound' : 'Enable sound'}
        title={enabled ? 'Sound on' : 'Sound off'}
        style={iconButtonStyle(enabled ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta50))')}
      >
        <SoundIcon on={enabled} />
      </button>
    </>
  )
}

function Avatar({ to, name, active }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <Link
      to={to}
      title={name}
      aria-label={`${name} — profile`}
      className="font-story"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        flexShrink: 0,
        fontSize: '15px',
        lineHeight: 1,
        textDecoration: 'none',
        color: 'var(--gold)',
        border: active
          ? '1px solid var(--gold)'
          : '1px solid rgba(var(--gold-rgb),0.4)',
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = active
          ? 'var(--gold)'
          : 'rgba(var(--gold-rgb),0.4)')
      }
    >
      {initial}
    </Link>
  )
}

const joinButtonStyle = {
  fontSize: '12px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--on-gold)',
  background: 'var(--gold)',
  padding: '8px 18px',
  borderRadius: '3px',
  textDecoration: 'none',
  fontWeight: 600,
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

const mobileLinkStyle = (active) => ({
  fontSize: '13px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: active ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta65))',
  textDecoration: 'none',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '10px 2px',
  fontFamily: 'inherit',
  width: '100%',
})

function MobileLink({ to, label, active }) {
  return (
    <Link to={to} style={mobileLinkStyle(active)}>
      {label}
    </Link>
  )
}

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
        color: active ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta65))',
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

function MenuIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
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
