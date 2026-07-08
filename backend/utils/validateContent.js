// Whitelist check for rich passage content (Tiptap JSON). Only the node and
// mark types our editor produces are allowed, image sources must come from
// our Cloudinary account, and embeds must be YouTube. Anything else is
// rejected before it reaches the database.

const NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
  'horizontalRule',
  'hardBreak',
  'image',
  'youtube',
])

const MARK_TYPES = new Set(['bold', 'italic', 'strike', 'underline', 'link'])

const YOUTUBE_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'music.youtube.com',
])

const isCloudinaryUrl = (src) =>
  typeof src === 'string' && src.startsWith('https://res.cloudinary.com/')

const isYoutubeUrl = (src) => {
  if (typeof src !== 'string') return false
  try {
    const url = new URL(src)
    return url.protocol === 'https:' && YOUTUBE_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

const isHttpUrl = (href) => typeof href === 'string' && /^https?:\/\//i.test(href)

const validNode = (node) => {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false
  if (!NODE_TYPES.has(node.type)) return false
  if (node.type === 'image' && !isCloudinaryUrl(node.attrs?.src)) return false
  if (node.type === 'youtube' && !isYoutubeUrl(node.attrs?.src)) return false
  if (node.marks) {
    if (!Array.isArray(node.marks)) return false
    for (const mark of node.marks) {
      if (!mark || !MARK_TYPES.has(mark.type)) return false
      if (mark.type === 'link' && !isHttpUrl(mark.attrs?.href)) return false
    }
  }
  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) return false
    if (!node.content.every(validNode)) return false
  }
  return true
}

// Validates a whole document, with a size cap so nobody stores megabytes of JSON.
const validateContent = (content) => {
  if (!content || content.type !== 'doc') return false
  if (JSON.stringify(content).length > 100_000) return false
  return validNode(content)
}

module.exports = { validateContent }
