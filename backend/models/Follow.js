const db = require('../db')

// Compact author card used in follower / following lists.
const mapCard = (row) =>
  row && {
    _id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || null,
    bio: row.bio || null,
  }

// Idempotent — following someone you already follow is a no-op.
const follow = async (followerId, followingId) => {
  await db.query(
    `INSERT INTO follows (follower_id, following_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [followerId, followingId]
  )
}

const unfollow = async (followerId, followingId) => {
  await db.query(
    'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  )
}

const isFollowing = async (followerId, followingId) => {
  if (!followerId) return false
  const { rows } = await db.query(
    'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  )
  return rows.length > 0
}

// { followers, following } counts for one user in a single round-trip.
const counts = async (userId) => {
  const { rows } = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM follows WHERE following_id = $1) AS followers,
       (SELECT COUNT(*) FROM follows WHERE follower_id  = $1) AS following`,
    [userId]
  )
  return { followers: Number(rows[0].followers), following: Number(rows[0].following) }
}

// Users who follow `userId`, newest first.
const listFollowers = async (userId) => {
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  )
  return rows.map(mapCard)
}

// Users `userId` follows, newest first.
const listFollowing = async (userId) => {
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio
     FROM follows f
     JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  )
  return rows.map(mapCard)
}

module.exports = { follow, unfollow, isFollowing, counts, listFollowers, listFollowing }
