const Collaborator = require('../models/Collaborator')

// Who may extend or change a story's passages: the owner, or anyone the owner
// has invited as a collaborator. Story-level settings (delete, publish, tags,
// ambience, managing collaborators) stay owner-only and are checked separately.
const canEditStory = async (story, userId) => {
  if (!story || !userId) return false
  if (story.authorId === userId) return true
  return Collaborator.isCollaborator(story._id, userId)
}

module.exports = { canEditStory }
