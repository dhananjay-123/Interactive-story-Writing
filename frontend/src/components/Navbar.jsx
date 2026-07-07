import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const links = [
    { to: '/stories', label: 'Browse' },
    { to: '/create', label: 'Write' },
  ]

  return (
    <nav
      style={{
        background: scrolled ? 'rgba(26,26,46,0.95)' : 'transparent',
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

        <div className="flex items-center gap-8">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-sm tracking-widest uppercase transition-colors duration-200"
              style={{
                color: location.pathname === to ? 'var(--gold)' : 'rgba(250,248,243,0.65)',
                textDecoration: 'none',
                letterSpacing: '0.12em',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
