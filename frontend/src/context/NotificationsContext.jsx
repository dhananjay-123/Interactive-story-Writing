import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api, { getToken } from '../api/client'
import { useAuth } from './AuthContext'

// socket.io is imported where it is used rather than at the top of the file.
// This provider is mounted for everyone, so a static import put 41 kB of socket
// client in the first-load bundle of every signed-out reader — none of whom can
// receive a notification.

// In dev, VITE_API_URL is empty → same-origin socket proxied by Vite. In prod it
// holds the backend origin. Same convention as the collaboration socket.
const SOCKET_URL = import.meta.env.VITE_API_URL || undefined

const Ctx = createContext({ items: [], unseen: 0, markAllSeen: () => {}, reload: () => {} })
export const useNotifications = () => useContext(Ctx)

// Holds the signed-in user's social notifications. New ones arrive live over a
// socket the moment they happen; a fetch on login and a light re-check on every
// navigation cover anything that landed while the socket was down.
export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const [items, setItems] = useState([])
  const [unseen, setUnseen] = useState(0)
  const socketRef = useRef(null)

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get('/api/notifications')
      setItems(data.items || [])
      setUnseen(data.unseen || 0)
    } catch {
      /* stay quiet — the bell just shows what it last knew */
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setItems([])
      setUnseen(0)
      return
    }
    reload()

    const token = getToken()
    if (!token) return

    // `cancelled` guards the gap between the effect being torn down and the
    // socket module arriving — signing out mid-load must not leave a live
    // connection behind.
    let cancelled = false
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return
      const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] })
      socketRef.current = socket
      socket.on('notification', (n) => {
        setItems((list) => [n, ...list.filter((x) => x._id !== n._id)].slice(0, 30))
        setUnseen((c) => c + 1)
      })
    }).catch(() => {
      /* the bell falls back to the per-navigation resync below */
    })

    return () => {
      cancelled = true
      const socket = socketRef.current
      if (socket) {
        socket.removeAllListeners()
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [user, reload])

  // Fallback resync on navigation — cheap, and catches anything the socket missed.
  useEffect(() => {
    if (user) reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const markAllSeen = useCallback(async () => {
    if (!unseen) return
    setUnseen(0)
    setItems((list) => list.map((n) => ({ ...n, seen: true })))
    try {
      await api.post('/api/notifications/seen', {})
    } catch {
      /* the optimistic update stands; next reload reconciles */
    }
  }, [unseen])

  return (
    <Ctx.Provider value={{ items, unseen, markAllSeen, reload }}>{children}</Ctx.Provider>
  )
}
