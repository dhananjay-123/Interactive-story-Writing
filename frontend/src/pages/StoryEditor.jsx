import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import BranchComposer from '../components/BranchComposer'
import RichTextEditor, { textToDoc } from '../components/RichTextEditor'
import { inputStyle, labelStyle, focusBorder, blurBorder } from '../components/authStyles'
import SoundscapePanel from '../components/SoundscapePanel'
import ReaderPaths from '../components/ReaderPaths'
import ConnectingLoader from '../components/ConnectingLoader'
import CollaboratorsPanel from '../components/CollaboratorsPanel'
import { useStoryCollab } from '../realtime/useStoryCollab'

export default function StoryEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [story, setStory] = useState(null)
  const [nodeMap, setNodeMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [collapsed, setCollapsed] = useState(() => new Set())
  const [showPaths, setShowPaths] = useState(false) // reader analytics, fetched on demand
  const [activeEdit, setActiveEdit] = useState(null) // nodeId
  const [activeCompose, setActiveCompose] = useState(null) // `${parentId}:${choiceIndex}`

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/nodes/story/${id}/tree`)
      const map = {}
      for (const n of data.nodes) map[n._id] = n
      setStory(data.story)
      setNodeMap(map)
    } catch {
      setError('not-found')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Edit gate — the owner, or a collaborator the owner invited. `canEdit` comes
  // from the tree endpoint; fall back to the owner check if an older backend
  // didn't send it, so the owner is never locked out of their own map.
  const canEdit = story ? (story.canEdit ?? (user && story.authorId === user._id)) : false
  const isOwner = Boolean(story && user && story.authorId === user._id)

  useEffect(() => {
    if (authLoading || loading) return
    if (!user) {
      navigate('/login', { replace: true, state: { from: `/story/${id}/edit` } })
    } else if (story && !canEdit) {
      navigate(`/story/${id}`, { replace: true })
    }
  }, [authLoading, loading, user, story, canEdit, id, navigate])

  const toggleCollapse = (nodeId) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId)
      return next
    })

  const afterMutation = async () => {
    setActiveEdit(null)
    setActiveCompose(null)
    await load()
  }

  // Live collaboration: reload the tree when a co-author changes it (skipping
  // our own writes, which already refreshed), and track presence + soft locks.
  const onRemoteChange = useCallback(
    (meta) => {
      if (meta?.by && user && meta.by === user._id) return
      load()
    },
    [user, load]
  )
  const { presence, locks, connected, lockPassage, unlockPassage } = useStoryCollab(
    id,
    canEdit,
    onRemoteChange
  )

  // Claim a passage before opening its editor; refuse if a co-author holds it.
  const beginEdit = async (nodeId) => {
    const res = await lockPassage(nodeId)
    if (!res.ok) {
      window.alert(`${res.by || 'A co-author'} is editing this passage right now.`)
      return
    }
    setActiveCompose(null)
    setActiveEdit(nodeId)
  }
  const endEdit = (nodeId) => {
    if (nodeId) unlockPassage(nodeId)
    setActiveEdit(null)
  }

  if (loading || authLoading) {
    return <ConnectingLoader message="Opening the story map" />
  }
  if (error || !story || !story.rootNodeId) {
    return (
      <Screen>
        <p className="font-story" style={{ fontSize: '22px', fontStyle: 'italic', color: 'rgba(var(--text-rgb),var(--ta60))', marginBottom: '18px' }}>
          This story could not be found.
        </p>
        <Link to="/stories" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Back to the library →
        </Link>
      </Screen>
    )
  }

  const total = Object.keys(nodeMap).length
  const endings = Object.values(nodeMap).filter((n) => n.choices.length === 0).length
  const openPaths = Object.values(nodeMap).reduce(
    (sum, n) => sum + n.choices.filter((c) => !c.nextNodeId).length,
    0
  )

  const ctx = {
    nodeMap,
    collapsed,
    toggleCollapse,
    activeEdit,
    setActiveEdit,
    activeCompose,
    setActiveCompose,
    storyId: story._id,
    rootId: story.rootNodeId,
    onReload: afterMutation,
    reloadTree: load,
    // Collaboration
    locks,
    myId: user?._id,
    beginEdit,
    endEdit,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '90px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px 120px' }}>
        {/* Header */}
        <div className="animate-fadeUp" style={{ marginBottom: '32px' }}>
          <button onClick={() => navigate(`/story/${id}`)} style={backLinkStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta35))')}
          >
            ← Read this story
          </button>
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', margin: '28px 0 12px', opacity: 0.7 }}>
            Story map
          </p>
          <h1 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            {story.title}
          </h1>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '14px' }}>
            <Stat label="passages" value={total} />
            <Stat label="endings" value={endings} />
            <Stat label="open paths" value={openPaths} accent={openPaths > 0} />
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))', lineHeight: 1.6, marginTop: '18px', maxWidth: '560px' }}>
            Every choice can branch into its own passage, as deep as you like. Expand a branch to keep writing,
            edit any passage, or prune a path you don’t want.
          </p>

          {/* Who else is writing this right now. */}
          <PresenceBar presence={presence} myId={user?._id} connected={connected} />
        </div>

        {/* Co-authors — owner invites, everyone sees the team. */}
        <CollaboratorsPanel storyId={story._id} isOwner={isOwner} />

        {/* Soundscape picker */}
        <SoundscapePanel story={story} onChange={(next) => setStory((s) => ({ ...s, ambience: next }))} />

        {/* Reader paths — which way people actually went. */}
        <div style={{ margin: '0 0 36px', padding: '20px 22px', border: '1px solid rgba(var(--panel-rgb),var(--pa08))', borderRadius: '8px', background: 'rgba(var(--panel-rgb),var(--pa02))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h2 className="font-story" style={{ fontSize: '18px', fontWeight: 400, color: 'var(--parchment)' }}>
                Reader paths
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '4px' }}>
                Which choice readers took at each fork. Your own reading isn’t counted.
              </p>
            </div>
            <button
              onClick={() => setShowPaths((v) => !v)}
              style={{ background: 'none', border: '1px solid rgba(var(--panel-rgb),var(--pa12))', color: 'rgba(var(--text-rgb),var(--ta60))', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', letterSpacing: '0.05em', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {showPaths ? 'Hide' : 'Show'}
            </button>
          </div>
          {showPaths && (
            <div className="animate-fadeUp" style={{ marginTop: '22px' }}>
              <ReaderPaths storyId={id} />
            </div>
          )}
        </div>

        {/* The tree */}
        <TreeNode nodeId={story.rootNodeId} parentNodeId={null} choiceIndex={null} depth={0} ctx={ctx} />
      </div>
    </div>
  )
}

/* ── One passage in the tree, with its choices and nested children ── */
function TreeNode({ nodeId, parentNodeId, choiceIndex, depth, ctx }) {
  const node = ctx.nodeMap[nodeId]
  if (!node) return null

  const isRoot = nodeId === ctx.rootId
  const isEnding = node.choices.length === 0
  const isCollapsed = ctx.collapsed.has(nodeId)
  const editing = ctx.activeEdit === nodeId
  const hasChildren = node.choices.some((c) => c.nextNodeId)
  const lock = ctx.locks?.[nodeId]
  const lockedByOther = lock && lock.userId !== ctx.myId

  return (
    <div style={{ marginBottom: '10px' }}>
      <div
        style={{
          background: isRoot ? 'rgba(var(--gold-rgb),0.06)' : 'rgba(var(--panel-rgb),var(--pa03))',
          border: `1px solid ${isRoot ? 'rgba(var(--gold-rgb),0.3)' : 'rgba(var(--panel-rgb),var(--pa10))'}`,
          borderRadius: '8px',
          padding: '16px 18px',
        }}
      >
        {/* Row: badges + controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Badge tone={isRoot ? 'gold' : isEnding ? 'crimson' : 'muted'}>
              {isRoot ? 'Opening' : isEnding ? 'Ending' : 'Passage'}
            </Badge>
            {hasChildren && (
              <button onClick={() => ctx.toggleCollapse(nodeId)} style={miniBtn}>
                {isCollapsed ? '▸ expand' : '▾ collapse'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            {lockedByOther ? (
              <LockPill name={lock.displayName} />
            ) : (
              <>
                {!editing && (
                  <button onClick={() => ctx.beginEdit(nodeId)} style={miniBtn}>
                    ✎ edit
                  </button>
                )}
                {!isRoot && !editing && (
                  <DeleteBranchButton nodeId={nodeId} parentNodeId={parentNodeId} choiceIndex={choiceIndex} ctx={ctx} />
                )}
              </>
            )}
          </div>
        </div>

        {editing ? (
          <NodeEditor node={node} ctx={ctx} />
        ) : (
          <p className="font-story" style={{ fontSize: '15px', lineHeight: 1.6, color: 'rgba(var(--text-rgb),var(--ta82))', whiteSpace: 'pre-wrap' }}>
            {snippet(node.text) || '(an image or embed, no text)'}
          </p>
        )}
      </div>

      {/* Choices + nested children */}
      {!editing && !isCollapsed && node.choices.length > 0 && (
        <div style={{ marginLeft: '18px', marginTop: '8px', paddingLeft: '20px', borderLeft: '1px solid rgba(var(--gold-rgb),0.2)' }}>
          {node.choices.map((choice, i) => {
            const composeKey = `${nodeId}:${i}`
            const composing = ctx.activeCompose === composeKey
            return (
              <div key={i} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                  <span className="font-story" style={{ color: 'var(--gold)', opacity: 0.75, fontSize: '14px' }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta70))', lineHeight: 1.5 }}>
                    {choice.text}
                  </span>
                </div>

                {choice.nextNodeId ? (
                  <TreeNode nodeId={choice.nextNodeId} parentNodeId={nodeId} choiceIndex={i} depth={depth + 1} ctx={ctx} />
                ) : composing ? (
                  <div style={{ background: 'rgba(var(--panel-rgb),var(--pa03))', border: '1px solid rgba(var(--gold-rgb),0.2)', borderRadius: '8px', padding: '16px 18px' }}>
                    <BranchComposer
                      storyId={ctx.storyId}
                      parentNodeId={nodeId}
                      choiceIndex={i}
                      choiceText={choice.text}
                      compact
                      onCancel={() => ctx.setActiveCompose(null)}
                      onDone={ctx.onReload}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { ctx.setActiveEdit(null); ctx.setActiveCompose(composeKey) }}
                    style={{
                      background: 'none',
                      border: '1px dashed rgba(var(--gold-rgb),0.35)',
                      color: 'var(--gold)',
                      fontSize: '11px',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      padding: '8px 14px',
                      borderRadius: '4px',
                    }}
                  >
                    ＋ Write this branch
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Edit an existing passage's text + choice labels ── */
function NodeEditor({ node, ctx }) {
  const [editor, setEditor] = useState(null)
  const [empty, setEmpty] = useState(!node.text && !node.content)
  const [choices, setChoices] = useState(node.choices.map((c) => ({ ...c })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const editorControls = useRef(null)

  const cancel = () => {
    editorControls.current?.discard()
    ctx.endEdit(node._id)
  }

  const setChoiceText = (i, v) =>
    setChoices((cs) => cs.map((c, idx) => (idx === i ? { ...c, text: v } : c)))
  const addChoice = () =>
    setChoices((cs) => (cs.length >= 4 ? cs : [...cs, { text: '', nextNodeId: null }]))
  const removeChoice = (i) => setChoices((cs) => cs.filter((_, idx) => idx !== i))

  const canSave = editor && !empty && choices.every((c) => c.text.trim()) && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      await api.put(`/api/nodes/${node._id}`, {
        text: editor.getText().trim(),
        content: editor.getJSON(),
        choices: choices.map((c) => ({ text: c.text.trim(), nextNodeId: c.nextNodeId ?? null })),
      })
      ctx.endEdit(node._id) // release the soft lock, then refresh the tree
      await ctx.reloadTree()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save.')
      setSaving(false)
    }
  }

  return (
    <div className="animate-fadeIn">
      <label style={labelStyle}>Passage</label>
      <RichTextEditor
        initialContent={node.content || textToDoc(node.text)}
        minHeight="140px"
        onEditor={setEditor}
        onUpdate={(ed) => setEmpty(ed.isEmpty)}
        controlsRef={editorControls}
      />

      <div style={{ marginTop: '18px' }}>
        <label style={labelStyle}>Choices</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {choices.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="font-story" style={{ color: 'var(--gold)', opacity: 0.7, minWidth: '18px' }}>
                {String.fromCharCode(65 + i)}.
              </span>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={c.text}
                onChange={(e) => setChoiceText(i, e.target.value)}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              {c.nextNodeId ? (
                <span title="This choice already leads somewhere — delete that branch to remove it"
                  style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta35))', whiteSpace: 'nowrap' }}>
                  linked
                </span>
              ) : (
                <button onClick={() => removeChoice(i)} aria-label="Remove choice"
                  style={{ background: 'none', border: 'none', color: 'rgba(var(--text-rgb),var(--ta30))', cursor: 'pointer', fontSize: '18px' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--crimson)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta30))')}
                >×</button>
              )}
            </div>
          ))}
        </div>
        {choices.length < 4 && (
          <button onClick={addChoice}
            style={{ marginTop: '10px', background: 'none', border: '1px dashed rgba(var(--panel-rgb),var(--pa15))', color: 'rgba(var(--text-rgb),var(--ta40))', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }}
          >+ Add choice</button>
        )}
        <p style={{ fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta30))', marginTop: '8px' }}>
          No choices makes this an ending.
        </p>
      </div>

      {error && <p style={{ fontSize: '13px', color: 'var(--crimson)', marginTop: '14px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '20px' }}>
        <button onClick={save} disabled={!canSave}
          style={{ padding: '10px 24px', background: 'var(--gold-solid)', color: 'var(--on-gold)', border: 'none', fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', borderRadius: '4px', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5 }}
        >
          {saving ? 'Saving…' : 'Save passage'}
        </button>
        <button onClick={cancel} style={backLinkStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta60))')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta35))')}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function DeleteBranchButton({ nodeId, parentNodeId, choiceIndex, ctx }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const del = async () => {
    setBusy(true)
    try {
      await api.delete(`/api/nodes/${nodeId}`, { data: { parentNodeId, choiceIndex } })
      await ctx.onReload()
    } catch {
      setBusy(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <span style={{ display: 'inline-flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta50))' }}>Delete this & everything under it?</span>
        <button onClick={del} disabled={busy} style={{ ...miniBtn, color: 'var(--crimson)' }}>{busy ? '…' : 'yes'}</button>
        <button onClick={() => setConfirming(false)} style={miniBtn}>no</button>
      </span>
    )
  }
  return (
    <button onClick={() => setConfirming(true)} style={{ ...miniBtn, color: 'rgba(var(--text-rgb),var(--ta40))' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--crimson)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta40))')}
    >
      ⌫ delete branch
    </button>
  )
}

/* ── collaboration pieces ── */

// The co-authors currently in the editor. Silent when it's just you.
function PresenceBar({ presence, myId, connected }) {
  const others = (presence || []).filter((p) => p.userId !== myId)
  if (!connected && others.length === 0) return null

  const initials = (name) => (name || '?').charAt(0).toUpperCase()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: connected ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta35))' }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: connected ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta30))', boxShadow: connected ? '0 0 0 3px rgba(var(--gold-rgb),0.15)' : 'none' }} />
        Live
      </span>
      {others.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex' }}>
            {others.slice(0, 5).map((p, i) => (
              <span
                key={p.userId}
                title={p.displayName}
                className="font-story"
                style={{ width: '26px', height: '26px', marginLeft: i === 0 ? 0 : '-8px', borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--gold)', background: 'var(--ink)', border: '1px solid rgba(var(--gold-rgb),0.45)' }}
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials(p.displayName)
                )}
              </span>
            ))}
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta45))' }}>
            {others.length === 1 ? `${others[0].displayName} is here` : `${others.length} co-authors here`}
          </span>
        </div>
      ) : (
        <span style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>
          Only you right now
        </span>
      )}
    </div>
  )
}

// Shown in place of the edit control when a co-author holds the passage.
function LockPill({ name }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(var(--gold-rgb),0.85)', border: '1px solid rgba(var(--gold-rgb),0.3)', borderRadius: '4px', padding: '3px 8px' }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="9" rx="1.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      {name} editing
    </span>
  )
}

/* ── small pieces ── */
function Badge({ children, tone }) {
  const tones = {
    gold: { color: 'var(--gold)', border: 'rgba(var(--gold-rgb),0.4)' },
    crimson: { color: '#c45a6e', border: 'rgba(139,26,46,0.45)' },
    muted: { color: 'rgba(var(--text-rgb),var(--ta50))', border: 'rgba(var(--panel-rgb),var(--pa18))' },
  }
  const t = tones[tone] || tones.muted
  return (
    <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: t.color, border: `1px solid ${t.border}`, borderRadius: '4px', padding: '3px 8px' }}>
      {children}
    </span>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
      <span className="font-story" style={{ fontSize: '20px', color: accent ? 'var(--gold)' : 'var(--parchment)' }}>{value}</span>
      <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))' }}>{label}</span>
    </div>
  )
}

function Screen({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ color: 'rgba(var(--text-rgb),var(--ta40))', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{children}</div>
    </div>
  )
}

const snippet = (text) => {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 180 ? clean.slice(0, 180) + '…' : clean
}

const miniBtn = {
  background: 'none',
  border: 'none',
  color: 'rgba(var(--text-rgb),var(--ta50))',
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'inherit',
  transition: 'color 0.2s ease',
}

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
