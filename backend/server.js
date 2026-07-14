// Load env first — db.js reads DATABASE_URL the moment it is required.
require('dotenv').config()

const express = require('express')
const http = require('http')
const cors = require('cors')
const { initDb } = require('./db')
const { initRealtime } = require('./realtime')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/users', require('./routes/users'))
app.use('/api/stories', require('./routes/stories'))
app.use('/api/nodes', require('./routes/nodes'))
app.use('/api/uploads', require('./routes/uploads'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/contests', require('./routes/contests'))
app.use('/api/achievements', require('./routes/achievements'))
// Mounted before /api/admin so the more specific achievements path wins the match.
app.use('/api/admin/achievements', require('./routes/adminAchievements'))
app.use('/api/admin', require('./routes/admin'))

// One HTTP server shared by Express and socket.io (live collaboration).
const server = http.createServer(app)
initRealtime(server, app)

const start = async () => {
  try {
    await initDb()
    console.log('PostgreSQL connected')
  } catch (err) {
    console.error('DB connection error:', err.message)
  }

  server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

start()
