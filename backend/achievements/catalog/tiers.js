// Progression ladders. Each track is an ordered list of tiers; a user sits on the
// highest tier whose `min` their driving metric has reached. Tiers only ever move
// up automatically (a demotion would need a manual admin reset), so the ladder is
// evaluated as "highest satisfied rung".
//
// Adding or reshaping a tier is a config edit — the evaluator reads these arrays.

const AUTHOR_TRACK = {
  id: 'author',
  label: 'Author',
  metric: 'stories_published',
  tiers: [
    { id: 'story_seed',        label: 'Story Seed',        level: 0, min: 0,  icon: 'seedling' },
    { id: 'storyteller',       label: 'Storyteller',       level: 1, min: 1,  icon: 'quill' },
    { id: 'novelist',          label: 'Novelist',          level: 2, min: 3,  icon: 'book' },
    { id: 'world_builder',     label: 'World Builder',      level: 3, min: 6,  icon: 'globe' },
    { id: 'master_author',     label: 'Master Author',     level: 4, min: 12, icon: 'crown' },
    { id: 'legendary_creator', label: 'Legendary Creator', level: 5, min: 25, icon: 'trophy' },
    { id: 'mythic_author',     label: 'Mythic Author',     level: 6, min: 50, icon: 'phoenix' },
  ],
}

const READER_TRACK = {
  id: 'reader',
  label: 'Reader',
  metric: 'stories_completed',
  tiers: [
    { id: 'curious_reader',  label: 'Curious Reader', level: 0, min: 0,   icon: 'eye' },
    { id: 'explorer',        label: 'Explorer',       level: 1, min: 1,   icon: 'compass' },
    { id: 'adventurer',      label: 'Adventurer',     level: 2, min: 5,   icon: 'flame' },
    { id: 'path_finder',     label: 'Path Finder',    level: 3, min: 15,  icon: 'map' },
    { id: 'completionist',   label: 'Completionist',  level: 4, min: 30,  icon: 'star' },
    { id: 'story_master',    label: 'Story Master',   level: 5, min: 60,  icon: 'chalice' },
    { id: 'living_legend',   label: 'Living Legend',  level: 6, min: 120, icon: 'infinity' },
  ],
}

const TRACKS = [AUTHOR_TRACK, READER_TRACK]
const byId = new Map(TRACKS.map((t) => [t.id, t]))

module.exports = { TRACKS, AUTHOR_TRACK, READER_TRACK, track: (id) => byId.get(id) }
