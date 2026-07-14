// The badge catalogue — the heart of the config-driven design. Every badge is a
// plain record. To add a badge you append an entry here; the engine, the unlock
// evaluator, the progress tracker, the profile and the admin tools all pick it up
// with no further code. Nothing about a badge is hard-coded anywhere else.
//
// Fields
//   id          stable slug, stored on every unlock row — never rename in place.
//   name        display title.
//   category    one of catalog/categories.
//   rarity      one of catalog/rarities.
//   description shown once unlocked (and always, unless `hidden`).
//   hint        how to earn it — the unlock criteria in words.
//   hidden      true → name/description/hint stay masked until the user earns it.
//   icon        { shape, hue? } — a shape the frontend renders in CSS/SVG. `hue`
//               overrides the rarity's default tint for one-off looks.
//   criteria    how it unlocks:
//                 { metric, target }            reach target on a metric (auto)
//                 { all: [{metric,target}...] } reach every threshold (auto)
//                 { manual: true }              only an admin can grant it
//
// `audience` is inferred from the category (author / reader / special).

const { category } = require('./categories')

/** @type {Array<object>} */
const RAW = [
  // ── Publishing ──────────────────────────────────────────────────────────────
  { id: 'first_tale',        name: 'First Ink',          category: 'publishing', rarity: 'common',    icon: { shape: 'quill' },
    description: 'You published your very first story.',            hint: 'Publish 1 story.',       criteria: { metric: 'stories_published', target: 1 } },
  { id: 'prolific_pen',      name: 'Prolific Pen',       category: 'publishing', rarity: 'uncommon',  icon: { shape: 'scroll' },
    description: 'Five stories bear your name.',                    hint: 'Publish 5 stories.',     criteria: { metric: 'stories_published', target: 5 } },
  { id: 'storysmith',        name: 'Storysmith',         category: 'publishing', rarity: 'rare',      icon: { shape: 'book' },
    description: 'A shelf of fifteen tales, all yours.',            hint: 'Publish 15 stories.',    criteria: { metric: 'stories_published', target: 15 } },
  { id: 'publishing_legend', name: 'Publishing Legend',  category: 'publishing', rarity: 'legendary', icon: { shape: 'trophy' },
    description: 'Forty published works — a body of work.',         hint: 'Publish 40 stories.',    criteria: { metric: 'stories_published', target: 40 } },

  // ── Writing Quality ─────────────────────────────────────────────────────────
  { id: 'well_received',       name: 'Well Received',      category: 'writing_quality', rarity: 'uncommon', icon: { shape: 'heart' },
    description: 'Readers have shown your work real love.',         hint: 'Receive 25 likes across your stories.', criteria: { metric: 'likes_received', target: 25 } },
  { id: 'critically_acclaimed', name: 'Critically Acclaimed', category: 'writing_quality', rarity: 'rare', icon: { shape: 'star' },
    description: 'Twenty-five readers gave you full marks.',        hint: 'Receive 25 five-star ratings.',         criteria: { metric: 'five_star_received', target: 25 } },
  { id: 'beloved_author',      name: 'Beloved',            category: 'writing_quality', rarity: 'epic',    icon: { shape: 'gem' },
    description: 'Your stories have gathered a devoted following of likes.', hint: 'Receive 250 likes across your stories.', criteria: { metric: 'likes_received', target: 250 } },

  // ── Story Design ────────────────────────────────────────────────────────────
  { id: 'brancher',        name: 'The Brancher',       category: 'story_design', rarity: 'common',   icon: { shape: 'map' },
    description: 'Your stories fork and wind.',                     hint: 'Author 10 branches in total.',   criteria: { metric: 'total_branches', target: 10 } },
  { id: 'labyrinth_maker', name: 'Labyrinth Maker',    category: 'story_design', rarity: 'rare',     icon: { shape: 'compass' },
    description: 'A hundred branches — readers can get gloriously lost.', hint: 'Author 100 branches in total.', criteria: { metric: 'total_branches', target: 100 } },
  { id: 'many_endings',    name: 'A Thousand Fates',   category: 'story_design', rarity: 'uncommon', icon: { shape: 'key' },
    description: 'You have written many ways for a tale to end.',   hint: 'Craft 10 endings in total.',     criteria: { metric: 'total_endings', target: 10 } },
  { id: 'epic_architect',  name: 'Epic Architect',     category: 'story_design', rarity: 'epic',     icon: { shape: 'globe' },
    description: 'Two hundred passages of your own making.',        hint: 'Write 200 passages in total.',   criteria: { metric: 'total_passages', target: 200 } },

  // ── Community (author) ──────────────────────────────────────────────────────
  { id: 'conversationalist', name: 'In Good Company',  category: 'community', rarity: 'uncommon', icon: { shape: 'chat' },
    description: 'Your stories get people talking.',                hint: 'Receive 25 comments.',           criteria: { metric: 'comments_received', target: 25 } },
  { id: 'collaborator',      name: 'Co-Author',        category: 'community', rarity: 'uncommon', icon: { shape: 'people' },
    description: 'You have written shoulder to shoulder.',          hint: 'Co-write a story with another author.', criteria: { metric: 'collaborations', target: 1 } },
  { id: 'mentor',           name: 'Gathering a Circle', category: 'community', rarity: 'rare',    icon: { shape: 'ribbon' },
    description: 'Ten readers follow where you lead.',              hint: 'Reach 10 followers.',            criteria: { metric: 'followers', target: 10 } },

  // ── Popularity ──────────────────────────────────────────────────────────────
  { id: 'rising_star',    name: 'Rising Star',        category: 'popularity', rarity: 'rare',      icon: { shape: 'sparkle' },
    description: 'Your following is growing fast.',                 hint: 'Reach 25 followers.',            criteria: { metric: 'followers', target: 25 } },
  { id: 'editors_choice', name: "Editor's Choice",    category: 'popularity', rarity: 'epic',      icon: { shape: 'ribbon' },
    description: 'The editors put your work on the front page.',    hint: 'Have a story featured.',         criteria: { metric: 'featured_stories', target: 1 } },
  { id: 'crowd_favorite', name: 'Crowd Favourite',    category: 'popularity', rarity: 'legendary', icon: { shape: 'phoenix' },
    description: 'Five hundred likes. The crowd has spoken.',       hint: 'Receive 500 likes.',             criteria: { metric: 'likes_received', target: 500 } },

  // ── Retention ───────────────────────────────────────────────────────────────
  { id: 'genre_spanner', name: 'Range',              category: 'retention', rarity: 'uncommon', icon: { shape: 'leaf' },
    description: 'You write across three different genres.',        hint: 'Publish in 3 different genres.', criteria: { metric: 'distinct_genres_written', target: 3 } },
  { id: 'world_spanner', name: 'No Bounds',          category: 'retention', rarity: 'rare',     icon: { shape: 'globe' },
    description: 'Six genres, one restless imagination.',           hint: 'Publish in 6 different genres.', criteria: { metric: 'distinct_genres_written', target: 6 } },

  // ── Reading ─────────────────────────────────────────────────────────────────
  { id: 'first_journey',  name: 'First Journey',      category: 'reading', rarity: 'common',    icon: { shape: 'flame' },
    description: 'You reached the end of a story.',                 hint: 'Finish 1 story.',                criteria: { metric: 'stories_completed', target: 1 } },
  { id: 'devoted_reader', name: 'Devoted Reader',     category: 'reading', rarity: 'uncommon',  icon: { shape: 'book' },
    description: 'Ten stories, seen through to the end.',           hint: 'Finish 10 stories.',             criteria: { metric: 'stories_completed', target: 10 } },
  { id: 'bookworm',       name: 'Bookworm',           category: 'reading', rarity: 'rare',      icon: { shape: 'chalice' },
    description: 'Thirty finished tales and counting.',             hint: 'Finish 30 stories.',             criteria: { metric: 'stories_completed', target: 30 } },
  { id: 'insatiable',     name: 'Insatiable',         category: 'reading', rarity: 'legendary', icon: { shape: 'infinity' },
    description: 'A hundred endings reached.',                      hint: 'Finish 100 stories.',            criteria: { metric: 'stories_completed', target: 100 } },

  // ── Exploration ─────────────────────────────────────────────────────────────
  { id: 'pathmaker',   name: 'Pathmaker',          category: 'exploration', rarity: 'common',   icon: { shape: 'compass' },
    description: 'Every fork is a decision. You have made a few.',  hint: 'Make 25 choices.',               criteria: { metric: 'choices_made', target: 25 } },
  { id: 'wanderer',    name: 'Wanderer',           category: 'exploration', rarity: 'uncommon', icon: { shape: 'map' },
    description: 'You have set out into ten different stories.',    hint: 'Start 10 stories.',              criteria: { metric: 'stories_started', target: 10 } },
  { id: 'multiverse',  name: 'Multiverse Walker',  category: 'exploration', rarity: 'rare',     icon: { shape: 'sparkle' },
    description: 'Two hundred and fifty choices across the branches.', hint: 'Make 250 choices.',           criteria: { metric: 'choices_made', target: 250 } },

  // ── Engagement ──────────────────────────────────────────────────────────────
  { id: 'first_word',       name: 'First Word',        category: 'engagement', rarity: 'common',   icon: { shape: 'chat' },
    description: 'You left your first comment.',                    hint: 'Post 1 comment.',                criteria: { metric: 'comments_posted', target: 1 } },
  { id: 'supporter',        name: 'Supporter',         category: 'engagement', rarity: 'uncommon', icon: { shape: 'heart' },
    description: 'You spread the love, twenty-five times over.',    hint: 'Like 25 stories.',               criteria: { metric: 'likes_given', target: 25 } },
  { id: 'curator',          name: 'Curator',           category: 'engagement', rarity: 'uncommon', icon: { shape: 'bookmark' },
    description: 'A personal library, carefully kept.',             hint: 'Bookmark 20 stories.',           criteria: { metric: 'bookmarks', target: 20 } },
  { id: 'critic',           name: 'The Critic',        category: 'engagement', rarity: 'rare',     icon: { shape: 'star' },
    description: 'Twenty-five considered ratings.',                 hint: 'Rate 25 stories.',               criteria: { metric: 'ratings_given', target: 25 } },
  { id: 'community_pillar', name: 'Community Pillar',  category: 'engagement', rarity: 'rare',     icon: { shape: 'people' },
    description: 'You follow twenty authors and lift them up.',     hint: 'Follow 20 authors.',             criteria: { metric: 'following', target: 20 } },

  // ── Genres ──────────────────────────────────────────────────────────────────
  { id: 'genre_curious',     name: 'Genre-Curious',     category: 'genres', rarity: 'uncommon', icon: { shape: 'leaf' },
    description: 'You have read across three genres.',              hint: 'Read in 3 different genres.',     criteria: { metric: 'distinct_genres_read', target: 3 } },
  { id: 'genre_connoisseur', name: 'Connoisseur',       category: 'genres', rarity: 'rare',     icon: { shape: 'gem' },
    description: 'You have finished stories in five genres.',       hint: 'Complete stories in 5 genres.',   criteria: { metric: 'genres_completed', target: 5 } },
  { id: 'omnireader',        name: 'Omnireader',        category: 'genres', rarity: 'epic',     icon: { shape: 'globe' },
    description: 'Every genre on the shelf, all read.',             hint: 'Read in all 7 genres.',           criteria: { metric: 'distinct_genres_read', target: 7 } },

  // ── Challenges (streaks) ────────────────────────────────────────────────────
  { id: 'streak_starter', name: 'Kindling',            category: 'challenges', rarity: 'uncommon', icon: { shape: 'flame' },
    description: 'Three days running.',                             hint: 'Read 3 days in a row.',           criteria: { metric: 'reading_streak', target: 3 } },
  { id: 'devotion',       name: 'Devotion',            category: 'challenges', rarity: 'rare',     icon: { shape: 'sun' },
    description: 'A full week without missing a day.',              hint: 'Read 7 days in a row.',           criteria: { metric: 'reading_streak', target: 7 } },
  { id: 'unwavering',     name: 'Unwavering',          category: 'challenges', rarity: 'epic',     icon: { shape: 'phoenix' },
    description: 'A month-long ritual.',                            hint: 'Read 30 days in a row.',          criteria: { metric: 'reading_streak', target: 30 } },

  // ── Mythic (auto, extreme) ──────────────────────────────────────────────────
  { id: 'living_myth', name: 'Living Myth', category: 'reading', rarity: 'mythic', icon: { shape: 'infinity' },
    description: 'Two hundred and fifty stories, seen to their ends. Few will ever match this.', hint: 'Finish 250 stories.', criteria: { metric: 'stories_completed', target: 250 } },

  // ── Hidden ──────────────────────────────────────────────────────────────────
  { id: 'night_reader', name: 'The Untold', category: 'hidden', rarity: 'mythic', hidden: true, icon: { shape: 'moon' },
    description: 'Five hundred choices made in the dark between the lines.', hint: 'A secret revealed once earned.', criteria: { metric: 'choices_made', target: 500 } },
  { id: 'true_completionist', name: 'The Cartographer', category: 'hidden', rarity: 'mythic', hidden: true, icon: { shape: 'key' },
    description: 'You have completed a story in every genre this world holds.', hint: 'A secret revealed once earned.', criteria: { metric: 'genres_completed', target: 7 } },

  // ── Seasonal / Special / Platform events (admin-granted) ─────────────────────
  { id: 'launch_week', name: 'Day One', category: 'platform_events', rarity: 'legendary', icon: { shape: 'sparkle' },
    description: 'You were here when it all began.', hint: 'Awarded to early members of the platform.', criteria: { manual: true } },
  { id: 'winter_tales', name: 'Winter Tales', category: 'seasonal', rarity: 'rare', icon: { shape: 'moon' },
    description: 'You took part in the Winter Tales season.', hint: 'Awarded for a seasonal event.', criteria: { manual: true } },

  // ── Founder / Premium ───────────────────────────────────────────────────────
  { id: 'founding_author', name: 'Founder', category: 'founder', rarity: 'legendary', icon: { shape: 'gem' },
    description: 'A founding voice of the platform.', hint: 'Granted to founding members.', criteria: { manual: true } },
  { id: 'patron', name: 'Patron', category: 'premium', rarity: 'epic', icon: { shape: 'diamond' },
    description: 'A patron of the craft.', hint: 'Granted to supporters of the platform.', criteria: { manual: true } },

  // ── Administrative (admin-exclusive rarity) ──────────────────────────────────
  { id: 'platform_curator', name: 'Curator', category: 'administrative', rarity: 'administrator', icon: { shape: 'shield' },
    description: 'A steward of the library.', hint: 'Held by the platform team.', criteria: { manual: true } },
  { id: 'platform_architect', name: 'Architect', category: 'administrative', rarity: 'administrator', icon: { shape: 'crown' },
    description: 'A builder of the platform itself.', hint: 'Held by the platform team.', criteria: { manual: true } },
]

// Freeze each record and attach its inferred audience so callers never mutate the
// shared catalogue by accident.
const BADGES = RAW.map((b) =>
  Object.freeze({
    ...b,
    hidden: !!b.hidden,
    audience: category(b.category)?.audience || 'special',
  })
)

module.exports = { BADGES }
