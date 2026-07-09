// One place for the password rule, so register / change / admin-reset can't drift.
const MIN_LENGTH = 8

// Returns an error message, or null when the password is acceptable.
const validatePassword = (password) => {
  if (typeof password !== 'string' || !password) return 'Password is required.'
  if (password.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters.`
  if (password.length > 200) return 'Password is too long.'
  return null
}

module.exports = { validatePassword, MIN_LENGTH }
