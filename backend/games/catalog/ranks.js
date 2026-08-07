// Rank ladders. A finished session earns the highest rung its score has reached,
// so the title a reader carries away is legible without them knowing the scoring
// formula. Ladders are per-flavour — a courtroom story hands out advocacy titles,
// not detective ones — which is why the mode names its ladder instead of the
// engine hard-coding "Detective".
//
// Adding a ladder is a config edit here plus one `rank:` reference in modes.js.

const ladder = (id, label, rungs) => ({
  id,
  label,
  // Ordered lowest → highest; resolveRank walks it and keeps the last one cleared.
  rungs: rungs.map((r, level) => ({ ...r, level })),
})

const LADDERS = [
  ladder('detective', 'Detective rank', [
    { id: 'constable',      label: 'Constable',        min: 0 },
    { id: 'sergeant',       label: 'Sergeant',         min: 250 },
    { id: 'inspector',      label: 'Inspector',        min: 500 },
    { id: 'chief',          label: 'Chief Inspector',  min: 750 },
    { id: 'master',         label: 'Master Detective', min: 1000 },
  ]),
  ladder('advocacy', 'Standing at the bar', [
    { id: 'clerk',          label: 'Clerk of Court',   min: 0 },
    { id: 'junior',         label: 'Junior Counsel',   min: 250 },
    { id: 'advocate',       label: 'Advocate',         min: 500 },
    { id: 'senior',         label: 'Senior Counsel',   min: 750 },
    { id: 'silk',           label: 'Master Advocate',  min: 1000 },
  ]),
  ladder('escape', 'Escapist rank', [
    { id: 'captive',        label: 'Captive',          min: 0 },
    { id: 'picklock',       label: 'Picklock',         min: 250 },
    { id: 'escapist',       label: 'Escapist',         min: 500 },
    { id: 'ghost',          label: 'Ghost',            min: 750 },
    { id: 'unbound',        label: 'Unbound',          min: 1000 },
  ]),
  ladder('survival', 'Field rank', [
    { id: 'stranded',       label: 'Stranded',         min: 0 },
    { id: 'forager',        label: 'Forager',          min: 250 },
    { id: 'survivor',       label: 'Survivor',         min: 500 },
    { id: 'ranger',         label: 'Ranger',           min: 750 },
    { id: 'last_standing',  label: 'Last Standing',    min: 1000 },
  ]),
  ladder('intrigue', 'Standing at court', [
    { id: 'courtier',       label: 'Courtier',         min: 0 },
    { id: 'envoy',          label: 'Envoy',            min: 250 },
    { id: 'advisor',        label: 'Privy Advisor',    min: 500 },
    { id: 'chancellor',     label: 'Chancellor',       min: 750 },
    { id: 'kingmaker',      label: 'Kingmaker',        min: 1000 },
  ]),
  ladder('clearance', 'Clearance', [
    { id: 'recruit',        label: 'Recruit',          min: 0 },
    { id: 'field_agent',    label: 'Field Agent',      min: 250 },
    { id: 'operative',      label: 'Operative',        min: 500 },
    { id: 'handler',        label: 'Handler',          min: 750 },
    { id: 'legend',         label: 'Legend',           min: 1000 },
  ]),
  ladder('vigil', 'Standing of the vigil', [
    { id: 'sceptic',        label: 'Sceptic',          min: 0 },
    { id: 'witness',        label: 'Witness',          min: 250 },
    { id: 'investigator',   label: 'Investigator',     min: 500 },
    { id: 'keeper',         label: 'Keeper of the Vigil', min: 750 },
    { id: 'unshaken',       label: 'Unshaken',         min: 1000 },
  ]),
]

const byId = new Map(LADDERS.map((l) => [l.id, l]))

module.exports = {
  LADDERS,
  ladder: (id) => byId.get(id) || null,
  isLadder: (id) => byId.has(id),
}
