const router = require('express').Router()
const User = require('../models/User')
const Story = require('../models/Story')

// GET /api/users/:username — public author profile with their published works.
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findByUsername(req.params.username)
    if (!user) return res.status(404).json({ message: 'Author not found' })

    const stories = await Story.findByAuthorId(user._id)
    res.json({
      author: {
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        joinedAt: user.createdAt,
      },
      stories,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
