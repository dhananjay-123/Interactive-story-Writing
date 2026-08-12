/* Signal Discipline — the deepened graph.

   DRIFTWOOD is compromised. He controls the drop windows, and three drops ran
   early by exactly eleven minutes, which is the round trip from the drop to the
   tram-stop bench and back with a camera. In March he took over routing
   HALFLIGHT's material and the hedging vanished from the summaries, because a
   man who has already read a document tidies it before passing it on.

   PENNYWHISTLE is late for everything, always, which is a temperament and not a
   tell. CANDLE's tradecraft is genuinely terrible and has been unchanged for
   nineteen months, which is its own alibi. HALFLIGHT's writing changed because
   somebody upstream started editing it, not because HALFLIGHT did. */

module.exports = {
  title: 'Signal Discipline',
  root: 'open',
  game: {
    objective: 'Which of the four assets is compromised?',
    briefing: 'Three drops came early. One came twice. Nobody has an explanation that survives being written down.',
    solutionKey: 'driftwood',
    maxAttempts: 3,
  },
  nodes: {
    // ── Act I: the file ───────────────────────────────────────────────────
    open: {
      text: `The network has run for nineteen months on the assumption that boring is safe, and boring has held.

This month the traffic got interesting. Three drops arrived early. One arrived twice. Nobody has an explanation that survives being written down and read back.

You have four assets, a room with a lamp in it, and until the end of the month before the whole thing has to be either trusted or buried.`,
      choices: [
        ['Start with the file', 'file1'],
        ['Start with the duplicate', 'dup1'],
      ],
    },
    file1: {
      text: `Nineteen months in four folders, and the four folders are a portrait of four people.

PENNYWHISTLE is late for everything and always has been. DRIFTWOOD is early for everything and always has been. HALFLIGHT writes better than anyone in this service. CANDLE walks the same six streets in the same order on the same three days and has done since the first week.

None of that is evidence. All of it is the ground you have to read the evidence against.`,
      clues: [['Nineteen months of behaviour, all of it consistent', 'Which makes any change in it worth more than it looks.', 'clue', 2]],
      choices: [['Begin', 'hubA']],
    },
    dup1: {
      text: `The duplicate is the loudest thing in the month and you have been avoiding it because loud things are usually accidents.

The same package, at the same drop, twelve hours apart. Identical contents. Identical wrapping. A different string.`,
      clues: [['The duplicate package used a different string', 'Everything else about it was identical.', 'evidence', 2]],
      choices: [
        ['Work out who ties which knot', 'dup2'],
        ['Leave it for now', 'hubA'],
      ],
    },
    dup2: {
      text: `Everybody in this trade ties one knot and ties it the same way for thirty years, which is why the service used to teach it and does not any more.

The first package is CANDLE's knot, which is bad and fast and slightly wrong in a way you could pick out of a hundred.

The second package is also CANDLE's knot — tied by somebody copying it, tied too well, tied by a person who had the first package in front of them while they did it.`,
      clues: [['The duplicate’s knot is CANDLE’s, copied too carefully', 'Tied by somebody who had the original in front of them.', 'evidence', 3]],
      choices: [['Begin', 'hubA']],
    },
    hubA: {
      text: `Four assets, and the month is a third gone.

You can read paper for a week without leaving this room, and paper will get you a shortlist and never get you further than that. But you do not go onto a pavement until the paper has told you which pavement.`,
      choices: [
        ['Pull the drop timings', 'time1'],
        ['Re-read HALFLIGHT’s summaries', 'half1'],
        ['Check the courier’s route', 'cand1'],
        ['Look at PENNYWHISTLE’s lateness', 'penny1'],
        ['Enough paper', 'hubB'],
      ],
    },

    time1: {
      text: `Every early drop belongs to a window DRIFTWOOD controls. On its own that means nothing — somebody has to control the windows, and it is his job.

What means something is that all three were early by the same eleven minutes.`,
      clues: [['Three early drops, all early by eleven minutes', 'The same eleven. Not a range — a figure.', 'evidence', 3]],
      choices: [
        ['Work out what eleven minutes buys', 'time2'],
        ['Check the windows he did not control', 'time3'],
        ['Put it down to sloppiness', 'time4'],
      ],
    },
    time2: {
      text: `Eleven minutes is what it takes to walk a package from the drop to the tram stop, photograph it on the bench, and walk it back.

You have done it yourself, twice, with a stopwatch. Eleven minutes each time. The window is DRIFTWOOD's and so, it turns out, are the eleven minutes.`,
      clues: [['Eleven minutes is the walk to the tram stop and back', 'Timed twice, with a stopwatch, on the actual pavement.', 'evidence', 3]],
      choices: [['Back to the file', 'hubA']],
    },
    time3: {
      text: `Four windows in the month belong to somebody else — two to PENNYWHISTLE, two to the resident.

All four ran to time, within a minute, the way a drop does when nobody has touched it.

An error that only occurs inside one man's windows is not an error. It is a signature with the name filed off.`,
      clues: [['Windows outside DRIFTWOOD’s control all ran to time', 'Within a minute. The fault has a boundary.', 'evidence', 3]],
      choices: [['Back to the file', 'hubA']],
    },
    time4: {
      text: `You write it up as sloppiness, because sloppiness is what nineteen quiet months train you to expect.

It sits in the file for nine days, and every one of those days a package moves.

You take it out again on the tenth because you cannot sleep, which is not tradecraft, and is the only reason any of this ever gets caught.`,
      choices: [['Back to the file', 'hubA']],
    },

    half1: {
      text: `HALFLIGHT's summaries are excellent, and since March they have got worse in one specific way: the hedging has gone.

Analysts hedge. It is the whole discipline. An analyst who has stopped hedging is either very sure of something, or is no longer writing for us.`,
      clues: [['HALFLIGHT’s summaries stopped hedging in March', 'Analysts hedge. Something changed upstream of the writing.', 'clue', 2]],
      choices: [
        ['Ask what changed in March', 'half2'],
        ['Get the originals', 'half3'],
        ['Move on', 'hubA'],
      ],
    },
    half2: {
      text: `March is when DRIFTWOOD took over routing HALFLIGHT's material.

The hedging did not stop because the analyst became certain. It stopped because somebody in the middle started tidying, and tidying is what people do to a document they have already read.`,
      clues: [['In March, DRIFTWOOD took over routing HALFLIGHT’s material', 'The hedging stopped the same month.', 'evidence', 3]],
      choices: [['Back to the file', 'hubA']],
    },
    half3: {
      text: `The originals are supposed to be destroyed at the routing stage and are supposed to be destroyed by the router.

Four of them are not. They are in the bottom of the March folder, creased twice, and they are the same documents with about a hundred words more in them — *probably*, *it is possible that*, *on one reading* — every one of them cut.

Somebody kept the originals. People keep originals when they are being paid per page and want to be able to prove what they handed over.`,
      clues: [['Four un-destroyed originals, with the hedging cut out', 'Kept by the router. People keep originals when they are paid by the page.', 'evidence', 3]],
      choices: [['Back to the file', 'hubA']],
    },

    cand1: {
      text: `CANDLE's route is the same six streets it has always been, walked at the same pace, in the same order, on the same three days.

It is terrible tradecraft. It has been terrible tradecraft, unchanged, for nineteen months — which is its own peculiar kind of alibi.`,
      clues: [['CANDLE’s route has not changed in nineteen months', 'Terrible tradecraft, consistently. Which is an alibi of sorts.', 'observation', 1, true]],
      choices: [
        ['Walk it yourself', 'cand2'],
        ['Ask him why he never varies', 'cand3'],
        ['Move on', 'hubA'],
      ],
    },
    cand2: {
      text: `You walk his six streets on a Tuesday and understand him inside four minutes.

He is sixty-three. Two of the six streets have a bench in them and he needs both. The route is not a route; it is the distance a man with that hip can do without stopping in a doorway and being noticed for stopping.

He could not have varied it in nineteen months if the whole service had asked him to.`,
      clues: [['CANDLE’s route is dictated by his hip, not by choice', 'Two benches in six streets. He could not vary it if ordered to.', 'evidence', 2]],
      choices: [['Back to the file', 'hubA']],
    },
    cand3: {
      text: `"Because I am an old man and if I do it in a different order I will get it wrong."

He says it without embarrassment, which is the mark of somebody who has already had the argument with himself and lost it years ago.

Then he says something you write down: that in the last two months, twice, he has arrived to find the drop already emptied and has refilled it out of his own pocket rather than report a fault, because reporting a fault is how old couriers get retired.`,
      clues: [['CANDLE twice found the drop already emptied and said nothing', 'He refilled it himself rather than be retired for reporting a fault.', 'evidence', 3]],
      choices: [['Back to the file', 'hubA']],
    },

    penny1: {
      text: `PENNYWHISTLE has never once been early for anything in nineteen months, including the two occasions on which being early would have saved her a great deal of trouble.

Communications. Sits on a switch. Sees everything and understands about a third of it, which she is honest about.`,
      choices: [
        ['Test her lateness', 'penny2'],
        ['Ask her what crosses her desk', 'penny3'],
        ['Move on', 'hubA'],
      ],
    },
    penny2: {
      text: `You give her a meeting at four and she comes at twenty past, and apologises, and means it, and would have been late for her own execution.

Lateness of that order is not a discipline problem and it is certainly not tradecraft. It is a nervous system.

Whoever is walking eleven minutes to a bench and back is a person who is early on purpose. That is not her, and it has never once been her.`,
      clues: [['Lateness that consistent is temperament, not method', 'The eleven minutes belong to somebody who is early on purpose.', 'clue', 2, true]],
      choices: [['Back to the file', 'hubA']],
    },
    penny3: {
      text: `"Window changes," she says. "That's the only thing I see that anyone would want."

Window changes go out over her switch and come *in* from one desk, and she has noticed — because she notices small things and does not know what they mean — that since March they have started arriving twice: once in the ordinary form, and once again eleven minutes later, corrected.

She has assumed it was a fault on the line. She has been very apologetic about the fault on the line for four months.`,
      clues: [['Window changes have been arriving twice since March', 'The second copy comes eleven minutes later, corrected.', 'evidence', 3]],
      choices: [['Back to the file', 'hubA']],
    },

    // ── Act II: the pavement ──────────────────────────────────────────────
    hubB: {
      text: `Paper has given you a name and no proof, which is the worst possible position: it is the position in which people start believing what they have already decided.

Everything from here has to happen outdoors, in a city where you have four assets who all know your face, in the twelve days that are left.`,
      choices: [
        ['Sit on the tram stop', 'tram1'],
        ['Find where the film goes', 'film1'],
        ['Look at DRIFTWOOD’s money', 'mon1'],
        ['Meet DRIFTWOOD', 'drift1'],
        ['You have what you need', 'hubC'],
      ],
    },

    tram1: {
      text: `The bench at the tram stop faces a wall and has a shelter over it, which makes it the only place on that street where a man can hold something flat in his lap for ninety seconds without being seen from a window.

You sit on it for three days and see nothing, because nothing is scheduled.`,
      choices: [
        ['Look at the bench itself', 'tram2'],
        ['Get above it', 'tram3'],
        ['Back', 'hubB'],
      ],
    },
    tram2: {
      text: `The bench is iron and slatted and one slat, at the left-hand end, has been scrubbed clean of nineteen months of city.

Not worn. Cleaned — a rectangle about the size of a document, wiped over and over by paper being laid down flat and picked up again.

It is the most domestic piece of evidence you have ever stood over, and it is worth more than the whole March folder.`,
      clues: [['A document-sized rectangle scrubbed clean on the bench slat', 'Wiped by paper laid down and picked up, over and over.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },
    tram3: {
      text: `The room above the tobacconist is let by the week and the window over the shelter is the reason you take it.

On the fourth day, at a window he controls, a man in a grey coat sits down on the bench, opens a folded newspaper flat across his knees, and holds a small camera above it at the exact height a person holds a camera when they have done this a hundred times.

Eleven minutes later the package is back in the drop. You have the whole of it through a gap in a curtain and none of it on film, because you are a case officer and not a photographer, and you will regret that for a year.`,
      clues: [['A man photographing a document on the bench, for eleven minutes', 'Seen from the room above. Not photographed — you are not a photographer.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    film1: {
      text: `Film has to be bought, and it has to be developed, and in this city in this year both of those things leave a name behind.

There are nine places that develop privately. Seven of them will talk to a polite man with a plausible reason.`,
      choices: [
        ['Work the shops', 'film2'],
        ['Work the suppliers instead', 'film3'],
        ['Back', 'hubB'],
      ],
    },
    film2: {
      text: `The sixth shop is a widow with a back room and a ledger she keeps because the tax people are worse than the security people.

Every three weeks since the spring: eight rolls, document stock, collected by a man who pays in cash and always, always, arrives before the shop opens and waits.

"Very punctual," she says, with approval. "You could set the clock."`,
      clues: [['Eight rolls of document stock every three weeks, paid in cash', 'Collected by a man who arrives before opening and waits.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },
    film3: {
      text: `The suppliers are a shorter list and a colder trade and they tell you nothing at all about customers.

They do tell you, because it is a matter of commerce rather than confidence, that document stock in this quantity is bought by exactly three sorts of establishment in this city: two hospitals, a law printer, and nobody else.

You are not looking for a spy with a camera. You are looking for a small commercial operation with a schedule.`,
      clues: [['Document stock in that quantity has only three legitimate buyers', 'A schedule, not an enthusiast.', 'clue', 2]],
      choices: [['Back', 'hubB']],
    },

    mon1: {
      text: `Money is the last thing you look at, because money is the thing everybody looks at first and it has therefore been arranged for.

His pay goes into the account it has always gone into. His rent comes out of it. His mother's home is paid from it, quarterly, and has been for six years.`,
      choices: [
        ['Look at what is not in the account', 'mon2'],
        ['Look at the mother’s home', 'mon3'],
        ['Back', 'hubB'],
      ],
    },
    mon2: {
      text: `In nineteen months he has not once drawn cash beyond his standing weekly amount.

Which is impossible, because he pays for eight rolls of document stock in cash every three weeks, and he pays for the tram, and this is a city that runs on coins.

Somebody is being given cash. Cash that never enters an account never leaves a trace, except as a hole in the account where the ordinary withdrawals should be.`,
      clues: [['He never draws enough cash to cover what he demonstrably buys', 'The hole where ordinary withdrawals should be.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },
    mon3: {
      text: `The home is good, and it is expensive, and it has been expensive since the spring of last year when they moved her from the ward into a room of her own.

The room of her own costs slightly more than four times what the quarterly payment from his account covers.

The difference is paid at the desk, in cash, by a man the matron describes without prompting as *very punctual*.`,
      clues: [['His mother’s room costs four times what his account pays', 'The difference is paid at the desk in cash.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    drift1: {
      text: `He is glad to see you, and he is glad in the ordinary way of a man who has worked with you for two years, and that is the part nobody warns you about.

He is a good officer. He has been a good officer this entire time, which is why it took a month.`,
      choices: [
        ['Ask about the eleven minutes', 'drift2'],
        ['Ask about March', 'drift3'],
        ['Say nothing about any of it', 'hubB'],
      ],
    },
    drift2: {
      text: `"The windows move," he says. "They have always moved. You have signed off on them moving for two years."

Which is true. Every early window in the month is inside a tolerance he is authorised to use and has used, correctly, four hundred times.

Then he says: "Early is safer," and you agree with him, because it is, and because the sentence is the first one all month that he has said carefully.`,
      clues: [['He defends the early windows with a prepared sentence', 'Everything else he says is unprepared. That one is not.', 'clue', 2]],
      choices: [['Back', 'hubB']],
    },
    drift3: {
      text: `March he answers easily and at length: he took the routing because HALFLIGHT was overloaded, which is documented, and because nobody else wanted it, which is also documented.

At the end he adds, unprompted, that he has been destroying the originals as required.

You have four of them in a folder in a room eleven streets away, creased twice, with the hedging cut out.`,
      clues: [['He states that he destroys the originals as required', 'You are holding four he did not.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    // ── Act III: the last week ────────────────────────────────────────────
    hubC: {
      text: `Six days.

You can be right and unable to prove it, which gets a network rolled up and an officer transferred; or you can be right and able to prove it, which requires you to let one more package go through a man's hands on purpose.

There is no version of the next six days in which nobody is used.`,
      choices: [
        ['Run a marked document', 'go_bait'],
        ['Take him on the bench', 'go_bench'],
        ['Report it upstairs and hand it over', 'go_report'],
        ['Roll the network up quietly', 'go_roll'],
        ['Put it to him alone', 'go_face'],
      ],
    },

    go_bait: {
      text: `Three documents, three assets, three different false figures in the same paragraph — the oldest trick in the trade and the only one that has never stopped working.

DRIFTWOOD's copy says the fuel depot holds eleven thousand.`,
      choices: [
        ['Wait for it to come back', 'e_bait_back'],
        ['Watch the bench while you wait', 'e_bait_watch'],
      ],
    },
    e_bait_back: {
      text: `It comes back in nine days, in an intercept, in the enemy's own summary: *depot capacity eleven thousand.*

Nobody else on earth had that number. It went into one man's hands and came out of a different service's mouth, and the whole thing fits on one side of a page.

He is lifted on a Thursday morning between the film shop and the tram stop, with eight rolls of document stock in a paper bag. He does not say anything at all for two days, and then he asks about his mother's room, and that is the first question he asks.`,
      ending: true,
    },
    e_bait_watch: {
      text: `You take the room above the tobacconist again and you watch him do it: newspaper flat, camera up, eleven minutes.

This time there is a photographer in the room with you, and the plates are good enough to print.

The case is over before the marked figure ever comes back. It is faster, and it is cleaner, and it means you never learn who he was handing it to — a man in a grey coat with a camera goes to prison and the person who paid him goes on paying somebody else by August.`,
      ending: true,
    },

    go_bench: {
      text: `You put four people on the street and take him at the bench, in the eleven minutes, with the package open on his knees.`,
      choices: [
        ['Take the camera', 'e_bench_cam'],
        ['Let him finish and follow the film', 'e_bench_follow'],
      ],
    },
    e_bench_cam: {
      text: `The camera has a roll in it with nine exposures on it and the ninth is the page under his hands, and there is no version of that photograph that is anything other than what it is.

It is the shortest interrogation of your career. He asks for a cigarette, says "How long?", and when you tell him a month he says, "That's about right," and seems, more than anything, relieved.

The network runs another four years under somebody else and does good work, and none of the four ever learns which of them it was.`,
      ending: true,
    },
    e_bench_follow: {
      text: `You let him walk, and the film goes to the widow's back room, and out of the widow's back room it goes into a coat pocket at a tram stop two districts north.

The coat pocket belongs to a man with diplomatic accreditation, which means the whole thing ends in a note verbale and an aeroplane.

DRIFTWOOD gets eleven years. The widow, who did nothing but develop film for a punctual customer, loses the shop. You think about the shop more than you think about the eleven years.`,
      ending: true,
    },

    go_report: {
      text: `You write it up properly, all of it, in the order it happened, and you send it to a building where people are paid to make this kind of decision so that you do not have to.`,
      choices: [
        ['Send the whole file', 'e_rep_all'],
        ['Send the conclusion only', 'e_rep_short'],
      ],
    },
    e_rep_all: {
      text: `Forty pages, eleven exhibits, and a covering note of nine lines.

It takes them five weeks, which is four weeks longer than it should and two weeks less than you feared, and at the end of it they do exactly what you would have done, with more resources and less regret.

You are commended in a paragraph you never see and moved to a desk in a different city. Somebody else takes him on the bench. You read about it in the internal digest, under a heading, in four sentences, and you have to read it twice to be sure it is yours.`,
      ending: true,
    },
    e_rep_short: {
      text: `Four lines: DRIFTWOOD is compromised, recommend immediate suspension of his windows.

Without the file behind it, four lines from a case officer about his own logistics man reads exactly like a case officer who has fallen out with his own logistics man.

They suspend nothing. They ask for the file. By the time the file has gone up, the film shop has been visited by somebody who is not you, the widow's ledger has been lost, and DRIFTWOOD has requested and been granted a transfer to the coast.`,
      ending: true,
    },

    go_roll: {
      text: `You can end it without ever proving anything: stand everybody down, burn the windows, move the drops, and let a network die of natural causes.

Nineteen months of work, three assets who did nothing wrong, and one who never has to answer for it.`,
      choices: [
        ['Stand them all down', 'e_roll_all'],
        ['Stand down everything except his windows', 'e_roll_trap'],
      ],
    },
    e_roll_all: {
      text: `It takes nine days and it is the least dramatic thing you will ever do.

CANDLE retires and is genuinely relieved. PENNYWHISTLE is late to her own stand-down meeting. HALFLIGHT asks, once, whether the summaries were any good, and you tell her the truth, which is that they were the best thing in the file.

DRIFTWOOD shakes your hand. Two years later you see his name on a list of people being trusted with something larger, and you have nothing to say about it that anybody would act on.`,
      ending: true,
    },
    e_roll_trap: {
      text: `Everything goes quiet except the windows one man controls, which stay open, feeding a drop that now contains nothing but paper written by you.

He photographs it for eleven weeks. Every word of it is invented, and every word of it turns up in an intercept, and by the end of the summer you have a chain of eleven documents that only ever existed in his hands.

It is the strongest case anybody in the station has ever built. It also means eleven weeks in which a hostile service believed a great many useful things, and there is an argument, made afterwards by people who were not there, that you should have left it running longer.`,
      ending: true,
    },

    go_face: {
      text: `A room, two chairs, no witnesses, and everything you have in a folder you do not open.

It is against every rule of the trade and you do it anyway, because he is a good officer and because you want to hear it from him before it becomes a procedure.`,
      choices: [
        ['Show him the bench', 'e_face_bench'],
        ['Ask him about his mother', 'e_face_mother'],
      ],
    },
    e_face_bench: {
      text: `You describe the slat: the rectangle scrubbed clean by paper laid down and picked up, over and over, for four months.

He looks at his hands. Then he says, "It's iron. I thought it would mark the paper," and hears himself say it, and stops.

He gives you the whole of it in two hours, including the two names you did not have. He asks for nothing. On the way out he says the thing that stays with you: that the first time was eleven minutes and he told himself he could put it back.`,
      ending: true,
    },
    e_face_mother: {
      text: `You should not, and you do.

He is on his feet before you finish the sentence, and what comes out of him is not a confession, it is nineteen months of a man carrying something alone — the ward, the room, the desk, the cash, the punctuality.

Then he is quiet, and then he says he wants a lawyer, and the door of the whole thing closes. He never confirms a word of it. The case is made anyway, on the film shop and the ledger, but it takes a year and it is a bad year, and it did not have to be.`,
      ending: true,
    },
  },
}
