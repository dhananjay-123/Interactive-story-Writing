import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ChoiceCard from '../components/ChoiceCard'
import BranchComposer from '../components/BranchComposer'
import ConnectingLoader from '../components/ConnectingLoader'
import EngagementBar from '../components/EngagementBar'
import CommentSection from '../components/CommentSection'
import NarrationPanel from '../components/NarrationPanel'
import EndingDiscovery from '../components/EndingDiscovery'
import WorldMap from '../components/WorldMap'
import ReportButton from '../components/ReportButton'
import { TagRow } from '../components/TagRow'
import { generateHTML } from '@tiptap/core'
import { editorExtensions } from '../components/RichTextEditor'
import { useAudio } from '../audio/AudioProvider'
import { authorNames } from '../utils/authors'
import { useAchievements } from '../components/achievements/AchievementsProvider'

export default function StoryReader() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playAmbience, stopAmbience } = useAudio()
  const { refresh: refreshAchievements } = useAchievements()

  const [story, setStory] = useState(null)
  const [node, setNode] = useState(null)
  const [history, setHistory] = useState([]) // stack of visited nodes
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  // The choice whose passage is being fetched. Kept separate from `transitioning`
  // so the card can respond the instant it's clicked, before the request lands.
  const [pendingChoice, setPendingChoice] = useState(null)
  // A passage that wouldn't load. Recoverable, so it's shown in place rather
  // than replacing the whole story with "could not be found".
  const [loadError, setLoadError] = useState('')

  // When the author decides to write an unwritten branch.
  const [composing, setComposing] = useState(null) // { choiceIndex, choiceText }
  // When a reader hits a branch the author hasn't written yet.
  const [deadEnd, setDeadEnd] = useState('')
  // A saved bookmark, offered rather than forced — landing somewhere you don't
  // recognise is worse than one extra click.
  const [resumable, setResumable] = useState(null) // { currentNodeId, path, passagesIn }
  const [resuming, setResuming] = useState(false)
  // Set when a progress save reports the reader just collected a new ending.
  const [endingNews, setEndingNews] = useState(null) // { isNew, nodeId }

  // Where the reader is, mirrored outside React state. Every handler reads the
  // position from here instead of from a closure: a click handler created three
  // renders ago would otherwise build its trail from a stale `history`/`node`
  // and quietly drop or repeat a passage.
  const posRef = useRef({ node: null, history: [] })
  // One move at a time, claimed synchronously on click — `transitioning` only
  // flips after the fetch resolves, far too late to stop a second click.
  const busyRef = useRef(false)
  // Cancels responses from a move that has since been superseded (the reader
  // went back, restarted, or opened a different story while it was in flight).
  const genRef = useRef(0)
  // The page-turn fade. Held so it can be cancelled instead of firing into a
  // story it no longer belongs to and leaving the reader stuck mid-transition.
  const timerRef = useRef(null)
  // Whether this sitting has moved off the opening passage yet.
  const startedRef = useRef(false)

  const isAuthor = Boolean(user && story && user._id === story.authorId)
  const userId = user?._id || null
  const rootNodeId = story?.rootNodeId || null

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }
  useEffect(() => clearTimer, [])

  const commit = useCallback((next) => {
    posRef.current = next
    setNode(next.node)
    setHistory(next.history)
  }, [])

  // The story and its opening passage. Keyed on the story alone: this used to
  // also depend on `user`, so the moment `/api/auth/me` came back — seconds
  // later on a backend waking from sleep — it re-ran and threw the reader back
  // to the opening passage they had already read past.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setLoadError('')
    setResumable(null)
    setComposing(null)
    setDeadEnd('')
    setEndingNews(null)
    setTransitioning(false)
    setPendingChoice(null)
    clearTimer()
    genRef.current++
    busyRef.current = false
    startedRef.current = false
    commit({ node: null, history: [] })
    ;(async () => {
      try {
        // The story and its opening passage are the only things reading truly
        // depends on. Fetch them first; anything else is a nicety layered on top.
        const { data: s } = await api.get(`/api/stories/${id}`)
        if (!active) return
        setStory(s)
        if (!s.rootNodeId) {
          // The story exists but has no opening passage yet (an abandoned draft).
          setError('empty')
          return
        }
        const { data: root } = await api.get(`/api/nodes/${s.rootNodeId}`)
        if (!active) return
        commit({ node: root, history: [] })
      } catch {
        if (active) setError('not-found')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id, commit])

  // A saved bookmark is optional — a failed lookup (stale token, a sleepy
  // backend dropping its first query) must never turn a readable story into
  // "could not be found", so it loads on its own. If it arrives after the
  // reader has already started moving, it's dropped: offering to restore a
  // place they've walked past is worse than not offering at all.
  useEffect(() => {
    if (!userId || !rootNodeId) return
    let active = true
    api
      .get(`/api/stories/${id}/progress`)
      .then(({ data: p }) => {
        if (!active || startedRef.current) return
        if (!p?.currentNodeId || p.currentNodeId === rootNodeId) return
        setResumable({ ...p, passagesIn: (p.path?.length || 0) + 1 })
      })
      .catch(() => {
        /* no bookmark, or it couldn't be fetched — start from the top */
      })
    return () => {
      active = false
    }
  }, [id, userId, rootNodeId])

  // The places this reading has passed through, in order. Built here rather than
  // inline in the render so the array keeps its identity between renders — the
  // map memoises on it, and a fresh literal every render defeated that.
  const mapTrail = useMemo(
    () =>
      [...history, node]
        .filter(Boolean)
        .map((n) => n.placeId)
        .filter(Boolean),
    [history, node]
  )

  // Where the reader is on the map. Authors pin a place to the passage where
  // the story arrives somewhere, not to every passage that happens there — so
  // an unpinned passage keeps the last place the path reached. Reading the
  // passage's own placeId meant the marker blinked out the moment you moved
  // past a pinned passage, and the map sat unchanged for the rest of the story.
  const currentPlaceId = mapTrail.length ? mapTrail[mapTrail.length - 1] : null

  // Reaching an ending may unlock reading/completion badges server-side. Give the
  // fire-and-forget award a moment to land, then pull any new unlocks so the
  // celebration shows without the reader having to navigate away.
  useEffect(() => {
    if (!user || !node || node.choices.length > 0) return
    const t = setTimeout(() => refreshAchievements(), 1500)
    return () => clearTimeout(t)
  }, [user, node, refreshAchievements])

  // Fire-and-forget: a failed bookmark save must never interrupt the reading.
  // The response does carry one thing worth keeping — whether this arrival
  // collected a brand-new ending.
  const saveProgress = useCallback(
    (currentNodeId, trail) => {
      if (!user) return
      api
        .put(`/api/stories/${id}/progress`, {
          currentNodeId,
          path: trail.map((n) => n._id),
        })
        .then(({ data }) => {
          if (data?.endingDiscovery) {
            setEndingNews({ ...data.endingDiscovery, nodeId: currentNodeId })
          }
        })
        .catch(() => {})
    },
    [user, id]
  )

  // The author walking their own draft would drown out real readers, so their
  // choices aren't counted.
  const recordChoice = useCallback(
    (fromNodeId, choiceIndex) => {
      if (isAuthor) return
      api.post(`/api/stories/${id}/choice`, { fromNodeId, choiceIndex }).catch(() => {})
    },
    [isAuthor, id]
  )

  // Rebuild the trail from the saved ids so "go back" still works after a reload.
  const handleResume = async () => {
    if (!resumable || busyRef.current) return
    setResuming(true)
    const gen = ++genRef.current
    try {
      const { data: tree } = await api.get(`/api/nodes/story/${id}/tree`)
      if (gen !== genRef.current) return
      const byId = new Map(tree.nodes.map((n) => [n._id, n]))
      const target = byId.get(resumable.currentNodeId)
      if (!target) throw new Error('gone')
      // Passages deleted since the bookmark was written simply drop out of the trail.
      const trail = (resumable.path || []).map((nid) => byId.get(nid)).filter(Boolean)
      startedRef.current = true
      commit({ node: target, history: trail })
      setResumable(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      // The passage is gone — forget the bookmark and start from the top.
      api.delete(`/api/stories/${id}/progress`).catch(() => {})
      setResumable(null)
    } finally {
      setResuming(false)
    }
  }

  const dismissResume = () => {
    setResumable(null)
    api.delete(`/api/stories/${id}/progress`).catch(() => {})
  }

  // Play the author's chosen soundscape while reading; silence it on the way out.
  useEffect(() => {
    if (story?.ambience) playAmbience(story.ambience)
    else stopAmbience()
    return () => stopAmbience()
  }, [story?.ambience, playAmbience, stopAmbience])

  // Land on a passage: fade out, swap, fade in. The caller owns `busyRef` from
  // the moment of the click; this releases it once the move has actually landed.
  const move = (next, trail, { save = true } = {}) => {
    startedRef.current = true
    busyRef.current = true
    setTransitioning(true)
    setDeadEnd('')
    setLoadError('')
    setComposing(null)
    setResumable(null)
    if (save) saveProgress(next._id, trail)
    clearTimer()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      commit({ node: next, history: trail })
      setTransitioning(false)
      setPendingChoice(null)
      busyRef.current = false
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 260)
  }

  const handleChoice = async (choice, index) => {
    if (busyRef.current) return
    setDeadEnd('')
    setLoadError('')

    // Unwritten path — nothing to fetch.
    if (!choice.nextNodeId) {
      if (isAuthor) setComposing({ choiceIndex: index, choiceText: choice.text })
      else setDeadEnd(choice.text)
      return
    }

    // Claim the move and mark the card before awaiting. The fetch can take
    // seconds against a backend waking from sleep, and a choice that looks
    // untouched for that long reads as a dead button — so people click again.
    busyRef.current = true
    setPendingChoice(index)
    const gen = ++genRef.current
    const from = posRef.current.node

    try {
      const { data: next } = await api.get(`/api/nodes/${choice.nextNodeId}`)
      if (gen !== genRef.current) return // superseded while in flight
      recordChoice(from._id, index)
      move(next, [...posRef.current.history, from])
    } catch {
      if (gen !== genRef.current) return
      busyRef.current = false
      setPendingChoice(null)
      setLoadError('That passage wouldn’t load. Check your connection and try again.')
    }
  }

  const handleComposed = (newNode) => {
    const from = posRef.current.node
    // Reflect the new link on the passage we're leaving so a later "go back"
    // shows it written rather than still offering to write it.
    const updated = {
      ...from,
      choices: from.choices.map((c, i) =>
        i === composing.choiceIndex ? { ...c, nextNodeId: newNode._id } : c
      ),
    }
    move(newNode, [...posRef.current.history, updated])
  }

  const handleBack = () => {
    if (busyRef.current) return
    const trail = posRef.current.history
    if (!trail.length) return
    genRef.current++ // abandon any choice still in flight
    move(trail[trail.length - 1], trail.slice(0, -1))
  }

  const handleRestart = async () => {
    if (busyRef.current || !story?.rootNodeId) return
    busyRef.current = true
    setLoadError('')
    const gen = ++genRef.current
    try {
      const { data: root } = await api.get(`/api/nodes/${story.rootNodeId}`)
      if (gen !== genRef.current) return
      // Starting over discards the bookmark rather than parking it on the opening.
      if (user) api.delete(`/api/stories/${id}/progress`).catch(() => {})
      move(root, [], { save: false })
    } catch {
      if (gen !== genRef.current) return
      busyRef.current = false
      setLoadError('Couldn’t reload the opening passage. Try again in a moment.')
    }
  }

  if (loading) {
    return <ConnectingLoader message="Fetching this story" />
  }

  if (error || !node) {
    return (
      <Screen>
        <p className="font-story" style={{ fontSize: '22px', color: 'rgba(var(--text-rgb),var(--ta60))', fontStyle: 'italic', marginBottom: '20px' }}>
          {error === 'empty'
            ? 'This story doesn’t have an opening passage yet.'
            : 'This story could not be found.'}
        </p>
        <Link to="/stories" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Back to the library →
        </Link>
      </Screen>
    )
  }

  const isEnding = node.choices.length === 0
  // A move is under way — either fetching the next passage or fading into it.
  const busy = transitioning || pendingChoice !== null

  // What the narrator reads: the passage (plain-text fallback is kept even for
  // rich passages), then the choices, so eyes-free readers hear their options.
  const narrationText = [
    node.text,
    isEnding
      ? 'The end.'
      : node.choices.length
        ? `Your choices are: ${node.choices.map((c, i) => `${i + 1}. ${c.text}`).join('. ')}.`
        : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '80px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 100px' }}>

        {/* Header */}
        {story && (
          <div className="animate-fadeIn mb-12">
            <button onClick={() => navigate('/stories')} style={backLinkStyle}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta35))')}
            >
              ← Back to library
            </button>
            <h1 className="font-story" style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em', marginBottom: '8px', marginTop: '32px' }}>
              {story.title}
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>
              {authorNames(story)} — {history.length + 1} {history.length === 0 ? 'passage' : 'passages'} in
              {isAuthor && <span style={{ color: 'var(--gold)' }}>  ·  your story</span>}
            </p>
            {isAuthor && (
              <Link to={`/story/${story._id}/edit`} style={{ display: 'inline-block', marginTop: '14px', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', textDecoration: 'none', borderBottom: '1px solid rgba(var(--gold-rgb),0.4)', paddingBottom: '2px' }}>
                ✦ Open story map
              </Link>
            )}

            {story.tags?.length > 0 && <TagRow tags={story.tags} style={{ marginTop: '18px' }} />}

            <EngagementBar story={story} />
          </div>
        )}

        {/* A bookmark from a previous sitting. */}
        {resumable && !composing && (
          <div
            className="animate-fadeUp"
            style={{ marginBottom: '32px', padding: '18px 20px', border: '1px solid rgba(var(--gold-rgb),0.28)', borderRadius: '4px', background: 'rgba(var(--gold-rgb),0.05)' }}
          >
            <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta70))', lineHeight: 1.6, marginBottom: '14px' }}>
              You left this story {resumable.passagesIn}{' '}
              {resumable.passagesIn === 1 ? 'passage' : 'passages'} in.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={handleResume} disabled={resuming} style={resumeButton(resuming)}>
                {resuming ? 'Finding your place…' : 'Continue reading'}
              </button>
              <button onClick={dismissResume} style={backLinkStyle}>
                Start from the beginning
              </button>
            </div>
          </div>
        )}

        {/* Progress crumbs */}
        {history.length > 0 && (
          <div className="animate-fadeIn" style={{ display: 'flex', gap: '4px', marginBottom: '32px', alignItems: 'center' }}>
            {history.map((_, i) => (
              <div key={i} style={{ width: i === history.length - 1 ? '20px' : '6px', height: '3px', background: 'var(--gold)', opacity: i === history.length - 1 ? 0.8 : 0.3, borderRadius: '2px', transition: 'all 0.3s ease' }} />
            ))}
            <div style={{ width: '6px', height: '3px', background: 'rgba(var(--panel-rgb),var(--pa15))', borderRadius: '2px' }} />
          </div>
        )}

        {/* Body */}
        <div style={{ opacity: transitioning ? 0 : 1, transform: transitioning ? 'translateY(12px)' : 'translateY(0)', transition: 'opacity 0.26s ease, transform 0.26s ease' }}>
          <NarrationPanel text={narrationText} nodeId={node._id} />

          <Passage node={node} />

          {/* The world map, lit as far as this reading has travelled. */}
          <WorldMap storyId={story._id} trail={mapTrail} currentPlaceId={currentPlaceId} />

          <Divider />

          {composing ? (
            <BranchComposer
              storyId={story._id}
              parentNodeId={node._id}
              choiceIndex={composing.choiceIndex}
              choiceText={composing.choiceText}
              onCancel={() => setComposing(null)}
              onDone={handleComposed}
            />
          ) : isEnding ? (
            <>
              <EndingBlock isAuthor={isAuthor} onRestart={handleRestart} busy={busy} />
              {loadError && (
                <p className="animate-fadeIn text-center" style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta55))', marginTop: '-12px', marginBottom: '24px' }}>
                  {loadError}
                </p>
              )}
              {!isAuthor && (
                <EndingDiscovery
                  storyId={story._id}
                  currentNodeId={node._id}
                  user={user}
                  news={endingNews}
                />
              )}
            </>
          ) : (
            <div>
              <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '20px' }}>
                What do you do?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {node.choices.map((choice, i) => (
                  <ChoiceCard
                    key={i}
                    choice={choice}
                    index={i}
                    onSelect={handleChoice}
                    disabled={busy}
                    pending={pendingChoice === i}
                    unwritten={isAuthor && !choice.nextNodeId}
                  />
                ))}
              </div>

              {loadError && (
                <div className="animate-fadeIn" style={{ marginTop: '20px', padding: '16px 20px', border: '1px solid rgba(139,26,46,0.35)', borderRadius: '4px' }}>
                  <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta65))', lineHeight: 1.6 }}>
                    {loadError}
                  </p>
                </div>
              )}

              {deadEnd && (
                <div className="animate-fadeIn" style={{ marginTop: '20px', padding: '16px 20px', border: '1px solid rgba(var(--gold-rgb),0.25)', borderRadius: '4px', background: 'rgba(var(--gold-rgb),0.05)' }}>
                  <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta65))', lineHeight: 1.6 }}>
                    The author hasn’t written where this path leads yet. Try another choice.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Go back */}
          {history.length > 0 && !composing && (
            <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(var(--panel-rgb),var(--pa06))' }}>
              <button onClick={handleBack} disabled={busy} style={{ ...backLinkStyle, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.4 : 1 }}
                onMouseEnter={(e) => { if (!busy) e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta60))' }}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta35))')}
              >
                ← Go back
              </button>
            </div>
          )}
        </div>

        {story && <ReportButton storyId={story._id} isAuthor={isAuthor} />}

        {story && <CommentSection storyId={story._id} storyAuthorId={story.authorId} />}
      </div>
    </div>
  )
}

function EndingBlock({ isAuthor, onRestart, busy }) {
  return (
    <div className="animate-fadeUp text-center" style={{ padding: '32px 0' }}>
      <div style={{ width: '40px', height: '1px', background: 'rgba(var(--gold-rgb),0.3)', margin: '0 auto 24px' }} />
      <p className="font-story" style={{ fontSize: '20px', color: 'rgba(var(--text-rgb),var(--ta55))', fontStyle: 'italic', marginBottom: '10px' }}>
        The End
      </p>
      {isAuthor && (
        <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta35))', marginBottom: '28px' }}>
          This passage has no choices, so it ends the story here.
        </p>
      )}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: isAuthor ? 0 : '24px' }}>
        <button onClick={onRestart} disabled={busy}
          style={{ padding: '12px 28px', background: 'transparent', border: '1px solid rgba(var(--gold-rgb),0.4)', color: 'var(--gold)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.55 : 1, borderRadius: '4px', transition: 'background 0.2s ease' }}
          onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = 'rgba(var(--gold-rgb),0.08)' }}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {busy ? 'Turning back…' : 'Start over'}
        </button>
      </div>
    </div>
  )
}

function Passage({ node }) {
  // Rich passages carry their content as Tiptap JSON, validated server-side,
  // so it can be rendered directly. Older passages fall back to plain text.
  if (node.content) {
    return (
      <div
        className="font-story passage-prose animate-fadeUp"
        style={{ marginBottom: '48px', fontSize: '17px', lineHeight: 1.85, color: 'rgba(var(--text-rgb),var(--ta82))' }}
        dangerouslySetInnerHTML={{ __html: generateHTML(node.content, editorExtensions) }}
      />
    )
  }

  const paragraphs = node.text.split('\n\n')
  return (
    <div className="font-story" style={{ marginBottom: '48px' }}>
      {paragraphs.map((para, i) => {
        const isItalic = para.startsWith('*') && para.endsWith('*') && !para.slice(1, -1).includes('*')
        const body = isItalic ? para.slice(1, -1) : para
        const parts = body.split(/(\*[^*]+\*)/g)
        return (
          <p key={i} className="animate-fadeUp" style={{ animationDelay: `${Math.min(i, 5) * 0.05}s`, fontSize: '17px', lineHeight: 1.85, color: 'rgba(var(--text-rgb),var(--ta82))', marginBottom: '20px', fontStyle: isItalic ? 'italic' : 'normal' }}>
            {parts.map((part, j) =>
              part.startsWith('*') && part.endsWith('*')
                ? <em key={j} style={{ color: 'var(--parchment)', fontStyle: 'italic' }}>{part.slice(1, -1)}</em>
                : part
            )}
          </p>
        )
      })}
    </div>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(var(--gold-rgb),0.15)' }} />
      <div style={{ width: '4px', height: '4px', background: 'rgba(var(--gold-rgb),0.4)', borderRadius: '50%' }} />
      <div style={{ flex: 1, height: '1px', background: 'rgba(var(--gold-rgb),0.15)' }} />
    </div>
  )
}

function Screen({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
      {children}
    </div>
  )
}

const resumeButton = (disabled) => ({
  padding: '10px 22px',
  background: 'var(--gold-solid)',
  color: 'var(--on-gold)',
  border: 'none',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  fontFamily: 'inherit',
})

const backLinkStyle = {
  background: 'none',
  border: 'none',
  color: 'rgba(var(--text-rgb),var(--ta35))',
  fontSize: '12px',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'inherit',
  transition: 'color 0.2s ease',
}
