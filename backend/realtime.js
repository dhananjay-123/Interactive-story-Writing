const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const User = require('./models/User')
const Story = require('./models/Story')
const { canEditStory } = require('./utils/permissions')

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const room = (storyId) => `story:${storyId}`

// Live collaboration state lives in memory. That's fine on a single instance
// (the free Render tier runs one) — presence and locks are ephemeral by nature
// and rebuild themselves as people rejoin. Horizontal scaling would want the
// socket.io Redis adapter; out of scope here.
//
// presence: storyId -> Map<socketId, {userId, username, displayName, avatarUrl}>
// locks:    storyId -> Map<nodeId,  {userId, displayName}>
const presence = new Map()
const locks = new Map()

const presenceFor = (storyId) => {
  if (!presence.has(storyId)) presence.set(storyId, new Map())
  return presence.get(storyId)
}
const locksFor = (storyId) => {
  if (!locks.has(storyId)) locks.set(storyId, new Map())
  return locks.get(storyId)
}

function initRealtime(server, app) {
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  })

  // Identify the socket's user from the JWT it connects with. The socket only
  // drives presence/locks/notifications — every actual write still goes through
  // the REST routes, which re-check permissions — so a light check is enough.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('unauthorized'))
      const payload = jwt.verify(token, SECRET)
      const user = await User.findById(payload.sub)
      if (!user || user.banned) return next(new Error('unauthorized'))
      socket.user = {
        userId: user._id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl || null,
      }
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  // The distinct people currently in a story's room (a person may have several tabs).
  const presenceList = (storyId) => {
    const byUser = new Map()
    for (const p of presenceFor(storyId).values()) byUser.set(p.userId, p)
    return [...byUser.values()]
  }
  const lockList = (storyId) =>
    [...locksFor(storyId).entries()].map(([nodeId, l]) => ({ nodeId, ...l }))

  const emitPresence = (storyId) =>
    io.to(room(storyId)).emit('presence:update', presenceList(storyId))
  const emitLocks = (storyId) =>
    io.to(room(storyId)).emit('locks:update', lockList(storyId))

  // Drop everything a socket was holding in one story (on leave or disconnect).
  const cleanup = (socket, storyId) => {
    const p = presenceFor(storyId)
    p.delete(socket.id)
    // Release any locks this socket held that no other tab of theirs is keeping.
    const stillHere = new Set([...p.values()].map((u) => u.userId))
    const l = locksFor(storyId)
    let changed = false
    for (const [nodeId, lock] of l) {
      if (lock.socketId === socket.id && !hasOtherLockHolder(storyId, socket.id, lock.userId)) {
        l.delete(nodeId)
        changed = true
      }
    }
    // A lock held by a user with no sockets left is stale — clear it too.
    for (const [nodeId, lock] of l) {
      if (!stillHere.has(lock.userId)) { l.delete(nodeId); changed = true }
    }
    emitPresence(storyId)
    if (changed) emitLocks(storyId)
  }

  const hasOtherLockHolder = (storyId, socketId, userId) => {
    for (const u of presenceFor(storyId).values()) {
      if (u.userId === userId && u.socketId && u.socketId !== socketId) return true
    }
    return false
  }

  io.on('connection', (socket) => {
    // Track which stories this socket has joined, for disconnect cleanup.
    socket.joined = new Set()

    // Every socket also joins a private room keyed by its user, so the REST
    // routes can push social notifications to all of a person's open tabs.
    socket.join(`user:${socket.user.userId}`)

    socket.on('story:join', async ({ storyId } = {}, cb) => {
      try {
        if (!storyId) return cb?.({ ok: false })
        const story = await Story.findById(storyId)
        if (!story || !(await canEditStory(story, socket.user.userId))) {
          return cb?.({ ok: false })
        }
        socket.join(room(storyId))
        socket.joined.add(storyId)
        presenceFor(storyId).set(socket.id, { ...socket.user, socketId: socket.id })
        emitPresence(storyId)
        cb?.({ ok: true, presence: presenceList(storyId), locks: lockList(storyId) })
      } catch {
        cb?.({ ok: false })
      }
    })

    socket.on('story:leave', ({ storyId } = {}) => {
      if (!storyId || !socket.joined.has(storyId)) return
      socket.leave(room(storyId))
      socket.joined.delete(storyId)
      cleanup(socket, storyId)
    })

    // Soft lock: claim a passage for editing so others don't clobber it. Denied
    // if someone else already holds it; refreshing your own hold is fine.
    socket.on('passage:lock', ({ storyId, nodeId } = {}, cb) => {
      if (!storyId || !nodeId || !socket.joined.has(storyId)) return cb?.({ ok: false })
      const l = locksFor(storyId)
      const held = l.get(nodeId)
      if (held && held.userId !== socket.user.userId) return cb?.({ ok: false, by: held.displayName })
      l.set(nodeId, { userId: socket.user.userId, displayName: socket.user.displayName, socketId: socket.id })
      emitLocks(storyId)
      cb?.({ ok: true })
    })

    socket.on('passage:unlock', ({ storyId, nodeId } = {}) => {
      if (!storyId || !nodeId) return
      const l = locksFor(storyId)
      const held = l.get(nodeId)
      if (held && held.userId === socket.user.userId) {
        l.delete(nodeId)
        emitLocks(storyId)
      }
    })

    socket.on('disconnect', () => {
      for (const storyId of socket.joined) cleanup(socket, storyId)
    })
  })

  // Let the REST routes tell a room something changed (a passage was written,
  // edited, or deleted) so everyone reloads the tree, and release a deleted
  // passage's lock.
  app.set('collab', {
    notifyChanged(storyId, meta = {}) {
      io.to(room(storyId)).emit('story:changed', meta)
    },
    releaseNodeLock(storyId, nodeId) {
      const l = locksFor(storyId)
      if (l.delete(nodeId)) io.to(room(storyId)).emit('locks:update', lockList(storyId))
    },
  })

  // Live delivery for social notifications (see notify/index.js). Lands in every
  // open tab of the recipient; if they're offline it was still persisted.
  app.set('notify', {
    push(userId, notification) {
      io.to(`user:${userId}`).emit('notification', notification)
    },
  })

  return io
}

module.exports = { initRealtime }
