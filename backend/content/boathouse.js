/* Nobody Locks the Boathouse — the deepened graph.

   Three acts. Each act is a hub the leads return to, so a reader works several
   leads in one run instead of picking one and falling straight out of the story.
   Endings live only in the last act, after the case is gatherable.

   Truth of the case (never stated outright anywhere in the prose):
   Ray Ollerenshaw stayed late. Adam Pike, told in March he would not be kept on,
   came back after nine, signed a single out at half past, and argued with Ray on
   the pontoon. Ray went in. Pike did not call anyone. Ruth found the signed-out
   line the next morning and rewrote it rather than put that name in her own hand.
   Sil saw the boathouse light on at ten and assumed it was Ray. */

module.exports = {
  title: 'Nobody Locks the Boathouse',
  root: 'open',
  game: {
    objective: 'Who was in the boathouse after nine?',
    briefing: 'Four people had a key. Three of them are telling the truth about the hour they left.',
    solutionKey: 'adam-pike',
    maxAttempts: 3,
  },
  nodes: {
    // ── Act I: the morning ────────────────────────────────────────────────
    open: {
      text: `They found Coach Ollerenshaw face down in the shallows at six the next morning, still wearing his club jacket. The boathouse door was standing open.

Nobody locks the boathouse. That is the first thing everyone tells you, and they tell you it the way people tell you things they have decided in advance.

You have until nine, when the club fills up and everyone remembers the same evening in the same words.`,
      clues: [['The boathouse door was standing open', 'Which everyone volunteers before being asked.', 'observation', 1]],
      choices: [
        ['Look at the water first', 'water'],
        ['Look at the boathouse first', 'shed'],
      ],
    },
    water: {
      text: `They have brought him up onto the hard standing and put a blanket over him that does not reach.

His jacket is buttoned to the throat. A man who fell in while locking up would have been carrying something; his hands are empty and his palms are grazed. The watch on his wrist stopped at nine forty, which is either the truth or a coincidence that will be very convenient for somebody.

The river here is four feet deep and slow. He swam here twice a week for thirty years.`,
      clues: [['His watch stopped at nine forty', 'Four feet of water, and a man who swam here twice a week.', 'evidence', 3]],
      choices: [
        ['Go up to the boathouse', 'shed'],
        ['Go up to the yard', 'hubA'],
      ],
    },
    shed: {
      text: `Inside it smells of varnish and wet rope. Eight boats on the racks, and the racks are the only tidy thing in the building — Ray Ollerenshaw ran his boats the way other men run a regiment.

Which is why the single on the second rack is wrong. It is racked bow-out where every other hull is bow-in, and when you put your hand inside the saxboard it comes away wet.

Somebody put a boat away in the dark, in a hurry, and did not care that it showed.`,
      clues: [['A single is racked wet, and the wrong way round', 'Every other hull is bow-in. Ray Ollerenshaw ran his boats like a regiment.', 'evidence', 2]],
      choices: [
        ['Go out to the yard', 'hubA'],
      ],
    },
    hubA: {
      text: `Quarter past six. The yard is grey and the kettle in the clubhouse has not been on.

Four people have keys to this building. By nine they will all be here, and by ten they will all have agreed with each other. Until then they are separate, and separate is where the truth lives.`,
      choices: [
        ['Find the secretary', 'ruth1'],
        ['Walk the towpath', 'path1'],
        ['Find the groundsman', 'sil1'],
        ['Wait for the brother', 'pete1'],
        ['That is enough of the morning', 'hubB'],
      ],
    },

    ruth1: {
      text: `Ruth Fennimore keeps the club's minutes in a hand-ruled ledger, and she turns it towards you before you ask, which is either helpfulness or practice.

She left at ten past nine. The last entry proves it, in her own small upright hand.

The ink on that line is a different black from the rest of the page.`,
      clues: [['The last ledger line is in different ink', 'Every other entry that night is the same black. The last one is not.', 'evidence', 2]],
      choices: [
        ['Press her on the ink', 'ruth2'],
        ['Ask to see the March minutes instead', 'ruth3'],
        ['Leave the ledger where it is', 'hubA'],
      ],
    },
    ruth2: {
      text: `She does not pretend for long, which you will think about later.

She wrote the last line the next morning, to make the book tidy. *Tidy* is doing a great deal of work in that sentence.

The real last entry was a single scull, signed out at half past nine. She read the name in the book at ten to six with the police already on the hard standing, and she decided that she would not be the one who put it there, in ink, in her own hand.

She will not say the name now either. She says: "Ask him yourself. He'll tell you. He's not clever."`,
      clues: [['A single was signed out at half past nine', 'Ruth rewrote the page rather than record the name that was on it.', 'evidence', 3]],
      choices: [['Back to the yard', 'hubA']],
    },
    ruth3: {
      text: `March is eleven pages back and reads like every other March: subscriptions, a broken window, the spring regatta.

Then, in the same small hand, under Any Other Business: *Coaching staff for the coming season confirmed. AP informed.*

"He took it well," Ruth says, before you have asked anything at all.`,
      clues: [['Pike was told in March he would not be kept on', 'Minuted under Any Other Business, eleven pages back.', 'clue', 2]],
      choices: [['Back to the yard', 'hubA']],
    },

    path1: {
      text: `The towpath is churned to mud for thirty yards either side of the boathouse steps, and most of it means nothing — a club is a hundred pairs of feet a week.

One set is not nothing. Trainers, a size that is not large, going down towards the water and coming back up again, the returning prints deeper at the heel the way a man's are when he is walking fast and not looking behind him.

Sil Warrick has worn the same boots since before the flood.`,
      clues: [['Trainer prints on the towpath, going both ways', 'Down to the water and back up. The groundsman wears boots, always.', 'evidence', 2]],
      choices: [
        ['Follow them up towards the club', 'path2'],
        ['Follow them down to the pontoon', 'path3'],
        ['Leave the path to the police', 'hubA'],
      ],
    },
    path2: {
      text: `The prints come back to the boathouse steps and stop at the boot rack.

Under the peg marked PIKE there is a pair of size-nine trainers, set neatly side by side, the way you put shoes down when you are being careful about something else.

Three days of dry weather. They are still damp on the inside.`,
      clues: [['Wet trainers under Pike’s peg, three days on', 'Size nine, dry outside, still damp within.', 'evidence', 3]],
      choices: [['Back to the yard', 'hubA']],
    },
    path3: {
      text: `The pontoon is slick and the last board rocks under you.

At the far end, where a boat would be held while somebody got into it, the bow-side rigger of the single has left its mark in the wood — a bright gouge across the grain, new, no weather in it yet.

A rigger only strikes a pontoon if a boat comes alongside badly. In the dark, say. By one man who normally has another man holding the stern.`,
      clues: [['A new gouge in the pontoon boards', 'A rigger only marks the wood if a boat comes in badly.', 'observation', 2, true]],
      choices: [['Back to the yard', 'hubA']],
    },

    sil1: {
      text: `Sil Warrick is on the mower at half past six because the mower is where Sil Warrick is.

Four keys were cut in 1998 and never re-cut. He leans on the machine and enjoys the question for a moment before answering it.

"You want to know who's got one? Everyone. That's the point of a boat club." He is not wrong, and he is not helping, and he knows both.`,
      clues: [['Four keys, cut in 1998, never re-cut', 'Which is a way of saying the keys prove nothing at all.', 'observation', 1, true]],
      choices: [
        ['Ask what he saw', 'sil2'],
        ['Ask where he was', 'sil3'],
        ['Let him mow', 'hubA'],
      ],
    },
    sil2: {
      text: `"Light was on in the boathouse at ten. I saw it from the top field."

He says it the way he would tell you the time. It has not occurred to him yet that it is the most important thing anyone will say all week, and you decide not to be the one who tells him.

"Ray, I thought. Ray's always last." He looks at the water. "Ray was always last."`,
      clues: [['The boathouse light was on at ten', 'Half an hour after the club says the building was empty.', 'evidence', 2]],
      choices: [['Back to the yard', 'hubA']],
    },
    sil3: {
      text: `He keeps a log because the committee once asked him to and he has never forgiven them for it. It is a school exercise book, and it is meticulous.

*Top field, 7.40–9.35.* The top field is four hundred yards from the water with a hedge in between.

"You can check the diesel," he says, with some satisfaction. You do. It checks.`,
      clues: [['Sil’s log puts him on the top field until 9.35', 'Four hundred yards away, with a hedge between.', 'clue', 1, true]],
      choices: [['Back to the yard', 'hubA']],
    },

    pete1: {
      text: `Peter Ollerenshaw arrives at ten to seven in yesterday's shirt and stands where the police tape makes him stand.

He rows on Sundays, badly, and his brother told him so every Sunday for nineteen years, and he would give a great deal to be told so again this Sunday.

He is not performing. That is worth writing down, because by this afternoon three people will tell you he was.`,
      choices: [
        ['Ask about the money', 'pete2'],
        ['Ask about the locks', 'pete3'],
        ['Leave him to it', 'hubA'],
      ],
    },
    pete2: {
      text: `He is not surprised you know. In a club this size the debt was practically a fixture on the noticeboard.

Eleven hundred pounds, two years ago, for a van. Ray never asked for it and Peter never offered it and both of them preferred the arrangement to the alternative, which was a conversation.

"He'd have written it off in his will," Peter says. "That's the sort of thing he did. That's the bit nobody's going to put in the paper."`,
      clues: [['Peter owed his brother eleven hundred pounds', 'Two years old, never chased, and known to everybody.', 'clue', 2, true]],
      choices: [['Back to the yard', 'hubA']],
    },
    pete3: {
      text: `"He'd been on at the committee since the summer. Change the locks, get a proper set cut, know who's got what." Peter almost laughs. "Ruth minuted it twice. Sil said it'd cost eighty quid."

Ray Ollerenshaw wanted a building he could shut. He was outvoted by people who liked the idea of a club that was never shut.

"He said someone was coming down here at night," Peter says. "He didn't say it was anyone in particular. He wasn't like that."`,
      clues: [['Ray had been asking to change the locks since summer', 'Minuted twice. Outvoted twice.', 'clue', 2, true]],
      choices: [['Back to the yard', 'hubA']],
    },

    // ── Act II: the afternoon ─────────────────────────────────────────────
    hubB: {
      text: `By noon the club has settled on a version. It went round the changing rooms the way these things do, and it goes: he was last out, he slipped on the pontoon, and nobody locks the boathouse.

It is a good version. It requires nothing of anyone.

The inquest opens on Thursday. That gives you three days to have a better one.`,
      choices: [
        ['Find Pike', 'pike1'],
        ['Ask at the Anchor', 'anchor1'],
        ['Go back to the single', 'scull1'],
        ['Sit in on the doctor', 'doc1'],
        ['You have enough', 'hubC'],
      ],
    },

    pike1: {
      text: `Adam Pike is twenty-six and has the handshake of a man who has been told to work on his handshake.

He left at nine. He is certain, and he is certain in a way that has been practised — the same three details in the same order, and the order does not vary when you ask him twice.

He went to the Anchor. He had one. He went home.`,
      clues: [['Pike says he left at nine and went to the Anchor', 'The same three details, in the same order, twice.', 'evidence', 3]],
      choices: [
        ['Ask him about March', 'pike2'],
        ['Ask him about his shoes', 'pike3'],
        ['Let him go for now', 'hubB'],
      ],
    },
    pike2: {
      text: `The practised part stops.

"He didn't sack me. That's the thing everyone gets wrong. He kept me on all season, he wrote me a reference, he was going to ring the college at Christmas." Pike's hands are flat on the table. "He was the only one who ever did anything for me."

It is the first thing he has said that is not in an order, and it has the awful ring of being true. Which is the trouble with this: the man who did it can be grieving too.`,
      clues: [['Pike is grieving, and it is not performed', 'The only unrehearsed thing he says all afternoon.', 'observation', 1, true]],
      choices: [['Back to the club', 'hubB']],
    },
    pike3: {
      text: `"Everyone's a nine," he says. "Look in the rack. Half the squad's a nine."

You do look, later. Four pairs, and three of them are dry, and the fourth is under his own peg with his own initials inked on the tongue in his own hand.

He does not ask why you are asking. That is the part you keep coming back to. An innocent man asks why you are asking about his shoes.`,
      choices: [['Back to the club', 'hubB']],
    },

    anchor1: {
      text: `The Anchor is four minutes' walk from the club gate and has been since 1830.

The landlady remembers the night for a reason that has nothing to do with anybody's alibi: the boiler went at half eight and she called last orders at nine and put the towels on, because a pub with no heat in October is just a cold room with beer in it.

She was shut and dark by twenty past nine.`,
      clues: [['The Anchor shut at nine that night', 'The boiler failed. She was dark by twenty past.', 'evidence', 3]],
      choices: [
        ['Ask if she saw him', 'anchor2'],
        ['Back to the club', 'hubB'],
      ],
    },
    anchor2: {
      text: `"Adam? He was in at half seven with the lad from the college. Gone before eight."

She is sure, and her sureness has a receipt behind it: she remembers because he did not pay, and she remembers because she let him not pay, and she would rather you did not make a thing of it.

Half seven to eight. Which leaves the whole of the evening standing open, like the door.`,
      clues: [['Pike was at the Anchor at half seven, not at nine', 'Gone before eight, and the pub was shut by twenty past nine.', 'evidence', 3]],
      choices: [['Back to the club', 'hubB']],
    },

    scull1: {
      text: `The single comes down off the rack in your arms and it is heavier than it looks, the way they always are.

Grit in the seat runners. River grit, not shed dust. Somebody rowed this boat and put it away without wiping the slide, and Ray Ollerenshaw would have had a junior in tears for less.

The bow-side rigger is out of true by an inch and a half.`,
      clues: [['The single was rowed and put away unwiped', 'Grit in the slide. Ray would have had a junior in tears for it.', 'evidence', 2]],
      choices: [
        ['Check the boat book', 'scull2'],
        ['Put it back', 'hubB'],
      ],
    },
    scull2: {
      text: `The boat book is a different animal from the minutes: a spiral pad on a string, and nobody has ever pretended it is a document.

The last four lines are Wednesday. Under them, in biro, in a hand that slopes hard to the right: *SGL — 9.30 — A.P.*

Ruth's ledger is a fair copy of this book, made up the next morning. She copied every line but one.`,
      clues: [['The boat book still carries the line Ruth left out', 'SGL — 9.30 — A.P., in biro, in a hand that slopes right.', 'evidence', 3]],
      choices: [['Back to the club', 'hubB']],
    },

    doc1: {
      text: `The doctor is neither dramatic nor helpful, which is what you want.

Drowned. Water in the lungs, so he was breathing when he went in. Alcohol negligible. A man of sixty-one with a good heart and a bad knee.

"There's a contusion on the left shoulder," she says, and then, because you have not asked well enough yet: "Not from the bottom. The bottom here is silt."`,
      clues: [['A bruise on the shoulder that the riverbed cannot explain', 'He was breathing when he went in. The bottom here is silt.', 'evidence', 3]],
      choices: [
        ['Ask what would make that mark', 'doc2'],
        ['Leave her to her report', 'hubB'],
      ],
    },
    doc2: {
      text: `"A blade," she says. "Or a gunwale, or a rigger, or any of the other pieces of that sport I have had explained to me four times."

She will write *consistent with a fall from the pontoon* because it is, and because it is also consistent with three other things, and a coroner's court is not the place to go looking for the other three.

"If you want it said out loud," she says, "somebody will have to say it."`,
      choices: [['Back to the club', 'hubB']],
    },

    // ── Act III: the evening ──────────────────────────────────────────────
    hubC: {
      text: `Thursday is close now and the club has stopped talking about it, which is its own kind of answer.

You have what you have. Some of it is in a spiral pad on a string, and some of it is in a pair of trainers, and some of it is only in the order that people chose to say things to you.

None of it is the sort of thing that makes a man confess. That will have to come from somewhere else.`,
      choices: [
        ['Put it to Pike, alone, tonight', 'end_pike'],
        ['Take it to the coroner', 'end_cor'],
        ['Give it to Ruth to write down', 'end_ruth'],
        ['Wait at the boathouse after dark', 'end_wait'],
        ['Say nothing at all', 'end_none'],
      ],
    },

    end_pike: {
      text: `You find him at the boat rack at eight, doing the one job nobody asked him to do, which is wiping down a slide that is already clean.

You do not accuse him. You put the spiral pad on the rack beside him, open at Wednesday, and you let the biro do it.

He looks at it for a long time.`,
      choices: [
        ['Wait him out', 'e_confess'],
        ['Tell him what you think happened', 'e_push'],
      ],
    },
    e_confess: {
      text: `"He was going to ring the college," Adam Pike says, to the boat.

They argued on the pontoon about nothing — about the slide, about the way he stacked the blades, about nineteen small things that were really one large thing. Ray put a hand on his shoulder, the way he did, and Adam took it off him harder than he meant to.

Four feet of water. A man who swam here twice a week. Adam Pike stood on the boards for a count of ten and then he went home, and that count of ten is what he will be sentenced for, and he knows it, and he says so before you do.

He asks if he can put the boat away properly first. You let him.`,
      ending: true,
    },
    e_push: {
      text: `You tell him. You tell it well, and every piece of it is right, and telling it is the mistake.

He hears an accusation and stops being a frightened boy standing at a rack. By Thursday he has a solicitor from Chester, and the solicitor has the ledger — the tidy one, in Ruth's own upright hand, with no single scull in it anywhere.

Misadventure. The club buys a good lock in the spring that nobody ever uses.`,
      ending: true,
    },

    end_cor: {
      text: `The coroner's officer is a patient man who has heard a great many theories in this room and has been polite to all of them.

He reads what you have brought. He puts it in two piles without meaning to show you that he is doing it: the pile that is paper, and the pile that is somebody's opinion about a pair of shoes.`,
      choices: [
        ['Lead with the boat book', 'e_book'],
        ['Lead with the trainers', 'e_shoes'],
      ],
    },
    e_book: {
      text: `The spiral pad is the only object in this case that was written by the person who did it, at the hour they did it, without meaning anything by it.

The inquest is adjourned within nine minutes. Adam Pike is asked, on oath, to account for a line in his own biro, and he cannot, and the not-accounting takes place in a room with his mother in it.

It is a slower and colder way to get there than a confession at the boat rack. It gets there.`,
      ending: true,
    },
    e_shoes: {
      text: `A pair of damp trainers under a peg with four keys in a club where everybody's a nine.

The officer is kind about it. Counsel would not be. The trainers go in the pile that is somebody's opinion, and the boat book stays in your coat pocket where you did not think to take it out, and the verdict is misadventure by a quarter past eleven.

You are still holding the pad in the car park. That is the part you will keep.`,
      ending: true,
    },

    end_ruth: {
      text: `You find her at the ledger, because she is always at the ledger.

You do not ask her to accuse anybody. You ask her to do the only thing she has ever done in this building, which is write down what happened, in her own small upright hand, on the correct line, in the correct ink.`,
      choices: [
        ['Ask her to write the true entry', 'e_ledger'],
        ['Ask her to speak at the inquest', 'e_speak'],
      ],
    },
    e_ledger: {
      text: `She takes a fresh nib. She rules the line. She writes: *SGL out 9.30, A. Pike. Not returned to rack until following morning.*

Then she signs it and dates it Thursday, which is a small and deliberate act of honesty — she will not pretend she wrote it on the night.

The club never forgives her. The coroner never has to be persuaded of anything. Ruth Fennimore keeps the minutes for another eleven years and never again writes anything down that is not true.`,
      ending: true,
    },
    e_speak: {
      text: `She stands up in the room and says that she left at ten past nine, and that the ledger is a fair copy, and that she made it up the next morning as she always did.

All of which is true, and none of which is the truth, and she is not asked the one question that would have opened it because nobody in the room knows there is a spiral pad on a string in the boat shed.

She goes home and is ill for a fortnight. Adam Pike coaches the juniors until March.`,
      ending: true,
    },

    end_wait: {
      text: `You sit on the top field with Sil's hedge at your back from nine until midnight, in October, without a flask, which you will not do twice.

At twenty to eleven the boathouse light goes on.`,
      choices: [
        ['Go down', 'e_down'],
        ['Stay where you are and watch', 'e_watch'],
      ],
    },
    e_down: {
      text: `It is Adam Pike, with a bucket and a bottle of white spirit, taking the grit out of a seat slide at twenty to eleven at night.

He does not run. He says, "I couldn't leave it like that," and it is not clear to either of you whether he means the boat.

You take the bucket off him and you sit down on the pontoon, the two of you, in the cold, and he starts at the beginning without being asked.`,
      ending: true,
    },
    e_watch: {
      text: `You watch the light for nineteen minutes and then you watch it go off, and a figure comes up the path who is the right height to be anybody.

In the morning the seat runners are clean, the pontoon boards have been scrubbed, and the spiral pad on its string is gone from the nail beside the door.

You had it in your hands on Tuesday. That is the sort of thing you get one of.`,
      ending: true,
    },

    end_none: {
      text: `You put it down. There are reasons, and by the spring some of them are even good ones: a boy of twenty-six, a count of ten on a wet board, a coroner who has already written the word.

The verdict is misadventure. The club buys a good lock that nobody ever uses.

Adam Pike leaves rowing at the end of the season and does not go back, which is not justice, and is not nothing, and is what happens.`,
      ending: true,
    },
  },
}
