/* The Building Does Not Have a Fourth Floor — the deepened graph.

   The way out is the goods lift: a four-stop hoist in the riser cupboard, opened
   by the standard fire-panel key, that the managing agent has been servicing every
   spring for a landing their own drawings do not show. Everything else in the
   building has been made to agree that the floor is not here. The machinery has
   not, because somebody has to be paid to maintain it, and payment leaves paper. */

module.exports = {
  title: 'The Building Does Not Have a Fourth Floor',
  root: 'open',
  game: {
    objective: 'Find the way out of a floor that officially does not exist.',
    briefing: 'Everything in this building agrees that you are not here. Find the one thing that does not.',
    solutionKey: 'the service lift | service lift | goods lift | the goods lift | goods hoist | the goods hoist',
    maxAttempts: 4,
  },
  nodes: {
    // ── Act I: the floor ──────────────────────────────────────────────────
    open: {
      text: `The stairwell ends at three. You have walked it twice to be certain, once counting.

The lift panel has buttons for G to 3 and then a smooth grey gap where 4 would go, and you are standing on the fourth floor reading it.

You came up here at seven with a damp meter and a schedule of condition. It is now nine, the schedule is in your bag, and the door you came through is a wall.`,
      clues: [['A smooth grey gap where the 4 would be', 'Not a blank button. A panel made without one.', 'observation', 1]],
      choices: [
        ['Walk the corridor', 'corridor'],
        ['Call the lift anyway', 'lift1'],
      ],
    },
    corridor: {
      text: `Eleven doors, all of them the cheap hollow kind, all of them ajar by the same two inches, which is what happens to a corridor of doors when nobody has closed one for a long time.

The carpet is the managing agent's carpet, the same grey loop as the floors below, and it is *newer* than the grey loop on three.

Whatever this floor is, somebody spent money on it after they spent money downstairs.`,
      clues: [['The carpet up here is newer than the carpet on three', 'The same product. Laid later.', 'clue', 2]],
      choices: [
        ['Try the rooms', 'rooms'],
        ['Go back to the lift lobby', 'hubA'],
      ],
    },
    rooms: {
      text: `Desks, mostly. Chairs stacked in threes the way a cleaner stacks them and not the way a removal firm does.

In the fourth room along there is a kettle with water still in it, and the water is clean.

In the sixth there are curtains, which is a strange thing to hang in an office, and which you will think about again when you are standing in the car park.`,
      clues: [['A kettle on four with clean water in it', 'And chairs stacked the way a cleaner stacks them.', 'evidence', 2]],
      choices: [['Back to the lobby', 'hubA']],
    },
    lift1: {
      text: `The doors open onto nothing — shaft wall, brick, a smell of old grease.

At knee height there is a maintenance sticker, laminated, with a date from last spring. Somebody has been servicing something up here. Recently. On a schedule.`,
      clues: [['A serviced maintenance sticker inside the shaft', 'Laminated, dated last spring, at knee height.', 'clue', 2]],
      choices: [
        ['Read the sticker properly', 'lift2'],
        ['Let the doors close', 'hubA'],
      ],
    },
    lift2: {
      text: `The sticker gives a firm, a phone number, a date — and a line of block capitals naming the equipment it covers.

**GOODS LIFT — 4TH FLR LANDING.**

Serviced every spring, for years, for a landing that is not on any plan in the building.`,
      clues: [['The sticker reads GOODS LIFT — 4TH FLR LANDING', 'Maintained on a schedule, for a landing that is on no plan.', 'evidence', 3]],
      choices: [['Back to the lobby', 'hubA']],
    },
    hubA: {
      text: `The lift lobby on a floor that does not have a lift.

Nine o'clock. The building is empty in the particular way a building is empty when it has been emptied rather than left, and your phone has one bar that comes and goes with no pattern you can find.

Nothing up here is going to tell you why. Something up here is going to tell you how to get down.`,
      choices: [
        ['Look in the riser cupboard', 'riser1'],
        ['Find the plant room', 'plant1'],
        ['Try the windows', 'win1'],
        ['Try the stairwell once more', 'stair1'],
        ['You have seen enough of this floor', 'hubB'],
      ],
    },

    riser1: {
      text: `The cupboard on four is unlocked and almost empty: a wall of pipework, a dead fluorescent tube, and bolted beside them a pair of steel doors far too wide to belong in a cupboard.

No call button. One keyhole, brass, worn bright.`,
      clues: [['Steel double doors in the riser cupboard', 'Too wide for a cupboard. No call button. One brass keyhole.', 'evidence', 3]],
      choices: [
        ['Put your ear to the doors', 'riser2'],
        ['Look at what the keyhole takes', 'riser3'],
        ['Back to the lobby', 'hubA'],
      ],
    },
    riser2: {
      text: `Behind the steel there is a shaft, and a shaft is never silent. Air moves in it. Something ticks as it cools.

And there is a weight hanging somewhere below you on a cable, because when you put your hand flat on the door you can feel the whole assembly take up very slightly, the way a rope takes up when something at the far end shifts its footing.

A counterweight has to weigh about what the car weighs. There is a car in there.`,
      clues: [['There is a counterweight moving on a cable', 'You can feel the assembly take up through the door.', 'evidence', 3]],
      choices: [['Back to the lobby', 'hubA']],
    },
    riser3: {
      text: `Not a mortice. Not a cylinder. A flat brass wafer keyhole, the sort that has been fitted to the same fifteen things in every commercial building since about 1962, because the point of it was never security.

You have opened forty of these. You have a key for it in your van, which is in a car park you cannot get to, along with your ladder, your radio and your sandwiches.

There will be another one in this building. There is always another one.`,
      clues: [['The keyhole is a standard brass wafer, not a security lock', 'The sort fitted to the same fifteen things in every building of this age.', 'clue', 2]],
      choices: [['Back to the lobby', 'hubA']],
    },

    plant1: {
      text: `The plant room on four is behind a door marked NO ADMITTANCE in the same font as every other door in the building, which is the least secret NO ADMITTANCE you have ever seen.

Inside: a tank, a pump, a wall of dust, and a clipboard on a nail.`,
      choices: [
        ['Read the clipboard', 'plant2'],
        ['Look at the pump', 'plant3'],
        ['Back to the lobby', 'hubA'],
      ],
    },
    plant2: {
      text: `A service log going back nine years, in four different hands, all of them bored.

*Hoist — greased, tested to 4th, no defects.* Then the same line, a year later, and a year later than that. Nine springs. Nine engineers. Nobody has ever written down that the fourth floor is not supposed to be there, because to an engineer with a grease gun it plainly is.

The last line is signed and dated in April.`,
      clues: [['Nine years of logs: “hoist — tested to 4th, no defects”', 'Nine engineers, none of whom found the floor remarkable.', 'evidence', 3]],
      choices: [['Back to the lobby', 'hubA']],
    },
    plant3: {
      text: `The pump is running, which means the tank is being kept up, which means water is being lifted to a floor that the drawings say is a roof void.

You put your hand on the pipe. It is warm.

Somebody is paying a standing charge to heat water for eleven empty offices and a kettle.`,
      clues: [['The water to this floor is live and heated', 'Somebody is paying a standing charge for eleven empty offices.', 'evidence', 2]],
      choices: [['Back to the lobby', 'hubA']],
    },

    win1: {
      text: `The windows on four are the sealed sort with a four-inch restrictor, which is Building Regulations doing exactly what it was written to do and being no help at all.

Four inches of November comes in. Below you the car park has eleven spaces and your van in one of them, thirteen metres down.`,
      choices: [
        ['Count the rows of glass from the inside', 'win2'],
        ['Shout', 'win3'],
        ['Back to the lobby', 'hubA'],
      ],
    },
    win2: {
      text: `You can see the reveal of the window on three below you, and the one below that, and the one below that.

Ground, one, two, three — and you. Four rows of glass on a building that insists it has three floors, and the top row has curtains in it.

Somebody was very careful about the inside of this building and forgot the outside entirely.`,
      clues: [['Four rows of windows on a three-floor building', 'And the top row has curtains in it.', 'observation', 1, true]],
      choices: [['Back to the lobby', 'hubA']],
    },
    win3: {
      text: `You shout for eleven minutes into a car park with nothing in it but your own van and a security light that comes on for the wind.

The sound goes out through four inches and gets taken sideways by the weather.

You stop when you notice you have started saying please.`,
      choices: [['Back to the lobby', 'hubA']],
    },

    stair1: {
      text: `You walk it a third time, counting out loud, with a hand on the rail.

Fourteen, half landing, fourteen. Fourteen, half landing, fourteen. Three times. And then the flight you came up, which goes down fourteen and arrives at a fire door onto three.

Through the glass: the third floor, lit, ordinary, and a corridor you surveyed at half past six.`,
      choices: [
        ['Open the fire door', 'stair2'],
        ['Back to the lobby', 'hubA'],
      ],
    },
    stair2: {
      text: `The bar does not move. Not locked — a fire door cannot be locked from the stair side and this one is not, and the bar simply does not move, the way a door does not move when there is something the thickness of a building on the other side of it.

Through the wired glass, three is still there. You put the damp meter against the glass and it reads what glass reads.

You go back up, because there is nowhere else, and the flight takes fourteen steps.`,
      clues: [['The fire door to three will not move, and is not locked', 'Three is visible through the glass. The bar simply does not travel.', 'observation', 2]],
      choices: [['Back to the lobby', 'hubA']],
    },

    // ── Act II: the paper ─────────────────────────────────────────────────
    hubB: {
      text: `Ten past ten.

You are a surveyor. Buildings lie to surveyors all day long — about their age, their cavity, their history of subsidence — and they lie in exactly one way: they leave the thing they are lying about out of the paperwork and forget that money leaves a trail of its own.

Somebody has been paying for this floor for nine years. Find the invoice and you find the machine.`,
      choices: [
        ['Find the agent’s office', 'off1'],
        ['Find the fire panel', 'fire1'],
        ['Find the drawings', 'plan1'],
        ['Go back to the steel doors', 'doors1'],
        ['You know what you are looking for', 'hubC'],
      ],
    },

    off1: {
      text: `The managing agent keeps a room on this floor, which is the single most useful fact in the building: a desk, a filing cabinet, and a wall planner from a year that has already happened.

The cabinet is unlocked. Nobody locks a cabinet on a floor that does not exist.`,
      choices: [
        ['Go through the invoices', 'off2'],
        ['Go through the correspondence', 'off3'],
        ['Back', 'hubB'],
      ],
    },
    off2: {
      text: `Every spring, the same firm, the same amount, the same line of description:

*Annual service & test — goods hoist, 4 stops.*

Four stops. Ground, one, two, three is four stops if you begin at ground — but the drawings call the ground floor G and the invoices below it are all for a *three-stop* passenger lift.

The hoist has one more stop than the lift does. It has always had one more stop than the lift does.`,
      clues: [['The invoices bill a goods hoist with four stops', 'The passenger lift is billed as three. The hoist has always had one more.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },
    off3: {
      text: `A folder of letters, mostly dull, and one that is not: a surveyor's report from eleven years ago recommending that *the fourth floor be omitted from the schedule* pending resolution of a boundary matter with the freeholder next door.

Omitted from the schedule. Not demolished. Not sealed. Omitted — the way a line is omitted from a ledger, by somebody who means to put it back later and then leaves.

You are standing in a clerical decision that has been left running for eleven years.`,
      clues: [['A letter recommending the floor be “omitted from the schedule”', 'Eleven years ago, pending a boundary matter. Never reversed.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    fire1: {
      text: `The fire panel is in the lobby where it has to be, because the one set of rules nobody has ever managed to make a building lie about is the fire regulations.

It is live. It has a zone chart. The zone chart has four zones.`,
      clues: [['The fire panel’s zone chart shows four zones', 'The one set of drawings nobody dares falsify.', 'evidence', 3]],
      choices: [
        ['Open the panel', 'fire2'],
        ['Back', 'hubB'],
      ],
    },
    fire2: {
      text: `Every fire panel in every building of this age takes the same key, and it is on a clip inside the door, and it is a flat brass wafer.

You take it off the clip and hold it up, and it is the same profile as the keyhole in the riser cupboard, because it was always going to be — that is the whole reason the lock is that type. It was never meant to keep anybody out. It was meant to be opened by whoever turns up with the building's own key.`,
      clues: [['The fire-panel key is the same brass wafer profile', 'It was never a security lock. It was meant to be opened.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    plan1: {
      text: `The drawings are rolled in a tube behind the door, because they are always rolled in a tube behind the door.

Ground, first, second, third. Then a sheet marked ROOF PLANT, which shows a tank, a pump and a hatch, and which has been drawn by somebody who has clearly never been up here.`,
      choices: [
        ['Hold the roof sheet up to the light', 'plan2'],
        ['Back', 'hubB'],
      ],
    },
    plan2: {
      text: `Under the light there is a rectangle of correction fluid over the top-left of the ROOF PLANT sheet, and under the correction fluid, in reverse, the ghost of eleven small rooms and a corridor.

Somebody took a drawing of the fourth floor and painted a roof over it.

They left the lift shaft on, because you cannot paint out a shaft without the shaft below it stopping making sense.`,
      clues: [['The roof drawing is a fourth-floor plan painted over', 'Eleven rooms and a corridor, under the correction fluid.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    doors1: {
      text: `Back at the steel doors with better questions.

They are not a cupboard's doors and never were. They are a landing entrance: interlocked, top-hung, with a threshold plate worn down the middle by decades of something being wheeled across it.`,
      clues: [['The threshold plate is worn down the middle', 'Decades of something being wheeled across it.', 'evidence', 2]],
      choices: [
        ['Look for the call station', 'doors2'],
        ['Back', 'hubB'],
      ],
    },
    doors2: {
      text: `There is no call button, but there is a rectangle of unpainted plaster at shoulder height where a call button was, and four plugged screw holes in a pattern you have seen a thousand times.

Somebody unscrewed the way of calling it and filled the holes and painted round them, and did not think about the doors, because the doors are heavy and awkward and would have needed a joiner.

Which means the machine still works. Only the invitation was removed.`,
      clues: [['A call station was unscrewed and the holes filled', 'The invitation was removed. The machine was not.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    // ── Act III: the way out ──────────────────────────────────────────────
    hubC: {
      text: `Twenty to twelve.

You have a flat brass key off a fire panel, a pair of interlocked landing doors with the call station taken off, nine years of grease receipts, and a floor that thirteen separate documents agree is a roof.

Whatever you are going to do, you are going to do it now, because the temperature has dropped four degrees since ten and you are dressed for a survey.`,
      choices: [
        ['Open the steel doors with the fire key', 'go_lift'],
        ['Break the fire door to three', 'go_door'],
        ['Get out through a window', 'go_win'],
        ['Set the fire alarm off', 'go_alarm'],
        ['Sit down and wait for morning', 'e_wait'],
      ],
    },

    go_lift: {
      text: `The key turns a quarter and stops, and then the interlock lets go with a sound like a coin dropping into a tin, and you get your fingers into the gap and put your back into it.

Behind the steel doors: a platform, a folding grille, and a lever worn smooth by a very great many hands.

The car is here, at this landing, where it has sat since somebody took the button off the wall.`,
      clues: [['A platform, a folding grille, and a worn lever', 'The car has been waiting at this landing the whole time.', 'evidence', 3]],
      choices: [
        ['Get in and pull the lever', 'e_ride'],
        ['Climb down the shaft instead', 'e_climb'],
      ],
    },
    e_ride: {
      text: `You pull the grille across, and the lever goes down with the weight of nine springs of grease behind it, and the whole assembly settles and begins to move.

Three. Two. One. Ground — and the doors on the ground landing are behind a plasterboard wall, and you put your boot through it at eleven minutes to one in the morning and come out in the bin store, in the dark, in a shower of skim.

Your van is thirty feet away. The building behind you has three floors and always has had.

You do not put it in the schedule of condition. You put it in a letter, and you send the letter to yourself, and you keep it.`,
      ending: true,
    },
    e_climb: {
      text: `You do not trust a machine nobody has ridden in nine years, which is defensible, and you climb the shaft ladder instead, which is not.

At the second-floor landing your torch finds the counterweight coming up the guide rails towards you at the speed of something that has just been released, because opening the landing doors is what releases it.

You get into the recess. It goes past your chest with about the room you would give a car on a narrow lane.

You reach the ground landing shaking, and you are alive, and you never once tell this part to anybody.`,
      ending: true,
    },

    go_door: {
      text: `The fire door has wired glass and a hardwood frame and you have a damp meter, a clipboard, and a stair rail that has been coming loose since 1974.`,
      choices: [
        ['Take the rail off the wall', 'e_rail'],
        ['Go through the glass', 'e_glass'],
      ],
    },
    e_rail: {
      text: `It takes an hour and it comes off, and you get four feet of steel tube and you put it through the door at the latch side, and the frame gives before the door does.

Behind the door: three, exactly as it looked through the glass. You walk out through your own survey and down a stairwell that behaves itself all the way to the ground.

You never do work out what the bar was against. The report you file recommends further investigation of the fourth-floor void, and the agent's reply asks, politely, which void.`,
      ending: true,
    },
    e_glass: {
      text: `Wired glass does not break out. It breaks and stays, in a mesh, and the wire takes the back of your hand on the way through.

You get an arm into three and nothing else, and you bleed for a while onto the third-floor carpet, which will be found on Monday and will start an entirely separate investigation.

At two in the morning you go back to the lobby and sit down beside the fire panel, and you notice, then, in the light of the zone chart, that there are four zones on it.`,
      ending: true,
    },

    go_win: {
      text: `The restrictor is a stay with a screw in it and you have a multitool, and the screw is fifteen years old.

Below: thirteen metres, a security light, and a flat roof over the bin store about four metres down and two across.`,
      choices: [
        ['Go for the bin store roof', 'e_roof'],
        ['Think better of it', 'hubC'],
      ],
    },
    e_roof: {
      text: `You make it, in the sense that you arrive.

The bin store roof is corrugated and eleven years old and takes you as far as the second sheet, and then you are in the bin store with a broken ankle and a great deal of somebody else's cardboard.

You are found at ten past seven by a man doing the collections, who is very good about it. The ankle takes fourteen weeks. Nobody goes up to look, because officially there is nowhere to go.`,
      ending: true,
    },

    go_alarm: {
      text: `The panel is live and the break-glass is on the wall by the stairs, and setting it off will bring a keyholder, a fire crew, or nobody at all.

You put your elbow through it at ten to twelve.`,
      choices: [
        ['Wait by the panel', 'e_alarm_wait'],
        ['Go back to the steel doors while it rings', 'e_alarm_lift'],
      ],
    },
    e_alarm_wait: {
      text: `The bells go for nineteen minutes and then stop, because a panel that has been in fault for two years silences itself, and the zone light that was flashing was zone four.

At twenty past twelve you hear a vehicle in the car park and you shout, and the vehicle leaves.

They will have seen a three-storey building with no smoke coming out of it. That is a false alarm, and a false alarm gets a form.`,
      ending: true,
    },
    e_alarm_lift: {
      text: `The bells are still going when you get the fire key into the brass wafer, and the noise is the reason you do not hesitate over a lock you would otherwise have thought about for ten minutes.

Doors, grille, lever. The car takes you down through the ringing to the ground landing and the plasterboard, and you come out into the bin store as the crew are pulling in.

You tell them where you have been. One of them writes *4th flr* on a wet report form, and the officer looks at it and looks up at the building and says, "There's three," and that is the last anybody official ever says about it.`,
      ending: true,
    },

    e_wait: {
      text: `You sit down against the riser cupboard with the steel doors at your back and your coat over your knees, and you wait for a morning that is seven hours away.

At some point after three you hear the assembly take up behind you, the way a rope takes up when something at the far end shifts its footing, and then settle, and then take up again.

It goes on until about five. In the morning the fire door to three opens perfectly normally, and you walk down and out and drive home, and you cancel the job.`,
      ending: true,
    },
  },
}
