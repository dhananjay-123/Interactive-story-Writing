const Notification = require('../models/Notification')

// Fire-and-forget social notifications. Mirrors the achievements emitter: a
// failure here must never break the request that triggered it (posting a comment
// must not fail because a notification couldn't be written), so everything is
// wrapped and the promise is intentionally not awaited by callers.
//
// `app` is the Express app; the realtime layer registers a live pusher on it via
// app.set('notify', { push(userId, notification) }). When a recipient has an open
// socket the notification arrives instantly; either way it's persisted for the tray.
const emit = (app, recipientIds, payload) => {
  const ids = [...new Set((recipientIds || []).filter(Boolean))]
  if (!ids.length) return

  ;(async () => {
    try {
      const pusher = app.get('notify')
      for (const userId of ids) {
        const notification = await Notification.create({ userId, ...payload })
        if (notification) pusher?.push(userId, notification)
      }
    } catch (err) {
      console.error(`[notify] emit(${payload?.type}) failed:`, err.message)
    }
  })()
}

module.exports = { emit }
