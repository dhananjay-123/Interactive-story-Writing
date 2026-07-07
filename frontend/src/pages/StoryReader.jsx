import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import ChoiceCard from '../components/ChoiceCard'

const SAMPLE_TREE = {
  id: 'root',
  text: `The letter arrives at dawn, slipped under your door without a knock.

You recognise the seal—a broken compass rose, the mark of the Cartographers' Guild, dissolved forty years ago. Your father's guild.

The wax is still warm.

Inside, a single line in his handwriting: *Come before they do.*

You haven't spoken to your father in eleven years. The last time you saw him, he pressed a brass key into your hand and told you to forget his name. You kept the key. You tried to forget.

Outside, the city is waking up. Somewhere below, a door opens and closes. You hear footsteps on the stairs—measured, deliberate, stopping two floors below yours. Then silence.

The letter. The key. The footsteps.

You have perhaps thirty seconds to decide.`,
  choices: [
    { text: 'Gather what you can and leave by the back exit—now, before whoever it is reaches your floor.', nextId: 'escape' },
    { text: 'Stay and confront whoever is coming up the stairs. You\'ve run long enough.', nextId: 'confront' },
    { text: 'Re-read the letter. Your father always hid secondary messages in the ink spacing.', nextId: 'decode' },
  ],
}

const NODES = {
  root: SAMPLE_TREE,
  escape: {
    id: 'escape',
    text: `You move fast. Coat, the brass key, the letter folded into your inside pocket.

The back stairs are narrow and dark, smelling of old timber and damp stone. Three flights down, you push through the service door into the alley—cold air, grey light, the sound of a cart on the cobblestones ahead.

You don't look back. Not until you reach the corner of Meridian Street, where you press yourself against the wall and watch the front entrance of your building.

A figure emerges two minutes later. Not the person you expected.

You recognise her instantly, even after all these years: *Elara Voss*, your father's most trusted apprentice. She's older now, moving with careful economy, scanning the street with the practiced patience of someone who has learned to wait.

She's holding a second letter.

She hasn't seen you yet.`,
    choices: [
      { text: 'Call out to her. Whatever she\'s carrying, you need to know.', nextId: 'call_elara' },
      { text: 'Follow her at a distance. Find out where she\'s going before you reveal yourself.', nextId: 'follow_elara' },
    ],
  },
  confront: {
    id: 'confront',
    text: `You fold the letter, slide it into your pocket, and stand facing the door.

The footsteps resume. Slow. One landing, then the next.

Your hand finds the brass key in your coat pocket. It doesn't open any lock you've ever found, but its weight has always been a small comfort.

The footsteps stop outside your door.

A pause. Long enough to make you wonder. Then a knock—three times, unhurried, like someone who has all the time in the world.

When you open the door, you find a boy, no older than twelve, in the grey uniform of a guild messenger. He looks at you without surprise.

*"He said you'd answer,"* the boy says. *"He also said to give you this before I give you this."*

He holds out a small envelope. And then, with his other hand, a rolled map.`,
    choices: [
      { text: 'Open the envelope first.', nextId: 'open_envelope' },
      { text: 'Unroll the map first.', nextId: 'unroll_map' },
      { text: 'Ask the boy who sent him and how he found you.', nextId: 'question_boy' },
    ],
  },
  decode: {
    id: 'decode',
    text: `You learned this when you were nine years old, sitting at your father's workbench while he drafted charts by lamplight.

*Every cartographer hides a second map in the first.*

You tilt the letter toward the window. The morning light catches the paper at a shallow angle, and there it is: the slight variation in ink density that looks like uneven drying but isn't. Letter spacing shifted by fractions of a millimeter.

You work through it slowly, the way he taught you. It takes four minutes.

What you find is an address—not in this city. A port town, six days east by the coastal road—and beneath it, three words:

*The key fits.*

Your chest tightens. Eleven years of wondering what that key was for, and suddenly you have an answer, or the beginning of one.

The footsteps on the stairs have stopped. Whoever it was, they've gone.

For now.`,
    choices: [
      { text: 'Leave for the port town immediately. Six days is already too long.', nextId: 'leave_for_port' },
      { text: 'Go to the Cartographers\' Hall first—there may be records of that address.', nextId: 'cartographers_hall' },
    ],
  },
  call_elara: {
    id: 'call_elara',
    text: `Her name is out of your mouth before you've decided to say it.

She turns. The careful blankness of her expression tells you everything—she's surprised, but she's very good at not showing it.

*"I wasn't sure you'd still be here,"* she says, crossing to you with the second letter held flat against her side. *"Your father thought you might have moved on."*

*"He could have asked me himself."*

She holds your gaze. *"He couldn't reach you. That was rather the point."*

She gives you the letter. You both stand in the cold morning light while you open it.

It's longer than the first. And by the third paragraph, your understanding of the last eleven years begins, quietly, to dissolve.`,
    choices: [
      { text: 'Keep reading.', nextId: 'end_chapter' },
    ],
  },
  end_chapter: {
    id: 'end_chapter',
    text: `The letter is twelve pages long.

By the end, you know three things you didn't before: why your father disappeared, what the brass key is for, and why the Guild was really dissolved.

None of it is what you expected. Some of it is worse.

Elara watches you fold the pages back. She's waiting for a question. You have several. You start with the most practical one.

*"How long do we have?"*

She considers this. *"Less than a week. Probably four days, if they move quickly."*

You close your hand around the brass key.

Four days. A port town six days east. A secret that has been waiting eleven years.

You begin to calculate.

---

*This is the end of the opening chapter. More of this story is coming soon.*`,
    choices: [],
  },
  open_envelope: {
    id: 'open_envelope',
    text: `Inside is a photograph—old, the chemical kind, slightly foxed at the edges.

It shows a building you don't recognize. Stone, tall, with a particular type of arched window that you've only ever seen in one place: the old port districts, built in the era when the Guild was still drawing the world's edges.

On the back, in your father's handwriting: *Third floor, eastern face. You'll know the lock.*

The boy is watching you with patient, unreadable eyes.

*"He said to tell you,"* the boy adds, *"that the map is the longer way. But it's the safer one."*`,
    choices: [
      { text: 'Study the map after all.', nextId: 'unroll_map' },
      { text: 'Ask the boy to take you to wherever he came from.', nextId: 'follow_boy' },
    ],
  },
  unroll_map: {
    id: 'unroll_map',
    text: `The map unrolls to reveal a coastline you've never charted.

That alone is remarkable. You've memorized every published atlas, every survey from the old Guild records. This coastline has no name. No soundings. No notation except a single mark at the northern tip—a small square, drawn in the same red ink your father always used for *verified but unconfirmed.*

At the bottom of the map, a note in a different hand: *He said you'd understand the scale.*

You do. The scale bar puts this coastline at roughly four hundred miles long. Which means it should appear on every map of the region.

It doesn't.

Somewhere, four hundred miles of coast have been erased from the record.

Your hands, you notice, have gone very still.`,
    choices: [
      { text: 'Ask the boy where he found this map.', nextId: 'question_boy' },
      { text: 'Leave immediately to find your father.', nextId: 'leave_for_port' },
    ],
  },
  question_boy: {
    id: 'question_boy',
    text: `*"He found me,"* the boy says simply, as if this is obvious. *"Three months ago. He said I'd know the person I was meant to find because they'd have a brass key and they'd hesitate before opening the door."*

*"And did I hesitate?"*

*"A little."* A pause. *"He said that was fine. He said a little hesitation meant you were thinking."*

You study the boy. He's calm in a way that children usually aren't—not frightened, not eager to leave, just present. Waiting.

*"Did he tell you anything else?"*

The boy considers. *"He said: the map is right, but the map is incomplete. And that you would know what that means better than he does."*

You do know what it means.

It means there's a third map. There's always a third map.`,
    choices: [
      { text: 'Ask the boy to stay until you can gather your things.', nextId: 'leave_for_port' },
    ],
  },
  leave_for_port: {
    id: 'leave_for_port',
    text: `You're on the eastern road before noon.

The coast comes into view on the third day—grey water, salt-white cliffs, fishing villages that smell of net and smoke. On the fifth morning, you reach the town whose address was hidden in your father's letter.

The building is easy to find. Stone, three stories, arched windows on the eastern face.

You stand at the door on the third floor for a long moment.

Then you put the brass key in the lock.

It fits.

The door opens onto a room full of maps—hundreds of them, stacked and rolled and pinned to every surface. In the center, sitting at a workbench with his back to you, is a man who turns slowly at the sound of the door.

He looks older. Much older. But the hands, still holding a cartographer's pen, are unmistakably your father's.

He says your name.

---

*This is the end of the opening chapter. More of this story is coming soon.*`,
    choices: [],
  },
  cartographers_hall: {
    id: 'cartographers_hall',
    text: `The Hall has been a civic records office for thirty years, but the bones of the old building are unmistakable—the proportions, the deep-set windows, the floor worn smooth by decades of cartographers who knew where they were going.

The archivist, a small woman with wire-rimmed glasses, watches you with professional interest as you describe what you're looking for.

*"That address,"* she says slowly, *"appears once in our records. Under a sealed file."*

*"Sealed by whom?"*

She looks at you for a long moment. *"By the last Director of the Guild. Before the dissolution."*

She doesn't say the name. She doesn't need to.

Your father was the last Director of the Guild.

*"Can you open it?"* you ask.

*"I can,"* she says. *"But there's a note attached. It says: open only if asked by someone carrying a brass key."*

Your hand is already in your pocket.`,
    choices: [
      { text: 'Show her the key and open the file.', nextId: 'leave_for_port' },
    ],
  },
  follow_boy: {
    id: 'follow_boy',
    text: `*"All right,"* you say. *"Take me."*

The boy leads you through the city by a route you wouldn't have chosen—back streets, covered markets, a stretch of the old canal walk where the stones are slippery and the light doesn't quite reach.

He's not evasive. He simply knows the city the way someone knows it when they've been moving through it quietly for a long time.

After forty minutes, he stops at a door in a wall you almost walked past.

*"He's inside,"* the boy says. *"He's been waiting longer than you know."*

And then, with the efficient gravity of someone who has delivered what they came to deliver, the boy turns and walks away.

You face the door.

Behind it: your father. Eleven years of silence. A story that was written before you knew you were in it.

You knock.

---

*This is the end of the opening chapter. More of this story is coming soon.*`,
    choices: [],
  },
  follow_elara: {
    id: 'follow_elara',
    text: `She moves through the city with purpose but no urgency—the pace of someone who expects to be followed and doesn't mind.

You keep half a block between you. She never looks back.

After twenty minutes, she turns into a narrow street near the old harbor and enters a building through a door painted the same grey as the stone around it. Almost invisible.

You wait three minutes, then try the door.

It opens.

Inside, in a room that smells of cartographer's ink and old paper, two people are waiting: Elara, standing. And a man seated at a table with his back to the window—older, slower, but with the same hands you remember.

Your father looks up. For a long moment, neither of you speaks.

Then he says: *"I hoped you'd follow her rather than call out. Less exposed."*

*"You knew I was watching."*

*"I taught you to watch."* A pause. *"Sit down. There's a great deal to explain, and we have less time than I'd like."*`,
    choices: [
      { text: 'Sit down and listen.', nextId: 'end_chapter' },
    ],
  },
}

export default function StoryReader() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [currentNode, setCurrentNode] = useState(NODES.root)
  const [history, setHistory] = useState([])
  const [transitioning, setTransitioning] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id.startsWith('sample-')) {
      setStory({
        title: 'The Cartographer\'s Daughter',
        author: 'P. Nakamura',
        genre: 'fantasy',
      })
      setLoading(false)
      return
    }
    axios.get(`/api/stories/${id}`)
      .then(r => { setStory(r.data); setLoading(false) })
      .catch(() => { setStory(null); setLoading(false) })
  }, [id])

  const handleChoice = (choice) => {
    if (transitioning) return
    const next = NODES[choice.nextId]
    if (!next) return
    setTransitioning(true)
    setTimeout(() => {
      setHistory(h => [...h, currentNode])
      setCurrentNode(next)
      setTransitioning(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 300)
  }

  const handleBack = () => {
    if (history.length === 0) return
    setTransitioning(true)
    setTimeout(() => {
      const prev = history[history.length - 1]
      setCurrentNode(prev)
      setHistory(h => h.slice(0, -1))
      setTransitioning(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 300)
  }

  const handleRestart = () => {
    setTransitioning(true)
    setTimeout(() => {
      setCurrentNode(NODES.root)
      setHistory([])
      setTransitioning(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 300)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(250,248,243,0.3)', fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading...</p>
      </div>
    )
  }

  const paragraphs = currentNode.text.split('\n\n')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '80px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 100px' }}>

        {/* Story header */}
        {story && (
          <div className="animate-fadeIn mb-12">
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(250,248,243,0.35)',
                fontSize: '12px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                padding: 0,
                marginBottom: '32px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(250,248,243,0.35)'}
            >
              ← Back to library
            </button>

            <h1
              className="font-story"
              style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em', marginBottom: '8px' }}
            >
              {story.title}
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(250,248,243,0.35)' }}>
              {story.author} &mdash; {history.length + 1} {history.length === 0 ? 'choice' : 'choices'} in
            </p>
          </div>
        )}

        {/* Progress crumbs */}
        {history.length > 0 && (
          <div
            className="animate-fadeIn"
            style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '32px',
              alignItems: 'center',
            }}
          >
            {history.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === history.length - 1 ? '20px' : '6px',
                  height: '3px',
                  background: 'var(--gold)',
                  opacity: i === history.length - 1 ? 0.8 : 0.3,
                  borderRadius: '2px',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
            <div style={{ width: '6px', height: '3px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
          </div>
        )}

        {/* Story text */}
        <div
          style={{
            opacity: transitioning ? 0 : 1,
            transform: transitioning ? 'translateY(12px)' : 'translateY(0)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}
        >
          <div className="font-story" style={{ marginBottom: '48px' }}>
            {paragraphs.map((para, i) => {
              const isItalic = para.startsWith('*') && para.endsWith('*')
              const text = isItalic ? para.slice(1, -1) : para
              const parts = text.split(/(\*[^*]+\*)/g)

              return (
                <p
                  key={i}
                  className="animate-fadeUp"
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    fontSize: '17px',
                    lineHeight: 1.85,
                    color: 'rgba(250,248,243,0.82)',
                    marginBottom: '20px',
                    fontStyle: isItalic ? 'italic' : 'normal',
                  }}
                >
                  {parts.map((part, j) =>
                    part.startsWith('*') && part.endsWith('*')
                      ? <em key={j} style={{ color: 'var(--parchment)', fontStyle: 'italic' }}>{part.slice(1, -1)}</em>
                      : part
                  )}
                </p>
              )
            })}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.15)' }} />
            <div style={{ width: '4px', height: '4px', background: 'rgba(201,168,76,0.4)', borderRadius: '50%' }} />
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.15)' }} />
          </div>

          {/* Choices */}
          {currentNode.choices.length > 0 ? (
            <div>
              <p
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(201,168,76,0.5)',
                  marginBottom: '20px',
                }}
              >
                What do you do?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentNode.choices.map((choice, i) => (
                  <ChoiceCard
                    key={i}
                    choice={choice}
                    index={i}
                    onSelect={handleChoice}
                    disabled={transitioning}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="animate-fadeUp text-center" style={{ padding: '32px 0' }}>
              <div style={{ width: '40px', height: '1px', background: 'rgba(201,168,76,0.3)', margin: '0 auto 24px' }} />
              <p
                className="font-story"
                style={{ fontSize: '18px', color: 'rgba(250,248,243,0.5)', fontStyle: 'italic', marginBottom: '32px' }}
              >
                End of Chapter One
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleRestart}
                  style={{
                    padding: '12px 28px',
                    background: 'transparent',
                    border: '1px solid rgba(201,168,76,0.4)',
                    color: 'var(--gold)',
                    fontSize: '12px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  Start Over
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          {history.length > 0 && (
            <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(250,248,243,0.3)',
                  fontSize: '12px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(250,248,243,0.6)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(250,248,243,0.3)'}
              >
                ← Go back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
