// A story's byline: the owner plus any co-authors, in a natural list.
// "Meera" · "Meera & Alba" · "Meera, Alba & Dev".
export function authorNames(story) {
  if (!story) return 'Anonymous'
  const names = [story.author, ...(story.collaborators || []).map((c) => c.displayName)]
    .filter(Boolean)
  const seen = new Set()
  const unique = names.filter((n) => (seen.has(n) ? false : seen.add(n)))
  if (unique.length === 0) return 'Anonymous'
  if (unique.length === 1) return unique[0]
  return `${unique.slice(0, -1).join(', ')} & ${unique[unique.length - 1]}`
}

export function hasCoAuthors(story) {
  return (story?.collaborators || []).length > 0
}
