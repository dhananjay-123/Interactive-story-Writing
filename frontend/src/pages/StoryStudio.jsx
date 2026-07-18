import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ConnectingLoader from '../components/ConnectingLoader'
import StoryGraph from '../components/studio/StoryGraph'
import StoryValidator from '../components/studio/StoryValidator'
import StoryDebugger from '../components/studio/StoryDebugger'
import StoryHeatmap from '../components/studio/StoryHeatmap'
import { analyzeStory } from '../utils/storyGraph'

const TABS = [
  { id: 'graph', label: 'Graph', hint: 'The whole branching tree at a glance' },
  { id: 'validate', label: 'Validate', hint: 'Dead ends, orphans and unreachable passages' },
  { id: 'debug', label: 'Debug', hint: 'Step through any path like a reader' },
  { id: 'heat', label: 'Heatmap', hint: 'Where readers actually go' },
]

export default function StoryStudio() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [story, setStory] = useState(null)
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [tab, setTab] = useState('graph')
  const [selectedId, setSelectedId] = useState(null)
  const [path, setPath] = useState([])
  const [breakpoints, setBreakpoints] = useState(() => new Set())

  // Reader analytics for the heatmap — fetched once, the first time the tab opens.
  // Owner/admin only server-side; a collaborator gets a 403 and a gentle notice.
  const [heat, setHeat] = useState({ data: null, loading: false, error: '' })

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/nodes/story/${id}/tree`)
      setStory(data.story)
      setNodes(data.nodes)
      setPath((p) => (p.length ? p : data.story.rootNodeId ? [data.story.rootNodeId] : []))
    } catch {
      setError('not-found')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const canEdit = story ? (story.canEdit ?? (user && story.authorId === user._id)) : false

  useEffect(() => {
    if (authLoading || loading) return
    if (!user) navigate('/login', { replace: true, state: { from: `/story/${id}/studio` } })
    else if (story && !canEdit) navigate(`/story/${id}`, { replace: true })
  }, [authLoading, loading, user, story, canEdit, id, navigate])

  const analysis = useMemo(
    () => analyzeStory(nodes, story?.rootNodeId),
    [nodes, story?.rootNodeId]
  )

  const toggleBreakpoint = (nodeId) =>
    setBreakpoints((prev) => {
      const next = new Set(prev)
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId)
      return next
    })

  // Keep the debugger's current node in sync with graph selection when debugging.
  const debugCurrent = path[path.length - 1]
  useEffect(() => {
    if (tab === 'debug' && debugCurrent) setSelectedId(debugCurrent)
  }, [tab, debugCurrent])

  const issueNodes = useMemo(
    () => new Set(analysis.issues.map((i) => i.nodeId)),
    [analysis]
  )

  useEffect(() => {
    if (tab !== 'heat' || heat.data || heat.loading || heat.error) return
    setHeat({ data: null, loading: true, error: '' })
    api
      .get(`/api/stories/${id}/analytics`)
      .then(({ data }) => setHeat({ data, loading: false, error: '' }))
      .catch((err) =>
        setHeat({ data: null, loading: false, error: err.response?.status === 403 ? 'forbidden' : 'failed' })
      )
  }, [tab, heat, id])

  // Fold the analytics payload into the graph's overlays: how many readers
  // arrived at each passage, and how many walked each written branch.
  const { traffic, edgeTraffic } = useMemo(() => {
    if (!heat.data) return { traffic: null, edgeTraffic: null }
    const traffic = {}
    const edgeTraffic = {}
    for (const p of heat.data.passages) {
      // Departures approximate presence for forks nobody has left yet.
      traffic[p.nodeId] = Math.max(traffic[p.nodeId] || 0, p.totalTaken)
      for (const c of p.choices) {
        if (!c.nextNodeId) continue
        edgeTraffic[`${p.nodeId}:${c.index}`] = c.count
        traffic[c.nextNodeId] = (traffic[c.nextNodeId] || 0) + c.count
      }
    }
    return { traffic, edgeTraffic }
  }, [heat.data])

  if (loading || authLoading) return <ConnectingLoader message="Opening the studio" />
  if (error || !story) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'grid', placeItems: 'center', padding: '0 24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p className="font-story" style={{ fontSize: '20px', fontStyle: 'italic', color: 'rgba(var(--text-rgb),var(--ta60))', marginBottom: '16px' }}>
            This story could not be found.
          </p>
          <Link to="/my-stories" style={linkStyle}>Back to your stories →</Link>
        </div>
      </div>
    )
  }

  const s = analysis.stats

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '90px' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 24px 120px' }}>
        {/* Header */}
        <div className="animate-fadeUp" style={{ marginBottom: '24px' }}>
          <button onClick={() => navigate(`/story/${id}/edit`)} style={backStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta35))')}
          >
            ← Back to the story map
          </button>
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', margin: '24px 0 10px', opacity: 0.7 }}>
            Story studio
          </p>
          <h1 className="font-story" style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 400, color: 'var(--parchment)' }}>
            {story.title}
          </h1>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '14px' }}>
            <Stat n={s.passages} label="passages" />
            <Stat n={s.reachableEndings} label="endings" />
            <Stat n={s.openPaths} label="open paths" accent={s.openPaths > 0} />
            <Stat n={s.maxDepth} label="max depth" />
            <Stat n={s.errors} label="errors" danger={s.errors > 0} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(var(--panel-rgb),var(--pa10))', marginBottom: '24px' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.hint}
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: '13px',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: tab === t.id ? 'var(--parchment)' : 'rgba(var(--text-rgb),var(--ta45))',
                borderBottom: `2px solid ${tab === t.id ? 'var(--gold)' : 'transparent'}`,
                marginBottom: '-1px',
              }}
            >
              {t.label}
              {t.id === 'validate' && (s.errors + s.warnings) > 0 && (
                <span style={{ marginLeft: '7px', fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: s.errors ? 'rgba(139,26,46,0.25)' : 'rgba(201,168,76,0.2)', color: s.errors ? '#d98a99' : '#d2a63f' }}>
                  {s.errors + s.warnings}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Two-column: graph + panel */}
        <div className="ct-studio-grid">
          <div>
            <StoryGraph
              analysis={analysis}
              rootId={story.rootNodeId}
              selectedId={selectedId}
              onSelect={(nid) => {
                setSelectedId(nid)
                if (tab === 'debug') {
                  const idx = path.indexOf(nid)
                  if (idx >= 0) setPath(path.slice(0, idx + 1))
                }
              }}
              activePath={tab === 'debug' ? path : null}
              issueNodes={tab === 'validate' ? issueNodes : null}
              traffic={tab === 'heat' ? traffic : null}
              edgeTraffic={tab === 'heat' ? edgeTraffic : null}
              height={560}
            />
            <p style={{ fontSize: '11.5px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '10px' }}>
              Scroll to zoom · drag to pan · click a passage to inspect it. Gold = opening · crimson = ending · dashed = orphaned.
            </p>
          </div>

          <div className="ct-studio-panel">
            {tab === 'graph' && (
              <NodeDetail analysis={analysis} rootId={story.rootNodeId} nodeId={selectedId} storyId={id} onDebug={(nid) => { setTab('debug'); setPath([story.rootNodeId, nid].filter(Boolean)) }} />
            )}
            {tab === 'validate' && (
              <StoryValidator analysis={analysis} selectedId={selectedId} onSelect={setSelectedId} />
            )}
            {tab === 'debug' && (
              <StoryDebugger
                analysis={analysis}
                rootId={story.rootNodeId}
                path={path.length ? path : story.rootNodeId ? [story.rootNodeId] : []}
                setPath={setPath}
                breakpoints={breakpoints}
                toggleBreakpoint={toggleBreakpoint}
              />
            )}
            {tab === 'heat' && (
              <StoryHeatmap
                data={heat.data}
                loading={heat.loading}
                error={heat.error}
                analysis={analysis}
                selectedId={selectedId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function NodeDetail({ analysis, rootId, nodeId, storyId, onDebug }) {
  const node = nodeId && analysis.map[nodeId]
  if (!node) {
    return (
      <div style={{ color: 'rgba(var(--text-rgb),var(--ta45))', fontSize: '13.5px', lineHeight: 1.7 }}>
        <p className="font-story" style={{ fontSize: '17px', color: 'var(--parchment)', marginBottom: '8px' }}>Inspect a passage</p>
        Click any box in the graph to see its text, its choices, and where each one leads.
      </div>
    )
  }
  const kind = node._id === rootId ? 'Opening' : node.choices.length === 0 ? 'Ending' : 'Passage'
  const reachable = analysis.reachable.has(node._id)
  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', border: '1px solid rgba(var(--gold-rgb),0.4)', borderRadius: 'var(--r-sm)', padding: '3px 8px' }}>{kind}</span>
        {!reachable && node._id !== rootId && (
          <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c45a6e', border: '1px solid rgba(139,26,46,0.45)', borderRadius: 'var(--r-sm)', padding: '3px 8px' }}>Orphaned</span>
        )}
      </div>
      <p className="font-story" style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(var(--text-rgb),var(--ta82))', whiteSpace: 'pre-wrap', marginBottom: '18px' }}>
        {node.text?.trim() || (node.content ? '(an image or embed, no text)' : '(empty passage)')}
      </p>

      <p style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.7, marginBottom: '10px' }}>
        Choices
      </p>
      {node.choices.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta50))', fontStyle: 'italic' }} className="font-story">This is an ending.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {node.choices.map((c, i) => (
            <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', fontSize: '13.5px' }}>
              <span className="font-story" style={{ color: 'var(--gold)', opacity: 0.8 }}>{String.fromCharCode(65 + i)}.</span>
              <span style={{ flex: 1, color: 'rgba(var(--text-rgb),var(--ta70))' }}>{c.text || <em style={{ color: 'rgba(var(--text-rgb),var(--ta40))' }}>(no label)</em>}</span>
              <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: c.nextNodeId ? 'rgba(var(--text-rgb),var(--ta40))' : '#c45a6e' }}>
                {c.nextNodeId ? 'leads on' : 'unwritten'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', gap: '16px', marginTop: '22px' }}>
        <button onClick={() => onDebug(node._id)} style={linkBtn}>Debug from here →</button>
        <Link to={`/story/${storyId}/edit`} style={linkBtn}>Edit in map →</Link>
      </div>
    </div>
  )
}

function Stat({ n, label, accent, danger }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
      <span className="font-story" style={{ fontSize: '19px', color: danger ? '#c45a6e' : accent ? 'var(--gold)' : 'var(--parchment)' }}>{n}</span>
      <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))' }}>{label}</span>
    </div>
  )
}

const linkStyle = { color: 'var(--gold)', textDecoration: 'none', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }
const linkBtn = { background: 'none', border: 'none', padding: 0, color: 'var(--gold)', fontSize: '12px', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }
const backStyle = { background: 'none', border: 'none', color: 'rgba(var(--text-rgb),var(--ta35))', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'color 0.2s ease' }
