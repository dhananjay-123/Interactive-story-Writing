import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { getToken } from '../api/client'

// In dev, VITE_API_URL is empty → connect to the same origin and let Vite proxy
// /socket.io through to the backend (see vite.config.js). In production it holds
// the deployed backend origin, so the socket connects there directly.
const SOCKET_URL = import.meta.env.VITE_API_URL || undefined

const indexLocks = (list = []) => {
  const m = {}
  for (const l of list) m[l.nodeId] = { userId: l.userId, displayName: l.displayName }
  return m
}

// Live collaboration for one story's editor: who else is here (presence), which
// passages they're editing (locks), and a nudge to reload when the tree changes.
export function useStoryCollab(storyId, enabled, onChanged) {
  const [presence, setPresence] = useState([])
  const [locks, setLocks] = useState({})
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const onChangedRef = useRef(onChanged)
  onChangedRef.current = onChanged

  useEffect(() => {
    if (!enabled || !storyId) return
    const token = getToken()
    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    const join = () => {
      socket.emit('story:join', { storyId }, (res) => {
        if (res?.ok) {
          setConnected(true)
          setPresence(res.presence || [])
          setLocks(indexLocks(res.locks))
        }
      })
    }

    socket.on('connect', join)
    socket.on('presence:update', (list) => setPresence(list || []))
    socket.on('locks:update', (list) => setLocks(indexLocks(list)))
    socket.on('story:changed', (meta) => onChangedRef.current?.(meta))
    socket.on('disconnect', () => setConnected(false))

    return () => {
      socket.emit('story:leave', { storyId })
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
      setPresence([])
      setLocks({})
    }
  }, [enabled, storyId])

  // Claim a passage for editing. Resolves { ok } — and stays permissive when the
  // socket isn't connected (solo editing must never be blocked by realtime being
  // down; with nobody else present there's nothing to clash with anyway).
  const lockPassage = useCallback(
    (nodeId) =>
      new Promise((resolve) => {
        const s = socketRef.current
        if (!s || !s.connected) return resolve({ ok: true })
        let settled = false
        const done = (r) => { if (!settled) { settled = true; resolve(r) } }
        s.emit('passage:lock', { storyId, nodeId }, (res) => done(res || { ok: true }))
        // Don't hang the UI if the ack is lost.
        setTimeout(() => done({ ok: true }), 1500)
      }),
    [storyId]
  )

  const unlockPassage = useCallback(
    (nodeId) => socketRef.current?.emit('passage:unlock', { storyId, nodeId }),
    [storyId]
  )

  return { presence, locks, connected, lockPassage, unlockPassage }
}
