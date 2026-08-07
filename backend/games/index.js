// Public façade for the Story Games subsystem. Routes and other modules import
// from here, not from the internals, so the surface stays small and stable.
//
//   onPassage(...)  — the one hook the reading engine calls. Fire-and-forget
//                     friendly: it never throws into the request that triggered
//                     it, and returns null for the overwhelming majority of
//                     stories, which carry no game at all.

const engine = require('./engine')
const store = require('./store')
const catalog = require('./catalog')
const scoring = require('./scoring')

module.exports = {
  // Reading
  onPassage: engine.onPassage,
  readerView: engine.readerView,
  accuse: engine.accuse,
  saveNotes: engine.saveNotes,
  rankOf: engine.rankOf,

  // Boards
  leaderboard: store.leaderboard,
  standing: store.standing,

  // Authoring + configuration
  store,
  catalog,
  scoring,
  publicCatalog: catalog.publicCatalog,
}
