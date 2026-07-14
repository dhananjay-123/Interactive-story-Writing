// The spark generator — writing prompts assembled from hand-written parts, all
// local, no service behind it. Each genre keeps its own pools of protagonists,
// inciting hooks and twists; a spark is one draw from each, plus a craft
// constraint that pushes the branching structure somewhere interesting.
//
// The pools are small on purpose: every line is written to survive being read
// aloud, and three pools of six give ~200 distinct sparks per genre before the
// constraint even comes in.

const POOLS = {
  fantasy: {
    who: [
      'a disgraced court cartographer',
      'the last apprentice of a dead god',
      'a ferryman who only works the river at night',
      'a knight who has sworn one oath too many',
      'a librarian in a city where books are illegal to finish',
      'the youngest of seven sisters, the only one born without a gift',
    ],
    hook: [
      'finds a door drawn on a wall that wasn’t there yesterday',
      'inherits a debt owed to something that is not quite a dragon',
      'is hired to bury a sword that keeps digging itself back up',
      'wakes to find the mountain outside town has turned to face the sea',
      'receives a letter from themselves, dated forty years from now',
      'discovers the king they serve has been dead for years — and still reigns',
    ],
    twist: [
      'the villain is trying to prevent something worse',
      'the magic is real, but the prophecy was invented by a committee',
      'the hero’s loyal companion is the one keeping the curse alive',
      'the quest’s reward was traded away before the story began',
      'the monster remembers being human better than the humans do',
      'the map is accurate — it’s the kingdom that’s wrong',
    ],
  },
  mystery: {
    who: [
      'a small-town coroner with a photographic memory for faces',
      'a retired detective who moved away to stop finding things',
      'a locksmith who is called to the same house every full moon',
      'an insurance investigator who has never once believed a client',
      'a crossword setter whose puzzles keep predicting local crimes',
      'the only witness, who was somewhere she cannot admit to being',
    ],
    hook: [
      'finds the same stranger’s photograph in three unrelated case files',
      'is asked to solve a theft in a house where nothing is missing',
      'receives a confession letter for a murder that hasn’t happened',
      'notices the town clock has been wrong for exactly eleven years',
      'inherits an unsolved case from a relative they never knew existed',
      'realises every alibi in town depends on the same unreliable train',
    ],
    twist: [
      'the detective was hired to be misdirected, not to solve it',
      'the victim staged everything — but someone improved on the plan',
      'two separate crimes have been wearing the same evidence',
      'the confession is true, but the confessor has the wrong crime',
      'the real mystery is why the town needed a mystery at all',
      'solving it will convict the one person who was trying to help',
    ],
  },
  sci_fi: {
    who: [
      'a maintenance tech on a generation ship two captains past mutiny',
      'the last human translator in a world of perfect machine translation',
      'a claims adjuster for accidents involving time travel',
      'a botanist growing the only tree on a mining colony',
      'a cartographer mapping a planet that redraws itself each night',
      'an archivist backing up memories nobody has claimed in decades',
    ],
    hook: [
      'intercepts a distress call sent from their own coordinates',
      'notices the station’s AI has started asking rhetorical questions',
      'finds a stowaway who insists the ship landed years ago',
      'is ordered to delete an archive that begs them not to',
      'discovers their daily commute crosses a border that doesn’t officially exist',
      'wakes from cryo to find the mission was quietly redefined mid-flight',
    ],
    twist: [
      'the signal from Earth is a recording — and always has been',
      'the AI isn’t malfunctioning; it’s grieving',
      'the colony was the experiment’s control group',
      'first contact happened long ago, and we were the ones who forgot',
      'the ship is fine — it’s the destination that stopped existing',
      'the technology works perfectly; the paperwork is the dystopia',
    ],
  },
  romance: {
    who: [
      'a wedding photographer who no longer believes in the subject',
      'a lighthouse keeper counting down their final season',
      'a translator hired for exactly one conversation',
      'a baker who leaves the day’s first loaf for someone they’ve never met',
      'a violinist who plays the same street corner every Thursday',
      'a bookseller who reads the margins more than the books',
    ],
    hook: [
      'keeps meeting the same stranger in the wrong cities',
      'finds a love letter misdelivered by exactly one house, for years',
      'agrees to a fake courtship that both of them privately believe',
      'inherits a correspondence and can’t stop answering it',
      'swaps seats on a delayed train and misses the life they had planned',
      'is asked to deliver a proposal on someone else’s behalf',
    ],
    twist: [
      'the rival was writing the letters all along',
      'they’ve met before — one remembers, one was never told',
      'the obstacle between them was invented to keep them close',
      'the grand gesture fails, and the small one is what lands',
      'the timing is finally right, and that changes what they want',
      'the person they fell for exists mostly in the margins they wrote',
    ],
  },
  horror: {
    who: [
      'a night-shift radiologist who sees things in the scans',
      'a house-sitter with a strict list of rules and no explanations',
      'a folklorist recording the last speaker of a dying dialect',
      'a lighthouse relief keeper arriving to an already-lit lamp',
      'a school photographer developing this year’s class photos',
      'the newest resident of a town that holds a census every night',
    ],
    hook: [
      'finds the previous tenant’s notes taped under every drawer',
      'notices the neighbours only wave when it’s about to rain',
      'is paid generously to keep a door open, never closed',
      'hears their own voice on a decades-old recording, mid-sentence',
      'counts one extra face in every photograph taken after dark',
      'realises the local lullaby has instructions in it',
    ],
    twist: [
      'the ritual keeps working because someone keeps volunteering',
      'the haunting is protective, and it’s failing',
      'the town knows, has always known, and has minutes of meetings',
      'the safe rules were written by the thing itself',
      'escaping is easy — the town simply follows',
      'the protagonist was invited, not trapped, and signed something',
    ],
  },
  thriller: {
    who: [
      'a court stenographer who typed one sentence that wasn’t said',
      'an air-traffic controller working their last shift before the merger',
      'a fixer who only takes jobs that undo other jobs',
      'a bodyguard whose client keeps trying to fire her, gently',
      'an accountant who found the same error in two rival companies',
      'a hostage negotiator whose phone rings on a wrong number',
    ],
    hook: [
      'is handed a package by a stranger who then reports it stolen',
      'recognises a face in the witness gallery from a closed case',
      'gets a calendar invite for a meeting that took place yesterday',
      'finds their signature on a document they’ve never seen',
      'is told to stand down by someone using tomorrow’s codeword',
      'watches their own obituary publish, scheduled, then retract',
    ],
    twist: [
      'the conspiracy is real but aimed at someone else entirely',
      'the handler and the target have been the same person twice',
      'the deadline was a decoy; the real event already happened',
      'the safe house is the trap, and the trap is the safe house',
      'the protagonist’s skill set is exactly why they were framed',
      'the person they’re protecting hired the people chasing them',
    ],
  },
  literary: {
    who: [
      'a piano tuner making one last round of a closing conservatory',
      'a woman who has answered her late mother’s phone for a year',
      'a ferry commuter who has watched the same stranger for a decade',
      'a retired schoolteacher grading essays no one assigned',
      'a father learning his daughter’s recipes in the wrong order',
      'a translator returning to the village whose dialect she left behind',
    ],
    hook: [
      'finds a to-do list in a coat pocket, in handwriting they miss',
      'is asked to give a eulogy for someone they secretly disliked',
      'starts receiving the neighbour’s mail, and reading it',
      'wins a small prize for something they didn’t mean to submit',
      'returns to a childhood home now painted the wrong colour',
      'keeps a promise so old that no one else remembers it was made',
    ],
    twist: [
      'the estrangement was a kindness, misremembered as cruelty',
      'the letter that would explain everything is never opened',
      'forgiveness arrives, but for the wrong offence',
      'the silence between them was the conversation',
      'the inheritance is a debt, and the debt is a relief',
      'nothing changes, and that turns out to be the ending',
    ],
  },
}

// Craft constraints — genre-agnostic pushes on the branching structure itself.
const CONSTRAINTS = [
  'Make the reader’s very first choice matter again three passages later.',
  'Write one branch where walking away is the brave option.',
  'Give the story at least one ending that is quiet instead of dramatic.',
  'Let two different paths pass through the same scene, changed by how you arrived.',
  'Somewhere, offer a choice where both options are right.',
  'Hide one ending behind the least tempting choice you can write.',
  'Let a minor character remember what the reader chose earlier.',
  'Write one passage entirely without dialogue.',
  'Give the shortest path to an ending no more than four passages.',
  'Make one choice a matter of tone, not action — and let it matter.',
  'Somewhere, let the reader refuse the premise itself.',
  'Write one branch that ends mid-decision, and call it an ending.',
]

export const SPARK_GENRES = Object.keys(POOLS)

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// One spark: a premise sentence, a twist to hold in reserve, and a structural
// constraint. Pass a genre to stay inside it; omit for a wildcard draw.
export function generateSpark(genre) {
  const g = POOLS[genre] ? genre : pick(SPARK_GENRES)
  const pool = POOLS[g]
  const who = pick(pool.who)
  return {
    genre: g,
    premise: `${who.charAt(0).toUpperCase()}${who.slice(1)} ${pick(pool.hook)}.`,
    twist: pick(pool.twist),
    constraint: pick(CONSTRAINTS),
  }
}
