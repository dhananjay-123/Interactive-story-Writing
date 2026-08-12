/* The House Keeps Its Own Hours — the deepened graph.

   Someone is living in the house. Not a figure of speech, not a haunting, not
   eleven days of bad sleep: a person, in the boarded half of the back stair and
   the loft above the small back room, on the same electricity meter, keeping
   hours that peak at eleven and three. The previous owners left in the spring
   without a forwarding address because they worked it out and did not want to
   say it in writing to an estate agent.

   The three comfortable answers are all supported by something, which is the
   point — subsidence explains the sounds, the clocks really are wrong, and you
   really have not slept. None of them explains the meter. */

module.exports = {
  title: 'The House Keeps Its Own Hours',
  root: 'open',
  game: {
    objective: 'Work out what is actually happening in this house.',
    briefing: 'Four explanations fit everything you have written down. Three of them are comfortable.',
    solutionKey: 'someone-else-is-living-here',
    maxAttempts: 3,
  },
  nodes: {
    // ── Act I: the record ─────────────────────────────────────────────────
    open: {
      text: `The survey found nothing. The wiring passed. The previous owners left in the spring without a forwarding address, which the agent said was normal and which you have since learned is not.

You have been here eleven days, and on the ninth you started writing things down, which is not a thing you have ever needed to do in a house before.

The notebook is a good idea. It is also the first evidence that you already know something is wrong.`,
      choices: [
        ['Read back what you have written', 'notes'],
        ['Start with tonight', 'hubA'],
      ],
    },
    notes: {
      text: `Nine days of small entries in your own hand, and read together they are worse than they were one at a time.

*Landing light on, 3am — I turned it off at midnight.*
*Bread. Half a loaf. I have not eaten bread this week.*
*Bathroom warm at 6am. Nobody has run a bath.*

Each of those has an explanation and you wrote the explanation next to it every time, in the same pen, getting shorter.`,
      clues: [['Nine days of small entries that only make sense together', 'A light, a loaf, a warm bathroom. Each explained away, in a shortening hand.', 'clue', 2]],
      choices: [['Start with tonight', 'hubA']],
    },
    hubA: {
      text: `It is a Tuesday and it is a quarter to eleven, which the house has decided is early.

You have the notebook, a torch you bought on the fourth day, and a whole night in front of you.

You are going to be systematic about this, because being systematic is the only thing standing between you and the fourth explanation.`,
      choices: [
        ['Write down the noises', 'noise1'],
        ['Check the meter', 'meter1'],
        ['Go up to the loft', 'loft1'],
        ['Look at the small back room', 'back1'],
        ['That is enough for one night', 'hubB'],
      ],
    },

    noise1: {
      text: `Between two and half past, most nights, something moves on the floor above you.

You have been sleeping on the top floor since the first night.`,
      clues: [['Movement above the top floor, nightly, at two', 'You sleep on the top floor. There is no floor above it.', 'evidence', 3]],
      choices: [
        ['Go up while it is happening', 'noise2'],
        ['Time it properly instead', 'noise3'],
        ['Wait for the morning', 'noise4'],
      ],
    },
    noise2: {
      text: `You go up while it is happening. The landing light is off. The door to the small back room is closed.

It was open at eleven — you know because you closed the window in there yourself. There is no draught in this house. You sealed the sashes in week one, with your own hands, and you remember being pleased about it.`,
      clues: [['A door open at eleven, closed at two', 'No draught — you sealed the sashes yourself.', 'clue', 2]],
      choices: [['Back downstairs', 'hubA']],
    },
    noise3: {
      text: `You lie in the dark with the notebook and the torch off and you time it, which is the most frightening thing you have done in your life and takes forty minutes.

It is not random and it is not a pipe. It is eleven paces, a pause, and eleven paces back. The pause is always in the same place.

Pipes do not pause. Subsidence does not pause. A house settling into an old frame settles once and is done.`,
      clues: [['Eleven paces, a pause, eleven paces back', 'The same pause in the same place. Nothing structural pauses.', 'evidence', 3]],
      choices: [['Back downstairs', 'hubA']],
    },
    noise4: {
      text: `You wait for the morning, the way people do, and the morning makes it ridiculous. Pipes. Birds. An old house settling into an old frame.

It is ridiculous every morning for eleven mornings. It is not ridiculous at two.

You are aware, writing this down at eight in the kitchen, that you are constructing a defence of your own sanity for a jury of one.`,
      choices: [['That night', 'hubA']],
    },

    meter1: {
      text: `The meter has been reading for a household of four since the day you moved in alone.

You photograph it every night for a week and plot it out on the back of the survey. The curve is not yours. It peaks at eleven, and again at three.`,
      clues: [['The meter reads for four people and peaks twice', 'Eleven and three. Neither is one of your hours.', 'evidence', 3]],
      choices: [
        ['Compare it against your own hours', 'meter2'],
        ['Kill every circuit and watch it', 'meter3'],
        ['Back', 'hubA'],
      ],
    },
    meter2: {
      text: `Your hours are seven and eleven. You have never once been awake at three in this house, which is the entire reason you noticed.

The meter's hours are eleven and three. Two households. One supply. Only one of you is paying for it.`,
      clues: [['The meter’s hours are not your hours', 'Two households on one supply.', 'evidence', 3]],
      choices: [['Back', 'hubA']],
    },
    meter3: {
      text: `You throw every breaker in the board at half past eleven and stand in the dark with the torch on the dial.

It keeps turning. Slowly, steadily, the way a dial turns for a heater and a kettle and not much else.

There is a circuit in this house that does not come through your consumer unit. On the fifth day you would have called that a wiring fault. On the eleventh you know that a wiring fault does not make tea.`,
      clues: [['A circuit that keeps drawing with every breaker off', 'It does not come through your consumer unit.', 'evidence', 3]],
      choices: [['Back', 'hubA']],
    },

    loft1: {
      text: `The loft is boarded, insulated, and clean in the particular way that only a room somebody sweeps is clean.

There is no dust at all on the hatch frame. You have never opened this hatch.`,
      clues: [['No dust on a hatch you have never opened', 'And a loft that is clean the way a swept room is clean.', 'observation', 1, true]],
      choices: [
        ['Go up into it', 'loft2'],
        ['Look at where the boards stop', 'loft3'],
        ['Back', 'hubA'],
      ],
    },
    loft2: {
      text: `Boards for about two thirds of the run, then joists and wool.

Where the boards stop there is a folded blanket, an ashtray with nothing in it, and a paperback with a supermarket receipt in it for a shop four streets away.

The receipt is dated last Thursday. You have never been in that shop.`,
      clues: [['A blanket, an ashtray and a receipt from last Thursday', 'From a shop four streets away that you have never been in.', 'evidence', 3]],
      choices: [['Back down', 'hubA']],
    },
    loft3: {
      text: `The boarding stops at a party wall that should be solid brick to the ridge, because that is how a Victorian terrace is built and it is the one thing the survey was actually confident about.

It is not solid to the ridge. There is a gap at the top of about eighteen inches, dressed with a bit of felt, and the felt has been pushed aside and put back so many times that it has gone soft at the fold.`,
      clues: [['An eighteen-inch gap in the party wall, opened and closed many times', 'The felt has gone soft at the fold.', 'evidence', 3]],
      choices: [['Back down', 'hubA']],
    },

    back1: {
      text: `The small back room is nine feet by seven and has been empty since you moved in, and you have used it for boxes, and there are fewer boxes in it than you remember putting there.

The chimney breast is boxed in with plywood that is newer than everything around it.`,
      clues: [['New plywood boxing on an old chimney breast', 'Newer than everything around it.', 'clue', 2]],
      choices: [
        ['Get the plywood off', 'back2'],
        ['Look at the floor', 'back3'],
        ['Back', 'hubA'],
      ],
    },
    back2: {
      text: `Four screws, all of them turning easily, all of them the same brass as the day they went in.

Behind it: not a chimney. A stair — narrow, boxed, going up into the dark at the pitch they used for servants, with a rail worn smooth on the right-hand side.

Somebody screwed a sheet of plywood over a staircase, and somebody has been taking it off again.`,
      clues: [['A boarded servants’ stair behind the plywood', 'The rail is worn smooth on the right-hand side.', 'evidence', 3]],
      choices: [['Back', 'hubA']],
    },
    back3: {
      text: `The floorboards in front of the chimney breast are clean in a strip about two feet wide, and dusty everywhere else.

Not swept clean. Walked clean.

You put your own foot in it and it is not your size.`,
      clues: [['A strip of floor walked clean, and not to your size', 'Not swept. Walked.', 'evidence', 3]],
      choices: [['Back', 'hubA']],
    },

    // ── Act II: the daylight ──────────────────────────────────────────────
    hubB: {
      text: `Daylight is a different country and you are a different person in it, which is the trap.

You have a notebook full of things that are all, individually, explicable. What you do not have is anybody else's account of this house — and this house has had other people in it, and some of them are still four streets away.`,
      choices: [
        ['Ring the estate agent', 'agent1'],
        ['Knock next door', 'neigh1'],
        ['Go through the post', 'post1'],
        ['Read the survey properly', 'surv1'],
        ['Look at what the bins say', 'bin1'],
        ['You have enough', 'hubC'],
      ],
    },

    agent1: {
      text: `The agent is pleasant and fast and answers a slightly different question from the one you ask, twice, which you notice the second time.

The vendors moved abroad. No, she does not have a forwarding address. No, there was no chain. Yes, it was quick — very quick, actually, they took eleven thousand under asking.`,
      clues: [['The vendors took £11,000 under asking, in a hurry', 'No chain, no forwarding address, and a very quick sale.', 'clue', 2]],
      choices: [
        ['Ask why it was under asking', 'agent2'],
        ['Back', 'hubB'],
      ],
    },
    agent2: {
      text: `"They just wanted it done," she says, and then, because she is young and has not yet learned which silences to leave alone: "They wouldn't do viewings after four. We had to do them all in the morning."

She hears it as fussiness. She is describing two people who would not be in their own house in the dark.`,
      clues: [['The vendors refused any viewing after four o’clock', 'They would not be in the house in the dark.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    neigh1: {
      text: `The woman next door has been in her house thirty-one years and knows exactly who you are before you say it.

She is friendly on the step and does not ask you in, and she looks past your shoulder at your hallway twice while you are talking.`,
      choices: [
        ['Ask about the previous owners', 'neigh2'],
        ['Ask about the party wall', 'neigh3'],
        ['Back', 'hubB'],
      ],
    },
    neigh2: {
      text: `"Lovely couple. Kept themselves to themselves at the end."

*At the end* is doing work, and she knows it is, and she says the next part looking at the doormat: "He asked me once if I'd ever heard anything through the wall. I said only what you'd expect. He said that's what I thought too, and he laughed, and he didn't come round again."`,
      clues: [['The previous owner asked her what she heard through the wall', 'And never came round again after she answered.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },
    neigh3: {
      text: `"Ours is blocked," she says, meaning the loft. "They did it when I moved in. There's a gap up the top, mind, they never finished it properly."

Then, cheerfully, the sentence you will still be hearing in three years: "Number nineteen's the same. It's all one roof up there really, the whole row. You could walk it, if you were mad."

The whole row. Nine houses. One roof space with felt in the gaps.`,
      clues: [['The lofts run the length of the terrace', 'Nine houses, one roof space, felt in the gaps.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    post1: {
      text: `The post for the previous owners still comes, because the post always still comes.

Bank, dentist, a charity that will never give up. And one envelope a month, hand-addressed, that you have been putting on the hall shelf for eleven days.`,
      choices: [
        ['Open the hand-addressed one', 'post2'],
        ['Back', 'hubB'],
      ],
    },
    post2: {
      text: `You should not, and you do.

It is from a housing charity, addressed to the vendors, and it is about a man. It uses the word *placement* and the phrase *unwilling to engage*, and it asks whether he has been in touch, and it is the fourth such letter, and it gives a name.

Somebody has been writing to this address for a year about a person who is not on the electoral roll and has not been seen at any of the addresses the charity holds.`,
      clues: [['A charity has written four times about a man they have lost track of', 'Addressed here. Unwilling to engage. Not seen at any address they hold.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    surv1: {
      text: `The survey is forty pages and you read the summary in March and nothing else, like everybody.

Page twenty-nine, under Roof Space: *Access hatch inspected from ladder. Head-and-shoulders inspection only. Boarded area not lifted. Party wall not fully sighted.*

The wiring passed because the wiring was tested at the consumer unit. The loft found nothing because the loft was looked at from a ladder, from the neck up, for four minutes.`,
      clues: [['The survey was a head-and-shoulders look from a ladder', 'Boarded area not lifted. Party wall not fully sighted.', 'evidence', 2]],
      choices: [
        ['Look at what the survey says about the chimney', 'surv2'],
        ['Back', 'hubB'],
      ],
    },
    surv2: {
      text: `*Chimney breast to rear bedroom: boxed. Not opened. Assumed flue.*

Assumed. It is the most honest word in the document and it is doing more work than the other nine thousand.

You paid four hundred pounds for a professional to write down, in April, that he had not looked behind the plywood.`,
      clues: [['“Chimney breast: boxed. Not opened. Assumed flue.”', 'Four hundred pounds for a man to write down that he did not look.', 'clue', 2, true]],
      choices: [['Back', 'hubB']],
    },

    bin1: {
      text: `The bins go out on a Wednesday and you have put out one bag a week since you moved in, because you live alone and you eat badly.

Last Wednesday there were three.`,
      clues: [['Three bags out on a week you put out one', 'You live alone and you eat badly.', 'evidence', 2]],
      choices: [
        ['Look in the other two', 'bin2'],
        ['Back', 'hubB'],
      ],
    },
    bin2: {
      text: `Tins, mostly. Value range. A lot of them, and all of them opened with a knife rather than an opener, punched round the rim in the same clumsy way.

And a blister pack, empty, for something you have to be prescribed, with the pharmacy label torn off in a strip.

Nobody eats like this by choice. Somebody is eating like this because they cannot use your kitchen while you are in it.`,
      clues: [['Tins opened with a knife, and a torn-off pharmacy label', 'Somebody who cannot use the kitchen while you are in it.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    // ── Act III: the fourteenth night ─────────────────────────────────────
    hubC: {
      text: `The fourteenth night.

You have a notebook, a meter that reads for four, a stair behind a sheet of plywood, and a letter from a charity with a name in it.

Three of the four things you could believe are comfortable, and you have stopped being able to afford them.`,
      choices: [
        ['Go up the back stair', 'go_stair'],
        ['Sit at the bottom of it and wait', 'go_wait'],
        ['Ring the number on the charity letter', 'go_ring'],
        ['Screw the plywood back and sleep elsewhere', 'go_leave'],
        ['Ring the police', 'go_police'],
      ],
    },

    go_stair: {
      text: `You take the plywood off at midnight and stand at the bottom with the torch, and the stair goes up narrow and boxed with the rail worn smooth on the right.

You can hear the house being quiet in a way that is not the same as empty.`,
      choices: [
        ['Go up', 'e_up'],
        ['Call out first', 'e_callout'],
      ],
    },
    e_up: {
      text: `Eleven steps, a turn, and a space under the slope of the roof with a mattress in it, and a camping lamp, and a row of tins, and a man sitting up with a blanket round him who is more frightened of you than you are of him, which you would not have believed possible from the bottom of the stairs.

He has been here since before you bought it. He was here when the last couple were here. He has a name and it is the name in the charity's letter, and when you say it he starts to cry, and the two of you sit on the boards until it gets light.

The house is not haunted. The house has a person in it, and it always did.`,
      ending: true,
    },
    e_callout: {
      text: `You call up the stair, and the sound of it in that boxed space is the loudest thing this house has done in fourteen days.

Above you, something moves fast — eleven paces, no pause this time — and then the felt in the party wall goes across, and then nothing.

In the morning the mattress is there, and the lamp, and the tins, and the blanket folded. Nobody comes back. You never learn where along the row he went, and for the rest of the time you live in that house you listen at eleven and at three, and hear nothing, and cannot stop.`,
      ending: true,
    },

    go_wait: {
      text: `You sit at the bottom of the open stair with the torch off and your back against the wall, from half eleven, in the dark, in your own house.

At two the boards start above you. Eleven paces. The pause.`,
      choices: [
        ['Turn the torch on', 'e_torch'],
        ['Let it come down', 'e_down'],
      ],
    },
    e_torch: {
      text: `The beam goes up the boxed stair and lands on a pair of bare feet on the fourth step from the top, and the feet stop.

Neither of you says anything for a long moment. Then he says, "I'll go," and you say, "Wait," and are surprised to hear it.

He is fifty-one and he has been sleeping in the roofs of this terrace, on and off, for nine years. The charity has an address for him by the end of the month. You keep the plywood off, and you put a bolt on your own side, and both of those things are true and neither of them is cowardice.`,
      ending: true,
    },
    e_down: {
      text: `You let it come down, in the dark, without moving, because you have decided that you want to know more than you want to be safe.

He comes down eleven steps and past you close enough that you feel the air move, and goes into your kitchen, and puts the kettle on.

At eleven minutes past two you stand up and follow him in and say good evening, and he says it back, and that is how it begins — badly, and then, over a long autumn, not badly.`,
      ending: true,
    },

    go_ring: {
      text: `The charity's number is on the letterhead and the letterhead is a year old, and somebody answers on the fourth ring at nine in the morning, which is not what you expected of a charity or a Wednesday.`,
      choices: [
        ['Tell them everything', 'e_charity'],
        ['Ask what they know first', 'e_ask'],
      ],
    },
    e_charity: {
      text: `You read them the meter, the tins, the stair, the paces. The woman on the phone does not find any of it strange, which is the most upsetting part of the whole fortnight.

Two of them come on the Friday. They go up the back stair with a flask and they are up there fifty minutes, and when they come down there are three of them.

He is housed by December. You get a card at Christmas with no return address, and the meter reads for one.`,
      ending: true,
    },
    e_ask: {
      text: `They will not tell you anything, because he is not your business and you are not next of kin and there are rules, and the rules are the reason a man has been living in a roof for nine years without anybody writing it down anywhere except in four letters to an address he does not live at.

"If you see him," she says, "you can give him our number."

You put it under a tin on the loft boards. It is gone on the Thursday. You do not know what happens after that and you never will, and the meter goes back to reading for one in February.`,
      ending: true,
    },

    go_leave: {
      text: `You put the four brass screws back in at one in the morning with a cordless driver, and you pack a bag, and you sleep at your sister's for a week and tell her it is the boiler.`,
      choices: [
        ['Come back after a week', 'e_return'],
        ['Sell it', 'e_sell'],
      ],
    },
    e_return: {
      text: `The plywood is still screwed on. The meter has run all week for a household of four in a house with nobody in it.

That is the number you keep. Not the paces, not the felt, not the receipt — the fact that it did not need you there at all.

You take the screws out again in March, in daylight, with your sister on the phone, and what you find is a made bed.`,
      ending: true,
    },
    e_sell: {
      text: `You sell in the spring, quickly, eleven thousand under asking, to a couple who are pleased about the garden.

You do not do viewings after four. You do not mention the meter, and the survey they commission is a head-and-shoulders look from a ladder, and the wiring passes.

There is a moment on the step, handing over the keys, when the woman asks if there is anything else you would want to know if you were her, and you have about a second and a half to answer, and you say: the gutters.`,
      ending: true,
    },

    go_police: {
      text: `You ring 101 at ten past midnight and describe fourteen days as calmly as you can manage, and hear yourself doing it.

They come at half eleven the next morning: two of them, polite, unhurried, entirely used to this.`,
      choices: [
        ['Show them the meter first', 'e_pol_meter'],
        ['Show them the stair first', 'e_pol_stair'],
      ],
    },
    e_pol_meter: {
      text: `You start with the graph on the back of the survey and you watch the older one's face do the thing faces do.

They look at the loft from the ladder, from the neck up, for four minutes. They advise you to have the wiring checked. They give you a crime number for the missing bread, which is meant kindly.

They are gone by twelve. That night the paces come at two, and the pause is in the same place, and you lie there holding a crime number.`,
      ending: true,
    },
    e_pol_stair: {
      text: `You take the plywood off in front of them, which changes the temperature of the whole morning.

They go up. They come down with a man in a blanket and they are decent about it — more decent than the paperwork will be, which records a trespass and does not record nine years of roof space.

He is out by the afternoon and back on the row by the spring, three doors up, where the felt has gone soft at the fold. You know that because in April you hear him through the wall, at eleven and at three, in somebody else's house.`,
      ending: true,
    },
  },
}
