import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ChoiceCard from '../components/ChoiceCard'
import BranchComposer from '../components/BranchComposer'
import ConnectingLoader from '../components/ConnectingLoader'
import EngagementBar from '../components/EngagementBar'
import CommentSection from '../components/CommentSection'
import NarrationPanel from '../components/NarrationPanel'
import ReportButton from '../components/ReportButton'
import { TagRow } from '../components/TagRow'
import { generateHTML } from '@tiptap/core'
import { editorExtensions } from '../components/RichTextEditor'
import { useAudio } from '../audio/AudioProvider'
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

  // When the author decides to write an unwritten branch.
  const [composing, setComposing] = useState(null) // { choiceIndex, choiceText }
  // When a reader hits a branch the author hasn't written yet.
  const [deadEnd, setDeadEnd] = useState('')
  // A saved bookmark, offered rather than forced — landing somewhere you don't
  // recognise is worse than one extra click.
  const [resumable, setResumable] = useState(null) // { currentNodeId, path, passagesIn }
  const [resuming, setResuming] = useState(false)

  const isAuthor = Boolean(user && story && user._id === story.authorId)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setResumable(null)
    ;(async () => {
      let rootId = null
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
        rootId = s.rootNodeId
        const { data: root } = await api.get(`/api/nodes/${s.rootNodeId}`)
        if (!active) return
        setNode(root)
        setHistory([])
      } catch {
        if (active) setError('not-found')
        return
      } finally {
        if (active) setLoading(false)
      }

      // A saved bookmark is optional — a failed lookup (stale token, a sleepy
      // backend dropping its first query) must never turn a readable story into
      // "could not be found". So it lives outside the load above, in its own guard.
      if (user && rootId) {
        try {
          const { data: p } = await api.get(`/api/stories/${id}/progress`)
          if (active && p && p.currentNodeId && p.currentNodeId !== rootId) {
            setResumable({ ...p, passagesIn: (p.path?.length || 0) + 1 })
          }
        } catch {
          /* no bookmark, or it couldn't be fetched — start from the top */
        }
      }
    })()
    return () => {
      active = false
    }
  }, [id, user])

  // Reaching an ending may unlock reading/completion badges server-side. Give the
  // fire-and-forget award a moment to land, then pull any new unlocks so the
  // celebration shows without the reader having to navigate away.
  useEffect(() => {
    if (!user || !node || node.choices.length > 0) return
    const t = setTimeout(() => refreshAchievements(), 1500)
    return () => clearTimeout(t)
  }, [user, node, refreshAchievements])

  // Fire-and-forget: a failed bookmark save must never interrupt the reading.
  const saveProgress = useCallback(
    (currentNodeId, trail) => {
      if (!user) return
      api
        .put(`/api/stories/${id}/progress`, {
          currentNodeId,
          path: trail.map((n) => n._id),
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
    if (!resumable) return
    setResuming(true)
    try {
      const { data: tree } = await api.get(`/api/nodes/story/${id}/tree`)
      const byId = new Map(tree.nodes.map((n) => [n._id, n]))
      const target = byId.get(resumable.currentNodeId)
      if (!target) throw new Error('gone')
      // Passages deleted since the bookmark was written simply drop out of the trail.
      const trail = (resumable.path || []).map((nid) => byId.get(nid)).filter(Boolean)
      setHistory(trail)
      setNode(target)
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

  const goToNode = (next) => {
    setTransitioning(true)
    setDeadEnd('')
    setComposing(null)
    const trail = [...history, node]
    saveProgress(next._id, trail)
    setTimeout(() => {
      setHistory(trail)
      setNode(next)
      setTransitioning(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 260)
  }

  const handleChoice = async (choice, index) => {
    if (transitioning) return
    setDeadEnd('')
    if (choice.nextNodeId) {
      try {
        const { data: next } = await api.get(`/api/nodes/${choice.nextNodeId}`)
        recordChoice(node._id, index)
        goToNode(next)
      } catch {
        setError('load-failed')
      }
      return
    }
    // Unwritten path.
    if (isAuthor) {
      setComposing({ choiceIndex: index, choiceText: choice.text })
    } else {
      setDeadEnd(choice.text)
    }
  }

  const handleComposed = (newNode) => {
    // Reflect the new link on the current node so a later "go back" shows it written.
    const updated = {
      ...node,
      choices: node.choices.map((c, i) =>
        i === composing.choiceIndex ? { ...c, nextNodeId: newNode._id } : c
      ),
    }
    setNode(updated)
    goToNode(newNode)
  }

  const handleBack = () => {
    if (!history.length || transitioning) return
    setTransitioning(true)
    setDeadEnd('')
    setComposing(null)
    const target = history[history.length - 1]
    const trail = history.slice(0, -1)
    saveProgress(target._id, trail)
    setTimeout(() => {
      setNode(target)
      setHistory(trail)
      setTransitioning(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 260)
  }

  const handleRestart = async () => {
    if (!story?.rootNodeId) return
    const { data: root } = await api.get(`/api/nodes/${story.rootNodeId}`)
    // Starting over discards the bookmark rather than parking it on the opening.
    if (user) api.delete(`/api/stories/${id}/progress`).catch(() => {})
    setTransitioning(true)
    setDeadEnd('')
    setComposing(null)
    setTimeout(() => {
      setNode(root)
      setHistory([])
      setTransitioning(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 260)
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
              {story.author} — {history.length + 1} {history.length === 0 ? 'passage' : 'passages'} in
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
            <EndingBlock isAuthor={isAuthor} onRestart={handleRestart} />
          ) : (
            <div>
              <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(var(--gold-rgb),0.5)', marginBottom: '20px' }}>
                What do you do?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {node.choices.map((choice, i) => (
                  <ChoiceCard
                    key={i}
                    choice={choice}
                    index={i}
                    onSelect={handleChoice}
                    disabled={transitioning}
                    unwritten={isAuthor && !choice.nextNodeId}
                  />
                ))}
              </div>

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
              <button onClick={handleBack} style={backLinkStyle}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta60))')}
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

function EndingBlock({ isAuthor, onRestart }) {
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
        <button onClick={onRestart}
          style={{ padding: '12px 28px', background: 'transparent', border: '1px solid rgba(var(--gold-rgb),0.4)', color: 'var(--gold)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '3px', transition: 'background 0.2s ease' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--gold-rgb),0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Start over
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
          <p key={i} className="animate-fadeUp" style={{ animationDelay: `${i * 0.05}s`, fontSize: '17px', lineHeight: 1.85, color: 'rgba(var(--text-rgb),var(--ta82))', marginBottom: '20px', fontStyle: isItalic ? 'italic' : 'normal' }}>
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
  background: 'var(--gold)',
  color: 'var(--on-gold)',
  border: 'none',
  borderRadius: '3px',
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
