import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAudio } from '../audio/AudioProvider'

// Plays the same warm "welcome" tune on every screen. Renders nothing.
export default function RouteMusic() {
  const { pathname } = useLocation()
  const { playBed } = useAudio()

  useEffect(() => {
    playBed('home')
  }, [pathname, playBed])

  return null
}
