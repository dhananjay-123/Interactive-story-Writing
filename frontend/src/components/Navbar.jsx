import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAudio } from '../audio/AudioProvider'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import NotificationBell from './NotificationBell'
import { avatarSrc } from '../avatars/catalog'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
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

  // Collapse the menus whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
    setMoreOpen(false)
  }, [location.pathname])

  // Dismiss the "More" dropdown on an outside click or Escape.
  useEffect(() => {
    if (!moreOpen) return
    const onClick = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false) }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onClick); window.removeEventListener('keydown', onKey) }
  }, [moreOpen])

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
          Craft&Tales
        </Link>

        {/* Desktop navigation — a short primary row; everything secondary lives
            under "More" so the bar keeps a clear hierarchy instead of a flat
            wall of equal-weight links. */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/stories" label="Browse" active={location.pathname === '/stories'} />
          <NavLink to="/featured" label="Featured" active={location.pathname === '/featured'} />
          <NavLink to="/games" label="Story Games" active={location.pathname === '/games'} />
          <NavLink to="/contests" label="Contests" active={location.pathname.startsWith('/contests')} />

          {user ? (
            <>
              {/* The primary action, given its own weight. */}
              <Link
                to="/create"
                style={writeButtonStyle(location.pathname === '/create')}
              >
                Write
              </Link>

              <div ref={moreRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={moreOpen}
                  style={{ ...textLinkStyle('rgba(var(--text-rgb),var(--ta65))'), display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  More <Caret open={moreOpen} />
                </button>
                {moreOpen && (
                  <div className="animate-fadeIn" style={dropdownStyle}>
                    <DropdownLink to="/my-stories" label="My stories" active={location.pathname === '/my-stories'} />
                    <DropdownLink to="/achievements" label="Badges" active={location.pathname === '/achievements'} />
                    <DropdownLink to="/leaderboard" label="Ranks" active={location.pathname === '/leaderboard'} />
                    {user.role === 'admin' && (
                      <DropdownLink to="/admin" label="Admin" active={location.pathname === '/admin'} />
                    )}
                    <div style={{ height: '1px', background: 'rgba(var(--panel-rgb),var(--pa10))', margin: '6px 0' }} />
                    <button onClick={handleLogout} style={{ ...dropdownItemStyle(false), textAlign: 'left', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/leaderboard" label="Ranks" active={location.pathname === '/leaderboard'} />
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

          {user && <NotificationBell />}

          {user && (
            <Avatar
              to={authorPath}
              name={user.displayName}
              src={user.avatarUrl}
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

          {user && <NotificationBell />}

          {user && (
            <Avatar
              to={authorPath}
              name={user.displayName}
              src={user.avatarUrl}
              active={location.pathname === authorPath}
            />
          )}

          <button
            className="tap-target"
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
          <MobileLink to="/featured" label="Featured" active={location.pathname === '/featured'} />
          <MobileLink to="/games" label="Story Games" active={location.pathname === '/games'} />
          <MobileLink to="/contests" label="Contests" active={location.pathname.startsWith('/contests')} />
          <MobileLink to="/leaderboard" label="Ranks" active={location.pathname === '/leaderboard'} />
          {user ? (
            <>
              <MobileLink to="/create" label="Write" active={location.pathname === '/create'} />
              <MobileLink to="/my-stories" label="My stories" active={location.pathname === '/my-stories'} />
              <MobileLink to="/achievements" label="Badges" active={location.pathname === '/achievements'} />
              {user.role === 'admin' && (
                <MobileLink to="/admin" label="Admin" active={location.pathname === '/admin'} />
              )}
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
        className="ct-icon-btn tap-target"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
      >
        <ThemeIcon theme={theme} />
      </button>

      <button
        className="ct-icon-btn tap-target"
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={enabled ? 'Mute sound' : 'Enable sound'}
        title={enabled ? 'Sound on' : 'Sound off'}
      >
        <SoundIcon on={enabled} />
      </button>
    </>
  )
}

function Avatar({ to, name, src, active }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <Link
      to={to}
      title={name}
      aria-label={`${name} — profile`}
      className="font-story nav-avatar tap-target"
      data-active={active || undefined}
    >
      {src ? <img src={avatarSrc(src)} alt="" /> : initial}
    </Link>
  )
}

const joinButtonStyle = {
  fontSize: '12px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--on-gold)',
  background: 'var(--gold-solid)',
  padding: '8px 18px',
  borderRadius: '4px',
  textDecoration: 'none',
  fontWeight: 600,
}

// The primary write action: a gold-outlined chip that fills on hover, so it
// reads as the one thing to do without shouting like a filled CTA.
const writeButtonStyle = (active) => ({
  fontSize: '12px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: active ? 'var(--on-gold)' : 'var(--gold)',
  background: active ? 'var(--gold-solid)' : 'transparent',
  border: '1px solid rgba(var(--gold-rgb),0.55)',
  padding: '7px 16px',
  borderRadius: '4px',
  textDecoration: 'none',
  transition: 'background 0.2s ease, color 0.2s ease',
})

const dropdownStyle = {
  position: 'absolute',
  top: 'calc(100% + 12px)',
  right: 0,
  minWidth: '170px',
  padding: '8px',
  background: 'var(--ink-soft)',
  border: '1px solid rgba(var(--gold-rgb),0.18)',
  borderRadius: '8px',
  boxShadow: 'var(--card-shadow)',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  zIndex: 60,
}

const dropdownItemStyle = (active) => ({
  display: 'block',
  fontSize: '12px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: active ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta70))',
  textDecoration: 'none',
  padding: '9px 12px',
  borderRadius: '4px',
  transition: 'background 0.15s ease, color 0.15s ease',
})

function DropdownLink({ to, label, active }) {
  return (
    <Link to={to} className="nav-dropdown__item" data-active={active || undefined}>
      {label}
    </Link>
  )
}

function Caret({ open }) {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
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
