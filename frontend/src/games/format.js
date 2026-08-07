// Shared formatting for Story Game surfaces, so the notebook, the score screen
// and the leaderboards all say time and rank the same way.

// "18 min", "1 h 04", "—" when the clock is still running or was never started.
export const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  const totalMinutes = Math.round(ms / 60000)
  if (totalMinutes < 1) return 'under a minute'
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours} h ${String(minutes).padStart(2, '0')}`
}

// How a clue is filed in the notebook. Kinds come from the server catalogue;
// anything unrecognised falls back to "clue" rather than disappearing.
export const CLUE_LABELS = {
  clue: 'Clue',
  evidence: 'Evidence',
  observation: 'Observation',
}

export const clueLabel = (kind) => CLUE_LABELS[kind] || CLUE_LABELS.clue
