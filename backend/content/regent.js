/* The Regent's Nine — the deepened graph.

   Isolde Mear has kept a record of the regent's health at every council sitting
   for eleven years, in a small clean hand, in a book nobody has ever asked to
   read. It is a verbatim record, because a physician writing down a stammer
   writes down the words around it. She has been selling the book for two years.
   She pours the wine and does not drink it.

   Havel Sarn's debts are real and are not treason. Bren Callow is being
   blackmailed, which is fear rather than payment. Aurelie says nothing because
   she has already worked it out and is waiting to see who else does. */

module.exports = {
  title: "The Regent's Nine",
  root: 'open',
  game: {
    objective: 'Which of the nine has already been paid?',
    briefing: 'The letter is exact. Someone in that room was writing.',
    solutionKey: 'isolde-mear',
    maxAttempts: 3,
  },
  nodes: {
    // ── Act I: the chamber ────────────────────────────────────────────────
    open: {
      text: `Nine chairs, nine cups, and a letter in the enemy's hand that quotes a sentence spoken in this room on a night when the doors were barred from the inside.

Someone at this table has already been paid, and is sitting at it still.

The regent has given you until the moon turns, which is eleven days, and has given you no authority whatsoever, which is how these things are always given.`,
      choices: [
        ['Read the letter again', 'letter1'],
        ['Look at the room itself', 'room1'],
      ],
    },
    letter1: {
      text: `The quoted sentence is exact. Every word — including the regent's stammer on *Callow*, written out as a stammer, with the repetition marked.

Nobody reproduces a stammer from memory. You reproduce it from a page.`,
      clues: [['The letter reproduces the regent’s stammer', 'Written out as a stammer. Taken down as it was said.', 'evidence', 3]],
      choices: [
        ['Ask who writes at council', 'letter2'],
        ['Look at how the letter was made', 'letter3'],
        ['Enough of the letter', 'hubA'],
      ],
    },
    letter2: {
      text: `Nobody writes at council. That is the entire point of council.

Nobody except the physician, who has kept a record of the regent's health at every sitting for eleven years — in a small clean hand, in a book that nobody has ever once asked to read.`,
      clues: [['Only the physician writes at council', 'Eleven years of health records nobody has asked to read.', 'evidence', 3]],
      choices: [['To the chamber', 'hubA']],
    },
    letter3: {
      text: `Good paper, poor ink, and a fold that has been made twice — once carefully, once in a hurry.

The hand is a clerk's hand and the clerk is four hundred miles away and has copied what he was given. What he was given was not a letter. It was a page of notes, because the copy carries a marginal mark at the end of the quoted sentence: a small hooked stroke of the kind a person makes when they are indicating *and here he coughed*.

Somebody sold notes. Somebody's notes were copied out by a stranger who did not know which marks were meant to be words.`,
      clues: [['A marginal physician’s mark copied out as if it were text', 'The clerk did not know which strokes were words.', 'evidence', 3]],
      choices: [['To the chamber', 'hubA']],
    },
    room1: {
      text: `A round table, which was somebody's idea of preventing exactly this.

Nine chairs, and the chairs matter: the regent north, his sister at his left hand, the Master of Coin where the light is best because he reads figures, the Northern Watch by the door because he has never in his life sat away from a door.

And the physician between the regent and the sideboard, because that is where the water is, and because a physician sits where she can see a face.`,
      clues: [['The physician sits where she can watch a face and reach the sideboard', 'The only seat at the table chosen for what it can see.', 'clue', 2]],
      choices: [['Begin', 'hubA']],
    },
    hubA: {
      text: `The council sits again on the fourth day. Until then the nine are nine separate people in nine separate parts of a castle, and separate is the only condition in which any of them will say anything true.

You will not get all of them. You will get some of them, and what you do not ask about now you will be asking about after somebody is dead.`,
      choices: [
        ['Ask who poured the wine', 'wine1'],
        ['Watch the Master of Coin', 'coin1'],
        ['Watch the Northern Watch', 'watch1'],
        ['Approach the regent’s sister', 'sis1'],
        ['Enough for now', 'hubB'],
      ],
    },

    wine1: {
      text: `The physician poured, as she does every council night, and she poured for everyone including herself.

That is the point of pouring for yourself. It is also, if you have been at court long enough, the point of appearing to.`,
      clues: [['The physician pours for everyone, herself included', 'Which proves nothing, and is meant to.', 'clue', 2]],
      choices: [
        ['Watch her drink', 'wine2'],
        ['Ask the steward about the cups', 'wine3'],
        ['Leave it', 'hubA'],
      ],
    },
    wine2: {
      text: `She raises the cup. She drinks. Her throat does not move.

It is the smallest thing in the world, and you have watched a hundred honest people do it honestly, which is exactly how you know what it looks like when somebody does not.`,
      clues: [['She raises the cup but her throat does not move', 'She has been not-drinking her own wine for some time.', 'evidence', 3]],
      choices: [['Back', 'hubA']],
    },
    wine3: {
      text: `The steward is sixty and has washed the council cups since before the regent was regent, and he is pleased to be asked about anything at all.

Eight cups come back wet at the bottom, he says, and one comes back wet all the way up, because it goes back full and gets emptied into the rushes by the door on the way to the scullery.

He has assumed for two years that somebody at that table is being poisoned and is too well-bred to say so.`,
      clues: [['One cup comes back to the scullery still full', 'Emptied into the rushes by the door, for two years.', 'evidence', 3]],
      choices: [['Back', 'hubA']],
    },

    coin1: {
      text: `Havel Sarn owes money in three cities, which everybody knows, including the people he owes it to, which is why he is still alive.

He receives you in a room with the accounts open, which is either candour or the appearance of it.`,
      choices: [
        ['Ask about the debts', 'coin2'],
        ['Look at the accounts', 'coin3'],
        ['Leave him', 'hubA'],
      ],
    },
    coin2: {
      text: `He tells you the figure without being pressed, and it is worse than the rumour, and he tells you that too.

"If I were being paid," he says, "I would not owe eleven thousand in Vaal. That is the difficulty with buying a man like me. I am extremely expensive and I stay bought for about a fortnight."

It is the most honest thing anyone says to you all week, and it is also exactly what a bought man would say, and you will spend two days on that before you let it go.`,
      clues: [['Sarn’s debts are worse than the rumour, and he says so first', 'A man being paid does not still owe eleven thousand in Vaal.', 'clue', 2, true]],
      choices: [['Back', 'hubA']],
    },
    coin3: {
      text: `Two years of the household book, and one thing in it that is not a debt.

The physician's stipend was raised in the spring of the year before last — not by the regent, and not by the council, but by a warrant against the privy purse that carries the regent's seal and not his hand.

Sarn noticed at the time. He assumed it was a kindness. He assumed it because the alternative required him to think about the physician at all, and nobody does.`,
      clues: [['The physician’s stipend was raised by a sealed warrant, not by the regent’s hand', 'Two springs ago. Nobody queried it, because nobody thinks about the physician.', 'evidence', 3]],
      choices: [['Back', 'hubA']],
    },

    watch1: {
      text: `Bren Callow spends the evening being obviously suspicious: the wrong answers, the silences that run a beat too long, the hand that keeps finding his belt and leaving again.

He is a man being blackmailed. That is a different animal from a man being paid, and it wears its fear on the outside.`,
      clues: [['Callow behaves like a man being blackmailed', 'Frightened, not bought. A different animal.', 'observation', 1, true]],
      choices: [
        ['Corner him', 'watch2'],
        ['Find out who has the hold', 'watch3'],
        ['Leave him', 'hubA'],
      ],
    },
    watch2: {
      text: `He goes to pieces so fast that you have to hold his arm, and what comes out is a son in the enemy's country, and a letter every season with a lock of hair in it, and eleven months of doing nothing at all in exchange for the boy staying alive.

Nothing at all. He has passed nothing. He has been paralysed, which is what the enemy actually bought, and it was cheaper than a traitor and it worked.

He asks you what he should have done. You do not have an answer that is any use to a father.`,
      clues: [['Callow has been bought with a son, and has passed nothing', 'They purchased his paralysis. It was cheaper.', 'evidence', 3]],
      choices: [['Back', 'hubA']],
    },
    watch3: {
      text: `Whoever holds Callow knows about the boy, and the boy was placed eleven months ago through a house of physic in the border towns — which is the only route by which a child crosses that frontier and lives.

Letters of physic. Sealed, unopened at the border by custom, carried by the same courier that brings the regent's own medicines up from the coast.

There is a road into this castle that nobody has ever searched, and it is a medical road.`,
      clues: [['Letters of physic cross the frontier unopened, by custom', 'The same courier brings the regent’s medicines up from the coast.', 'evidence', 3]],
      choices: [['Back', 'hubA']],
    },

    sis1: {
      text: `Aurelie says almost nothing, ever, and has therefore been described as simple by four ambassadors, all of whom went home poorer than they arrived.

She lets you stand for a while before she gestures at the other chair.`,
      choices: [
        ['Ask her outright', 'sis2'],
        ['Say nothing and see what she does', 'sis3'],
        ['Withdraw', 'hubA'],
      ],
    },
    sis2: {
      text: `"You want me to name someone," she says. "If I name someone, you will believe me, because I have said almost nothing for nine years and you will take the one thing I say as weighty. That is exactly why I will not."

Then, after a while: "Ask yourself who in that room has a reason to be holding a pen that everyone in the room finds *reassuring*."

She goes back to her book. She has told you the answer and left you to earn it, which is the only way anyone ever keeps it.`,
      clues: [['Aurelie points at the one pen in the room nobody minds', 'She will not name it. She has been waiting to see who works it out.', 'clue', 2]],
      choices: [['Back', 'hubA']],
    },
    sis3: {
      text: `You sit for eleven minutes without speaking and she lets you, and at the end of it she says: "Good. Most of them cannot manage two."

She tells you one fact and no more: on the night the doors were barred, she counted the cups when they came back, from habit, because she counts everything.

Nine went out. Nine came back. One was heavy.`,
      clues: [['Aurelie counted the cups: nine out, nine back, one heavy', 'She counts everything, from habit, and says nothing.', 'evidence', 3]],
      choices: [['Back', 'hubA']],
    },

    // ── Act II: the eleven days ───────────────────────────────────────────
    hubB: {
      text: `Seven days left, and a court that has begun to enjoy the situation.

The thing about a barred room is that it narrows the question to nine people, and the thing about nine people is that eight of them will help you very enthusiastically in order to be seen helping.

What you need is not help. What you need is the book, or the road, or the money — and those are all kept by people who are extremely good at keeping.`,
      choices: [
        ['Get near the physician’s book', 'book1'],
        ['Follow the medicine road', 'road1'],
        ['Find where the money came in', 'money1'],
        ['Search the chamber itself', 'cham1'],
        ['You are ready to move', 'hubC'],
      ],
    },

    book1: {
      text: `The book is not hidden, which is the whole art of it. It sits on the shelf in the physic room between a herbal and a ledger of stores, and it has sat there for eleven years, and three regents' worth of guards have walked past it.

She writes in it at every sitting. Everyone has watched her do it a thousand times and nobody has ever once wondered what a health record contains.`,
      choices: [
        ['Read a page from last year', 'book2'],
        ['Read the page for the barred night', 'book3'],
        ['Leave it where it is', 'hubB'],
      ],
    },
    book2: {
      text: `*Colour poor. Breath short on the stair. Took water twice. Spoke thirty-one minutes, without difficulty until the fourth hour, thereafter the stammer on hard consonants —*

And then, in the same clean hand, in the same line, without any change of manner: the words he was saying when the stammer came.

You cannot record a stammer without recording the sentence it happened in. It is not a loophole. It is the honest necessity of the task, and somebody worked out two years ago that it was worth money.`,
      clues: [['A health record cannot note a stammer without noting the sentence', 'The verbatim is not a trick. It is the honest necessity of the task.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },
    book3: {
      text: `The page for the barred night is there, and it is full, and it contains the quoted sentence word for word including the repetition on *Callow*.

It also contains, at the foot, a small hooked stroke.

The same stroke is in the enemy's letter, copied out by a clerk four hundred miles away who did not know what it meant.`,
      clues: [['The book’s page and the enemy’s letter carry the same hooked stroke', 'One is a physician’s mark. The other is a copy of it.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    road1: {
      text: `The medicine road runs from the coast in eleven stages and has never been searched, because searching a physician's packet is how you become the man who delayed the regent's heart tincture.

The courier is a woman of about fifty who has done the run for nine years and is frightened of exactly one thing on this earth, which is the physic house at the border.`,
      choices: [
        ['Ask her what she carries', 'road2'],
        ['Ask her what comes back', 'road3'],
        ['Let her go', 'hubB'],
      ],
    },
    road2: {
      text: `Tinctures, mostly, and a sealed packet of correspondence between houses of physic, which by treaty nobody opens.

She has never opened one. She would like it on record that she has never opened one. She says this four times, which is three more than a person says a true thing.`,
      clues: [['Sealed physic correspondence crosses by treaty, unopened', 'The courier insists she has never opened one. Four times.', 'clue', 2]],
      choices: [['Back', 'hubB']],
    },
    road3: {
      text: `"Nothing comes back. I go down empty."

Then she thinks, and corrects herself, because she is honest and it costs her: except the winter before last, and the spring, and last autumn — three times — when the physician gave her a packet for the border house, sealed, and told her it did not need entering in the book.

Three packets. Three seasons. And the letter you are holding quotes a night from the winter before last.`,
      clues: [['Three sealed packets sent down the road, unentered', 'Winter before last, spring, last autumn. All from the physician.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    money1: {
      text: `Money that comes into a castle has to become something: land, plate, cloth, a horse, a debt paid.

It does not become any of those in the physician's case, which is what makes it hard, and which is also what makes it certain when you finally find it.`,
      choices: [
        ['Follow the stipend warrant', 'money2'],
        ['Ask who has been paying the border house', 'money3'],
        ['Back', 'hubB'],
      ],
    },
    money2: {
      text: `The warrant is real, sealed, and was issued by the chancery on the strength of a note that the chancery no longer has.

Sealed warrants require the seal, and the seal lives in a box in the regent's own chamber, and the regent's own chamber is entered every morning and every night by exactly one person who is not a servant: the woman who takes his pulse.

Nobody has ever counted that as access. Nobody counts a physician as anything but furniture.`,
      clues: [['The seal lives where only the physician is admitted twice daily', 'Nobody has ever counted a physician as access.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },
    money3: {
      text: `The border house of physic has taken a boy of nine and kept him alive for eleven months, and somebody is paying his board.

The house keeps beautiful accounts, as physicians do. The board is paid quarterly, from the north, in the name of a widow who does not exist, in a hand that slopes hard to the left.

Isolde Mear is left-handed. You have watched her pour with it for a week.`,
      clues: [['Callow’s son’s board is paid quarterly, in a left hand', 'From the north, in the name of a widow who does not exist.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    cham1: {
      text: `The council chamber, empty, in the afternoon, with the shutters open and a servant of yours at each door.

Barred from the inside. One table, nine chairs, a sideboard, a fireplace that has not been lit since spring, and rushes by the door.`,
      choices: [
        ['Search the rushes', 'cham2'],
        ['Search the sideboard', 'cham3'],
        ['Back', 'hubB'],
      ],
    },
    cham2: {
      text: `The rushes by the door have been changed since the barred night, but rushes are changed by throwing new ones over old, because nobody has ever in the history of castles actually lifted them.

Underneath, the floor is stained in a patch about a foot across, dark and repeated, in a place where no cup has ever been set down.

Somebody has been emptying a cup here, quietly, for a long time.`,
      clues: [['A repeated wine stain under the rushes by the door', 'Where no cup has ever been set down.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },
    cham3: {
      text: `The sideboard holds the water jug, the cups, and a shelf below it that is exactly the depth of a book.

There is a ring of dust missing from that shelf, in a rectangle, and the rectangle is the size of the book that lives in the physic room and has apparently never left it.

It leaves it every council night. It comes back before dawn.`,
      clues: [['A book-shaped gap in the dust on the sideboard shelf', 'The book that supposedly never leaves the physic room.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    // ── Act III: the ninth day ────────────────────────────────────────────
    hubC: {
      text: `Two days, and the council sits tomorrow.

You could name her tonight and be believed by four of the nine, which is not enough, and the four would be the wrong four.

Or you could let the room do it, which is slower and requires you to sit through one more evening of watching a woman not drink her own wine.`,
      choices: [
        ['Feed a false sentence into the council', 'go_bait'],
        ['Seize the book before the sitting', 'go_seize'],
        ['Take it to the regent privately', 'go_regent'],
        ['Have the road watched instead', 'go_road'],
        ['Name her in open council', 'go_name'],
      ],
    },

    go_bait: {
      text: `You give the regent one sentence to say and ask him to say it badly — to stammer on a word he has never stammered on, in a matter of no importance, before the barred doors are opened.

He is delighted. It is the first useful thing anyone has asked of him in a year.`,
      choices: [
        ['Wait for it to come back', 'e_bait_wait'],
        ['Search the packet before it goes', 'e_bait_seize'],
      ],
    },
    e_bait_wait: {
      text: `It takes five weeks, which is four and a half weeks longer than you can comfortably wait and exactly as long as a road is.

It comes back in a letter to the border command, quoted, with the invented stammer marked, in a clerk's hand, with a small hooked stroke at the end of the line.

She is taken at the sideboard on a Tuesday with the book under her arm. She does not deny any of it. She says only that she was paid in the second year and asked in the first, and that nobody at that table has ever once asked her what she was writing.`,
      ending: true,
    },
    e_bait_seize: {
      text: `You take the courier's packet at the second stage of the road, in a barn, at four in the morning, and you break a treaty seal to do it.

Inside: the sentence, the invented stammer, the hooked stroke. Also eleven months of correspondence about a boy of nine.

The treaty breach costs you your position by the autumn. The border house is closed. Bren Callow gets his son back in the spring and cannot speak when he tries to thank you, and that is the only part of the whole business you would do again.`,
      ending: true,
    },

    go_seize: {
      text: `The physic room at dusk, with two of your own men and no warrant of any kind.

The book is on the shelf between the herbal and the ledger of stores, exactly where it has been for eleven years.`,
      choices: [
        ['Take it and read it in front of her', 'e_seize_her'],
        ['Take it to the council table', 'e_seize_table'],
      ],
    },
    e_seize_her: {
      text: `She watches you read it and does not reach for it, and when you get to the barred night she says, "The hook means he coughed."

Then she tells you the whole of it standing up, in order, in the same voice she uses for a fever: what she was offered, when, by whom, and what she has sent.

She asks that the boy at the border house be got out before the arrest is announced, because they will move him. It is the only condition she asks for, and she asks for nothing for herself, and you find that harder to carry than the treason.`,
      ending: true,
    },
    e_seize_table: {
      text: `You carry it into council and put it on the table and read the page for the barred night out loud to eight people who have never wondered what a health record contains.

The room turns on her in about four seconds, which is the trouble: it turns before it understands, and a room that convicts in four seconds will acquit in four seconds when her advocate points out that a physician is *required* to record the words around a stammer.

It takes nine weeks and two more letters to get there properly. You get there. It costs a season and one of your witnesses.`,
      ending: true,
    },

    go_regent: {
      text: `He is fifty-eight and he has been ill for nine years and she has been in his room twice a day for all of them.

You tell him at the window, quietly, with the evidence in order.`,
      choices: [
        ['Let him decide', 'e_reg_decide'],
        ['Ask him to say nothing until the sitting', 'e_reg_wait'],
      ],
    },
    e_reg_decide: {
      text: `He listens all the way to the end, which is more than most men would.

Then he says: "She has had my wrist in her hand every morning for nine years. If she had wanted me dead I would have been dead in the first."

He is right, and it is not the point, and he knows it is not the point. He has her sent away rather than tried — a house on the coast, a stipend, no charge laid. The letters stop. The war goes badly for other reasons.

You are thanked, in private, for something that officially never occurred.`,
      ending: true,
    },
    e_reg_wait: {
      text: `He holds his peace for one day, which for a man who has been ill and lonely for nine years is a considerable act of discipline.

At the sitting she pours, and he does not drink, and he says the sentence you gave him with the stammer in the wrong place — and you watch her hand stop for half a beat before it writes.

Half a beat, in front of nine people, four of whom are watching because you asked them to. That is what convicts her: not the book, not the road, not the money. A pen that hesitated.`,
      ending: true,
    },

    go_road: {
      text: `You leave the castle alone and put three men on the medicine road instead, at the second stage, and you wait for a season.`,
      choices: [
        ['Wait the season out', 'e_road_wait'],
        ['Bring the border house into it', 'e_road_house'],
      ],
    },
    e_road_wait: {
      text: `Autumn packet, sealed, unentered in the book, handed over at the second stage by a courier who is not told why she is being stopped.

Inside: eleven weeks of council, verbatim, in a small clean hand, with the hooked strokes intact.

She is arrested at the sideboard. Havel Sarn, who has been under suspicion the entire time and has known it, sends you a cask of something extremely good with a note reading *I told you I was too expensive.*`,
      ending: true,
    },
    e_road_house: {
      text: `You write to the border house of physic, as one careful institution to another, asking after the accounts of a widow who does not exist.

They are physicians. They answer honestly, at length, and in the meantime somebody there tells somebody else.

By the time your letter comes back the packets have stopped, the book has been burned in the physic room grate, and Isolde Mear has asked leave to attend a sister in the south. The regent grants it. He is genuinely sorry to lose her.`,
      ending: true,
    },

    go_name: {
      text: `You say it in open council on the tenth day, with the nine in their chairs and the doors barred behind you, because you have decided that a room which has been lied to in company should be told the truth in company.`,
      choices: [
        ['Name her and produce the book', 'e_name_book'],
        ['Name her and let her answer', 'e_name_answer'],
      ],
    },
    e_name_book: {
      text: `You name her, and then you put the book on the table before anybody can speak, open at the barred night, beside the enemy's letter, with the two hooked strokes an inch apart.

Nobody in the room can read a physician's mark. Everybody in the room can see that the two pages match.

It is over inside a minute. Aurelie, at the regent's left hand, says the only thing she has said in council in nine years: "Yes." She had it in the winter, and said nothing, and would have gone on saying nothing until somebody else got there — which is either patience or cowardice, and which she does not afterwards ask you to decide.`,
      ending: true,
    },
    e_name_answer: {
      text: `You name her without the book, because you want the room to watch her answer.

She answers extremely well. She is a physician: she has spent thirty years telling frightened people true things in a calm voice, and she turns that instrument on eight frightened lords and it works.

By the time you send for the book it is ash, and you are the man who accused the regent's doctor at his own table with nothing in his hands. You are a fortnight from the coast road by the end of the month.

She keeps writing for another two years.`,
      ending: true,
    },
  },
}
