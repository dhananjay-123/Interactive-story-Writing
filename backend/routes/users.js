const router = require('express').Router()
const User = require('../models/User')
const Story = require('../models/Story')
const Follow = require('../models/Follow')
const { requireAuth, optionalAuth } = require('../middleware/auth')

// GET /api/users/:username — public author profile with their published works.
// optionalAuth so a signed-in viewer also learns whether they follow this author.
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findByUsername(req.params.username)
    if (!user) return res.status(404).json({ message: 'Author not found' })

    const [stories, counts, following] = await Promise.all([
      Story.findByAuthorId(user._id, req.user ? req.user._id : null),
      Follow.counts(user._id),
      req.user ? Follow.isFollowing(req.user._id, user._id) : false,
    ])

    res.json({
      author: {
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        joinedAt: user.createdAt,
      },
      stories,
      followers: counts.followers,
      following: counts.following,
      isFollowing: following,
      isSelf: req.user ? req.user._id === user._id : false,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/users/:username/followers — public list of an author's followers.
router.get('/:username/followers', async (req, res) => {
  try {
    const user = await User.findByUsername(req.params.username)
    if (!user) return res.status(404).json({ message: 'Author not found' })
    res.json(await Follow.listFollowers(user._id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/users/:username/following — public list of who an author follows.
router.get('/:username/following', async (req, res) => {
  try {
    const user = await User.findByUsername(req.params.username)
    if (!user) return res.status(404).json({ message: 'Author not found' })
    res.json(await Follow.listFollowing(user._id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/users/:username/follow — follow this author (sign-in required).
router.post('/:username/follow', requireAuth, async (req, res) => {
  try {
    const target = await User.findByUsername(req.params.username)
    if (!target) return res.status(404).json({ message: 'Author not found' })
    if (target._id === req.user._id) {
      return res.status(400).json({ message: "You can't follow yourself." })
    }
    await Follow.follow(req.user._id, target._id)
    const counts = await Follow.counts(target._id)
    res.json({ isFollowing: true, followers: counts.followers })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/users/:username/follow — unfollow this author (sign-in required).
router.delete('/:username/follow', requireAuth, async (req, res) => {
  try {
    const target = await User.findByUsername(req.params.username)
    if (!target) return res.status(404).json({ message: 'Author not found' })
    await Follow.unfollow(req.user._id, target._id)
    const counts = await Follow.counts(target._id)
    res.json({ isFollowing: false, followers: counts.followers })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
