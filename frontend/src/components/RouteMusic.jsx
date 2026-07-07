import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAudio } from '../audio/AudioProvider'

// Picks the music bed from the current route: the welcome tune on the home
// screen, a calmer reading bed everywhere else. Renders nothing.
export default function RouteMusic() {
  const { pathname } = useLocation()
  const { playBed } = useAudio()

  useEffect(() => {
    playBed(pathname === '/' ? 'home' : 'reading')
  }, [pathname, playBed])

  return null
}
