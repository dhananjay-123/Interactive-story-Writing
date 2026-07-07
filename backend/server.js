const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { initDb } = require('./db')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

// Routes
app.use('/api/stories', require('./routes/stories'))
app.use('/api/nodes', require('./routes/nodes'))

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
