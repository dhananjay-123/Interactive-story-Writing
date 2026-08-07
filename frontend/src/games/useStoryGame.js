import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api/client'

// All the state a Story Game needs while someone is reading, kept out of the
// reader so the reader stays a reader. Returns `null` game for the overwhelming
// majority of stories, which carry no challenge — every piece of interface below
// this hook checks that first and renders nothing.
//
// The reader never fetches clues: they arrive on the reading-progress save that
// already happens on every move (`applyProgress`), so the challenge costs the
// reading experience exactly one extra request per story — the initial load.
export function useStoryGame(storyId, { userId, isAuthor }) {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  // Clues the last move turned up. Shown as one quiet line, then gone.
  const [clueNews, setClueNews] = useState(null)
  // Set when a passage or an answer just closed the case, so the reader gets
  // their result without having to go looking for it.
  const [resolved, setResolved] = useState(false)

  // Every fetch claims a generation; a response whose generation has been
  // superseded is dropped. That's what stops a slow reply for the story someone
  // just left from overwriting the notebook for the one they're reading now.
  const genRef = useRef(0)
  // The passage `openAt` has already reported, so a re-render can't report it twice.
  const openedRef = useRef(null)

  const load = useCallback(async () => {
    const gen = ++genRef.current
    try {
      const { data } = await api.get(`/api/games/${storyId}`)
      if (gen !== genRef.current) return
      // 204 — no game on this story. Axios gives back an empty string.
      setGame(data && typeof data === 'object' ? data : null)
    } catch {
      // A challenge that won't load must never cost anyone their story.
      if (gen === genRef.current) setGame(null)
    } finally {
      if (gen === genRef.current) setLoading(false)
    }
  }, [storyId])

  useEffect(() => {
    setLoading(true)
    setGame(null)
    setClueNews(null)
    setResolved(false)
    openedRef.current = null
    load()
    // No cleanup: `load` claims its own generation, so switching stories already
    // invalidates whatever was in flight for the previous one.
  }, [storyId, userId, load])

  // Fold in what the progress save reported. Cheap and synchronous for the
  // whisper; the notebook itself refreshes behind it.
  const applyProgress = useCallback(
    (payload) => {
      if (!payload) return
      if (payload.found?.length) setClueNews({ at: Date.now(), clues: payload.found })
      if (payload.completed) setResolved(true)
      if (payload.found?.length || payload.completed || payload.justRevealed) load()
    },
    [load]
  )

  const dismissClueNews = useCallback(() => setClueNews(null), [])

  // The opening passage is the one arrival nobody *moves* to, so the
  // reading-progress save never sees it and a clue planted there would be
  // unreachable. Called once when the reader lands, before they've gone
  // anywhere. Fire-and-forget, like everything else on this path.
  const openAt = useCallback(
    (nodeId) => {
      if (!nodeId || !userId || openedRef.current === nodeId) return
      openedRef.current = nodeId
      api
        .post(`/api/games/${storyId}/open`, { nodeId })
        .then(({ data }) => applyProgress(data?.game))
        .catch(() => {})
    },
    [storyId, userId, applyProgress]
  )

  // Submit an answer. Returns { correct } so the panel can respond immediately;
  // a miss carries nothing else, by design.
  const accuse = useCallback(
    async (answer) => {
      const { data } = await api.post(`/api/games/${storyId}/accuse`, { answer })
      await load()
      if (data.correct) setResolved(true)
      return data
    },
    [storyId, load]
  )

  // The reader's own notes. Fire-and-forget: a failed save must not eat what they
  // typed, so the local copy stays put and the panel keeps showing it.
  const saveNotes = useCallback(
    (notes) => {
      setGame((g) => (g ? { ...g, notes } : g))
      return api.put(`/api/games/${storyId}/notes`, { notes }).catch(() => {})
    },
    [storyId]
  )

  return {
    // An author reading their own case already knows the answer; the challenge
    // stands down for them rather than pretending otherwise.
    game: isAuthor ? null : game,
    loading,
    clueNews,
    dismissClueNews,
    resolved,
    openAt,
    accuse,
    saveNotes,
    refresh: load,
    applyProgress,
  }
}
