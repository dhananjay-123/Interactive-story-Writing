// Load env first — db.js reads DATABASE_URL the moment it is required.
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { initDb } = require('./db')

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

const start = async () => {
  try {
    await initDb()
    console.log('PostgreSQL connected')
  } catch (err) {
    console.error('DB connection error:', err.message)
  }

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

start()
