import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'inkwell_theme'

// Resolve the initial theme: saved choice → system preference → dark.
function initialTheme() {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme)

  // Reflect the theme on the root element so the CSS variables switch.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    // Cross-fade the colour change: flag the root so the temporary global
    // transition kicks in, flip the theme, then drop the flag once it settles.
    const root = document.documentElement
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!calm) {
      root.classList.add('theme-animating')
      window.clearTimeout(toggleTheme._t)
      toggleTheme._t = window.setTimeout(() => root.classList.remove('theme-animating'), 500)
    }
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
