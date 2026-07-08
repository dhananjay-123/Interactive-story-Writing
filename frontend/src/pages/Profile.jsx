import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import StoryCard from '../components/StoryCard'
import { useAuth } from '../context/AuthContext'
import { uploadImage, deleteImages, publicIdFromUrl } from '../api/uploads'

export default function Profile() {
  const { username } = useParams()
  const { user, updateUser } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const fileRef = useRef(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    api
      .get(`/api/users/${username}`)
      .then((r) => setData(r.data))
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [username])

  const isOwnProfile = user && user.username.toLowerCase() === username.toLowerCase()

  if (loading) {
    return (
      <Centered>
        <p style={{ color: 'rgba(var(--text-rgb),var(--ta30))', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Loading…
        </p>
      </Centered>
    )
  }

  if (notFound || !data) {
    return (
      <Centered>
        <p className="font-story" style={{ fontSize: '22px', color: 'rgba(var(--text-rgb),var(--ta60))', fontStyle: 'italic', marginBottom: '20px' }}>
          No author by that name.
        </p>
        <Link to="/stories" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Back to the library →
        </Link>
      </Centered>
    )
  }

  const { author, stories } = data
  const joined = new Date(author.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const applyAvatar = (url) => {
    setData((d) => ({ ...d, author: { ...d.author, avatarUrl: url } }))
    updateUser({ avatarUrl: url })
  }

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingAvatar(true)
    setAvatarError('')
    let uploaded
    try {
      uploaded = await uploadImage(file)
    } catch (err) {
      setAvatarError(err.response?.data?.message || err.message || 'That image could not be uploaded.')
      setUploadingAvatar(false)
      return
    }
    try {
      await api.put('/api/auth/me/avatar', { avatarUrl: uploaded.url })
      const old = author.avatarUrl
      applyAvatar(uploaded.url)
      const oldId = publicIdFromUrl(old) // clean up the picture we just replaced
      if (oldId) deleteImages([oldId])
    } catch (err) {
      if (uploaded.publicId) deleteImages([uploaded.publicId]) // drop the orphan we couldn't save
      setAvatarError(err.response?.data?.message || 'Could not save your picture.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const removeAvatar = async () => {
    setAvatarError('')
    const old = author.avatarUrl
    try {
      await api.put('/api/auth/me/avatar', { avatarUrl: null })
      applyAvatar(null)
      const oldId = publicIdFromUrl(old)
      if (oldId) deleteImages([oldId])
    } catch {
      setAvatarError('Could not remove your picture.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
        {/* Author header */}
        <div className="animate-fadeUp" style={{ marginBottom: '48px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '14px', opacity: 0.7 }}>
            Author
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                className="font-story"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '1px solid rgba(var(--gold-rgb),0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  color: 'var(--gold)',
                }}
              >
                {author.avatarUrl ? (
                  <img src={author.avatarUrl} alt={author.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  author.displayName.charAt(0).toUpperCase()
                )}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => !uploadingAvatar && fileRef.current?.click()}
                  title={author.avatarUrl ? 'Change photo' : 'Add a photo'}
                  aria-label={author.avatarUrl ? 'Change photo' : 'Add a photo'}
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--gold)',
                    color: 'var(--on-gold)',
                    border: '2px solid var(--ink)',
                    cursor: uploadingAvatar ? 'default' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {uploadingAvatar ? <Spinner /> : <CameraIcon />}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
            </div>
            <div>
              <h1 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                {author.displayName}
              </h1>
              <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '4px' }}>
                @{author.username} · Joined {joined}
              </p>
              {isOwnProfile && author.avatarUrl && (
                <button
                  onClick={removeAvatar}
                  style={{ marginTop: '6px', background: 'none', border: 'none', color: 'rgba(var(--text-rgb),var(--ta35))', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--crimson)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta35))')}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
          {avatarError && <p style={{ fontSize: '12px', color: 'var(--crimson)', marginTop: '10px' }}>{avatarError}</p>}

          {author.bio && (
            <p style={{ fontSize: '16px', color: 'rgba(var(--text-rgb),var(--ta60))', lineHeight: 1.7, maxWidth: '620px', marginTop: '24px' }}>
              {author.bio}
            </p>
          )}
        </div>

        {/* Published works */}
        <div className="animate-fadeUp delay-100" style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '24px' }}>
          <h2 className="font-story" style={{ fontSize: '20px', fontWeight: 400, color: 'var(--parchment)' }}>
            Published works
          </h2>
          <span style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta30))' }}>
            {stories.length}
          </span>
        </div>

        {stories.length === 0 ? (
          <div style={{ padding: '48px 0' }}>
            <p style={{ color: 'rgba(var(--text-rgb),var(--ta40))', fontSize: '15px', marginBottom: isOwnProfile ? '20px' : 0 }}>
              {isOwnProfile ? "You haven't published a story yet." : 'No published stories yet.'}
            </p>
            {isOwnProfile && (
              <Link
                to="/create"
                style={{
                  display: 'inline-block',
                  padding: '12px 28px',
                  background: 'var(--gold)',
                  color: 'var(--on-gold)',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  borderRadius: '3px',
                }}
              >
                Write your first story
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {stories.map((story, i) => (
              <StoryCard key={story._id} story={story} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Centered({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
      {children}
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function Spinner() {
  return (
    <span
      style={{
        width: '11px',
        height: '11px',
        border: '2px solid rgba(26,26,46,0.3)',
        borderTopColor: 'var(--on-gold)',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'ct-spin 0.7s linear infinite',
      }}
    />
  )
}
