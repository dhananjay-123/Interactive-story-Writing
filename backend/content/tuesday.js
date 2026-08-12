/* The Weight of a Tuesday — the deepened graph.

   Truth of the case: Callum Fry was not behind his counter at twenty past six.
   He had gone out the back with forty pounds of the day's float, and when the
   police came asking he was shown a statement and agreed with it, and has been
   repeating the sentence he was given ever since. Ines Barrow is honestly wrong
   about the light. Mrs Adeyemi heard exactly what she says she heard. Doyle's
   notebook is tidy because Doyle writes it up afterwards, which is a bad habit
   and not a conspiracy. */

module.exports = {
  title: 'The Weight of a Tuesday',
  root: 'open',
  game: {
    objective: 'Which witness is lying?',
    briefing: 'Everyone in this room believes they are telling the truth. That is what makes it difficult.',
    solutionKey: 'callum-fry',
    maxAttempts: 3,
  },
  nodes: {
    // ── Act I: the prosecution case ───────────────────────────────────────
    open: {
      text: `The prosecution's case is an hour long. Six o'clock to seven, on a Tuesday in November.

Everything twelve people will decide about the rest of a man's life rests on where he stood inside it.

Three witnesses put him in three different places within that hour. Two of them are mistaken, and being mistaken is not a crime, and the difference is the only thing you have to work with.`,
      choices: [
        ['Look at the defendant', 'accused'],
        ['Go straight to the evidence', 'hubA'],
      ],
    },
    accused: {
      text: `He is thirty-four and has the posture of a man who has been told to sit up straight by someone he respects.

He has said, from the first interview to this morning, the same unhelpful thing: he went out for a walk. No route, no witnesses, no receipts. It is the worst possible account and it has never once changed.

Guilty men usually improve their story. It is the innocent who keep handing you the same useless one.`,
      clues: [['His account has never once improved', 'No route, no receipts, and no attempt to make it better.', 'observation', 1, true]],
      choices: [['Turn to the evidence', 'hubA']],
    },
    hubA: {
      text: `The court sits until four. Four witnesses, one hour of a Tuesday, and a jury that has not yet decided which of them it likes.

You can only listen properly to one thing at a time in a room like this. Everything you do not attend to goes past at the same speed as everything else.`,
      choices: [
        ['Hear the bus driver', 'ines1'],
        ['Hear the shop assistant', 'fry1'],
        ['Hear the neighbour', 'ade1'],
        ['Read the officer’s notebook', 'doyle1'],
        ['Let the court rise', 'hubB'],
      ],
    },

    ines1: {
      text: `Ines Barrow drove the 74 and remembers him because he paid in coins, counted out slowly, holding up the queue. She is certain about the coins.

She is less careful about the light. She says it was dark. In November, at six, on that road, it was not yet.`,
      clues: [['She says it was dark at six; it was not', 'November, that road — the light goes about twenty past.', 'clue', 2]],
      choices: [
        ['Ask her about the light', 'ines2'],
        ['Ask her about the coins', 'ines3'],
        ['Let her account stand', 'hubA'],
      ],
    },
    ines2: {
      text: `She thinks about it properly for the first time, and her certainty comes apart in her hands while everyone watches.

"It was *getting* dark," she says. "That's not the same, is it."

It is not. She is wrong, and being wrong is not the same as lying, and the jury will need to be told the difference very carefully — because a witness who breaks like that in public looks worse than one who lies well.`,
      clues: [['Her certainty was about the coins, not the hour', 'She was honestly wrong, and knew it the moment she was asked properly.', 'clue', 2, true]],
      choices: [['Back to the court', 'hubA']],
    },
    ines3: {
      text: `The coins she is right about, in detail: a two-pound piece, four twenties, and a ten she had to look at twice because it was the old sort.

Nobody invents an old ten pence piece. It is the kind of thing that is only ever in a memory because it was actually in a hand.

She saw him. She saw him on her bus. The hour is the only thing she is guessing at, and nobody in this room has yet separated the two.`,
      clues: [['The detail she is certain about is real, and specific', 'An old ten pence piece. Nobody invents that.', 'evidence', 2]],
      choices: [['Back to the court', 'hubA']],
    },

    fry1: {
      text: `Callum Fry served him at twenty past six and describes the coat exactly: navy, toggle buttons, a tear at the left cuff.

He describes it a second time, later, under cross-examination. The same three details. The same order. The same words.`,
      clues: [['Fry describes the coat in identical words, twice', 'Navy, toggle buttons, tear at the left cuff. Same order both times.', 'evidence', 3]],
      choices: [
        ['Ask him to describe it once more', 'fry2'],
        ['Ask him about the shop', 'fry3'],
        ['Move on', 'hubA'],
      ],
    },
    fry2: {
      text: `Navy, toggle buttons, a tear at the left cuff. The same words in the same order, with the same small pause before *toggle*.

Nobody remembers a coat. People remember a sentence, and a sentence that comes back identical three times is a sentence somebody was given.

The jury does not hear it. The jury hears a young man being consistent, which is the thing they have been told all week to look for.`,
      clues: [['The third description is word-for-word identical again', 'A rehearsed sentence, not a memory.', 'evidence', 3]],
      choices: [['Back to the court', 'hubA']],
    },
    fry3: {
      text: `He is happy to talk about the shop and unhappy in a way he cannot hide about one part of it: the float.

Tuesdays are quiet. The float is counted at six and again at close. He says this and then adds, unasked, that he was on the till the whole evening, which is not an answer to any question that has been put to him.

Volunteering the alibi to the wrong question is the oldest tell there is.`,
      clues: [['Fry volunteers that he was on the till all evening', 'Nobody had asked him where he was.', 'clue', 2]],
      choices: [['Back to the court', 'hubA']],
    },

    ade1: {
      text: `Mrs Adeyemi has lived next door for eleven years and heard his door at ten to seven. She did not look, and she says so before anyone can catch her out with it.

She will not be moved on the time and will not be drawn on anything else. She heard a door. She has heard that door four thousand times.`,
      clues: [['The neighbour puts him home at ten to seven', 'She did not look. She has heard that door four thousand times.', 'clue', 2]],
      choices: [
        ['Ask how she knows the hour', 'ade2'],
        ['Ask what else she heard', 'ade3'],
        ['Move on', 'hubA'],
      ],
    },
    ade2: {
      text: `The radio. The half-six programme had finished and the one she does not like had started, and she had got up to turn it off, and that is when the door went.

It is the least dramatic evidence in the case and the only piece anchored to something outside a human memory.

The prosecution does not cross-examine her at all, which tells you what they think of it.`,
      clues: [['Her time is anchored to a radio schedule', 'The only witness hour in this case fixed to something outside a person.', 'evidence', 3]],
      choices: [['Back to the court', 'hubA']],
    },
    ade3: {
      text: `"Nothing," she says. "That's the thing nobody asks about."

No shouting, no running, no water going, no third person on the stairs. A man came home at ten to seven and was quiet in the way that a man who has walked for an hour in the cold is quiet.

She is not a witness for either side. She is simply a woman who was in.`,
      choices: [['Back to the court', 'hubA']],
    },

    doyle1: {
      text: `Sgt Doyle's notebook is neat to the point of art. Every entry timed to the minute, every page numbered, nothing crossed out.

Eleven years of notebooks and not one correction. You have read a great many police notebooks. That has never once been true of anybody.`,
      clues: [['Eleven years of notebooks, not one crossing-out', 'Tidy to a degree that nobody actually manages.', 'observation', 1, true]],
      choices: [
        ['Ask when he writes it up', 'doyle2'],
        ['Ask in what order he took the statements', 'doyle3'],
        ['Move on', 'hubA'],
      ],
    },
    doyle2: {
      text: `"End of shift," he says, and does not understand yet that he has said anything.

He writes it up at the end of the shift, from memory, in a quiet room, in one hand, in one ink. It is why it is beautiful. It is also why it is not contemporaneous, and a notebook that is not contemporaneous is a recollection with a ruler through it.

He is not dishonest. He is tidy, and tidiness has been getting into evidence for eleven years.`,
      clues: [['The notebook is written up at the end of the shift', 'Beautiful, and not contemporaneous.', 'evidence', 2]],
      choices: [['Back to the court', 'hubA']],
    },
    doyle3: {
      text: `Adeyemi first, on the night. Barrow on the Thursday. Fry on the Friday, at the shop, on his break.

By Friday there was a description of a coat in the file, and Doyle had it in front of him, in his own beautiful hand, when he sat down opposite a nineteen-year-old and asked him what the man had been wearing.

He would tell you he read it back to check. He would be telling the truth.`,
      clues: [['Fry was interviewed last, from a file that already held the coat', 'Read back to check, in a beautiful hand, to a nineteen-year-old.', 'evidence', 3]],
      choices: [['Back to the court', 'hubA']],
    },

    // ── Act II: the adjournment ───────────────────────────────────────────
    hubB: {
      text: `The court rises at four and the case goes home with you, which is the part they do not warn anybody about.

You have until half past ten tomorrow. Everything that is going to be checked has to be checked tonight, and most of what you want does not exist in a form anyone has to give you.`,
      choices: [
        ['Get the shop’s rota', 'rota1'],
        ['Ask about the shop’s cameras', 'cctv1'],
        ['Look at the coat itself', 'coat1'],
        ['Read Fry’s statements in order', 'stmt1'],
        ['Pull the bus ticket data', 'bus1'],
        ['You are ready', 'hubC'],
      ],
    },

    rota1: {
      text: `The rota is a laminated sheet in a back office and the manager produces it with the weary good humour of a man who has been asked for worse.

Tuesday: Fry, six till close. One name, one shift, no cover.

Then he says the thing that is not on the sheet — that the float goes out at six and gets counted in the office, out the back, and that it takes about ten minutes, and that it is a one-man job.`,
      clues: [['The float is counted out the back, alone, for ten minutes', 'A one-man job, off the shop floor, at six.', 'evidence', 3]],
      choices: [
        ['Ask when the float was counted that Tuesday', 'rota2'],
        ['Back', 'hubB'],
      ],
    },
    rota2: {
      text: `The manager checks the book, because there is always a book.

*Tue — float short £40 — CF spoke to.* Dated that Tuesday. The counting was late that week, he says, because it always is when it is short; you count it twice, then a third time, then you sit with it.

Twenty past six, give or take. Out the back. Sitting with forty pounds that is not there.`,
      clues: [['The float was £40 short that Tuesday, counted late', 'Twice, then a third time, out the back, at about twenty past.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    cctv1: {
      text: `There are two cameras. One over the door, one over the till.

The one over the till has been recording onto the same tape since August because nobody replaced it and nobody is paid to care. It is grey soup.

The one over the door works perfectly, and points at the door.`,
      choices: [
        ['Ask for the door tape anyway', 'cctv2'],
        ['Back', 'hubB'],
      ],
    },
    cctv2: {
      text: `The door tape shows a navy coat entering at 18:09 and leaving at 18:14, five minutes, hood up, no face.

It shows something else that nobody has bothered to look for, because nobody was looking for it: at 18:16 the shop is empty and stays empty, and no one comes to the counter until 18:31.

For fifteen minutes there is nobody serving anybody in that shop.`,
      clues: [['The shop counter is unmanned from 18:16 to 18:31', 'Fifteen minutes with nobody serving anybody.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    coat1: {
      text: `Exhibit four is in a paper sack and comes out smelling of the store.

Navy. Toggle buttons. And the tear is at the *right* cuff.`,
      clues: [['The tear is at the right cuff, not the left', 'Exhibit four, in the hand, in daylight.', 'evidence', 3]],
      choices: [
        ['Check whether anyone has noticed', 'coat2'],
        ['Back', 'hubB'],
      ],
    },
    coat2: {
      text: `Nobody has. It is in the exhibit list as *navy coat, toggle fastening, damage to cuff*, which is true and which is why it has sailed through four hands.

A man describing a coat he actually saw would get the side wrong half the time, because people do. A man repeating a sentence gets it wrong the same way every time.

Fry has said *left* three times. So has the file.`,
      clues: [['The file says “cuff”; only Fry says “left”', 'And he has said left, identically, three times.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    stmt1: {
      text: `Three statements: the Friday, the Monday after, and the deposition in March.

The Friday one is nineteen words long and ends mid-thought. The other two are fluent, complete, and contain a sentence that the first one does not.`,
      clues: [['The first statement is nineteen words and stops', 'The fluency arrives later, with the sentence.', 'clue', 2]],
      choices: [
        ['Read the nineteen words', 'stmt2'],
        ['Back', 'hubB'],
      ],
    },
    stmt2: {
      text: `*I think I served him. It was busy earlier. I can't say what he had on.*

That is the whole of it, in a nineteen-year-old's handwriting, signed and dated on the Friday.

Everything after that Friday is somebody else's language in Callum Fry's mouth, and he has been carrying it for eleven months, and it is very heavy, and you can see exactly how heavy from the way he sits down afterwards.`,
      clues: [['His first account said he could not say what the man wore', 'Nineteen words, signed on the Friday, before the file was read back to him.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    bus1: {
      text: `The 74's ticket machine keeps a log because the machine does not care what anybody remembers.

Every ticket, every fare, every stop, timed to the second, for the whole of that Tuesday.`,
      choices: [
        ['Find the coin fare', 'bus2'],
        ['Back', 'hubB'],
      ],
    },
    bus2: {
      text: `An adult single, paid in cash, at 18:02, at the stop two hundred yards from his door.

Ines Barrow was right about everything except the sky. He was on her bus at two minutes past six, and the shop is nine minutes' walk, and the door tape has a navy coat coming in at nine minutes past.

None of which is in dispute. All of which puts him at the counter at a quarter past — and nowhere near the counter at twenty past, when Callum Fry says he served him, because at twenty past there was nobody at the counter at all.`,
      clues: [['The ticket log puts him on the bus at 18:02', 'Cash fare, two hundred yards from his door. The machine does not misremember.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    // ── Act III: the second morning ───────────────────────────────────────
    hubC: {
      text: `Half past ten. The defendant has the same posture and the jury has the faces of people who have talked about it at home.

You get one line of attack that the room will actually follow. More than one and it becomes a lawyer being clever, and juries have a very good ear for a lawyer being clever.`,
      choices: [
        ['Take Fry through the sentence', 'x_fry'],
        ['Put the shop’s own book to him', 'x_book'],
        ['Go at Doyle instead', 'x_doyle'],
        ['Recall the bus driver', 'x_ines'],
        ['Make no attack at all', 'e_nothing'],
      ],
    },

    x_fry: {
      text: `You do not accuse him of anything. You ask him to describe the coat, and he does, and then you ask him to describe it again, and he does, and the room begins — slowly, badly — to hear it.`,
      choices: [
        ['Ask him which cuff', 'e_cuff'],
        ['Read him his own nineteen words', 'e_nineteen'],
      ],
    },
    e_cuff: {
      text: `"Left," he says.

You hand him exhibit four. He turns it over twice, and he says *left* again, to the coat, with the coat in his hands and the tear on the right cuff facing him.

It is not clever and it is not cruel and it takes about nine seconds. Afterwards he stops answering in sentences at all, and the jury has watched a young man discover in public that he has been repeating something he was told. They acquit in forty minutes. Nobody ever charges Callum Fry with anything, and he does not work another Tuesday in that shop.`,
      ending: true,
    },
    e_nineteen: {
      text: `You read the Friday statement out in his own words, all nineteen of them, and let the silence sit.

"I can't say what he had on," you read. "That is what you said, before anyone showed you a file."

He says: "They told me it'd be easier if I was sure." He is not lying now. He has not lied about anything since he sat down, which is the worst part, and the jury sees the whole shape of it — a frightened boy, forty pounds, and a sentence handed to him across a table by a man with beautiful handwriting.`,
      ending: true,
    },

    x_book: {
      text: `You put the shop's own float book in front of him: *Tue — float short £40 — CF spoke to.*

You do not ask him about the theft. You ask him where a man counts a float.`,
      choices: [
        ['Let him answer', 'e_float'],
        ['Press him on the fifteen minutes', 'e_fifteen'],
      ],
    },
    e_float: {
      text: `"Out the back," he says, before he can stop himself, and then, "but not that night."

The manager is still under oath and outside in the corridor, and everyone in the room knows it, and Fry knows it last of all.

The verdict is not guilty. The judge says several careful things about the manner in which the description of the coat entered the file, and the careful things are reported in one paragraph on page eleven, and Sgt Doyle retires in the spring on a full pension.`,
      ending: true,
    },
    e_fifteen: {
      text: `You play the door tape. 18:16 to 18:31, an empty shop and an empty counter, and a clock in the corner of the frame that nobody has ever had a reason to dispute.

"You served him at twenty past," you say. "Show the jury where you are standing."

He cannot, because he is out the back with forty pounds. He gives it up in the box — the float, the counting, the statement, all of it — and the acquittal takes nineteen minutes, and the loudest thing in the room is the defendant's mother.`,
      ending: true,
    },

    x_doyle: {
      text: `Doyle is a good witness: unhurried, unbothered, and entirely certain of his own good faith.

That certainty is the thing to work with, because it is real.`,
      choices: [
        ['Ask him to read the notebook aloud', 'e_doyle_book'],
        ['Ask him what he showed Fry', 'e_doyle_file'],
      ],
    },
    e_doyle_book: {
      text: `He reads it beautifully. That is precisely the problem, and it is a problem that requires a jury to hold two ideas at once: that a man can be honest and his notebook can still be a story he told himself at the end of a shift.

Juries will hold two ideas. They will not hold two ideas about a police officer they have decided they like.

Guilty. Six years. You are still fairly sure you were right, which is a thing you will get to keep.`,
      ending: true,
    },
    e_doyle_file: {
      text: `"Did you have the coat description in front of you when you interviewed Mr Fry?"

"I did."

"Did you read it back to him?"

"I did. To check it."

He says it plainly, because to him it is plainly nothing. It lands anyway — not as a scandal, but as an explanation, which is better. The jury now has somewhere to put Callum Fry that is not *liar*, and once they have that, they stop needing to believe him.

Not guilty, by a majority, on the second afternoon.`,
      ending: true,
    },

    x_ines: {
      text: `You recall Ines Barrow, because her ticket log is the only unarguable object in the case, and because she deserves to be told she was right about something.`,
      choices: [
        ['Put the ticket log to her', 'e_log'],
        ['Ask her again about the light', 'e_light'],
      ],
    },
    e_log: {
      text: `18:02, adult single, cash. She looks at it for a long moment and says, "That's him. That's the ten pence."

It is a good half hour. It proves he was on a bus, which nobody has denied, and it fixes an hour that helps him — but it is arithmetic, and the jury has already been given a young man who is *sure*, and arithmetic has never yet beaten a sure young man in front of twelve people.

Guilty, by a majority. The appeal, three years later, turns on a coat.`,
      ending: true,
    },
    e_light: {
      text: `You take her back to the light, and she breaks again, worse this time, in front of a jury that liked her yesterday.

The prosecution do not need to do anything at all. You have spent your one attack destroying the honest witness, and the rehearsed one is never asked a second question.

Guilty. It is the correct verdict on the evidence as it was left, and the evidence was left that way by you.`,
      ending: true,
    },

    e_nothing: {
      text: `You let it go to the jury as it stands: three witnesses, one hour, and a man whose only account of himself is that he went for a walk.

They are out for two days. When they come back, the foreman cannot look at the dock, which tells you before he speaks.

Somewhere in a laminated rota and a fifteen-minute gap on a door tape, the whole thing was sitting there. Nobody in the room was ever going to find it except you, and you were tired, and it was a Tuesday.`,
      ending: true,
    },
  },
}
