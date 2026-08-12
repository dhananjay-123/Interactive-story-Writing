/* Nine Days of Weather — the deepened graph.

   The answer is the lower hut: four hours west, downhill, out of the wind, with a
   stove and a roof and the ridge repeater standing above it. Everything else is a
   way of staying still. The fuel is one day, not two. The east gully is loaded and
   sounds it. The col is a funnel. Digging in trades the one resource that makes
   water for the one thing a sleeping bag already gives you.

   The story's job is to make staying feel reasonable, because it always does from
   inside a tent, and to give the reader enough ground truth to refuse it. */

module.exports = {
  title: 'Nine Days of Weather',
  root: 'open',
  game: {
    objective: 'Work out what actually gets you off this mountain.',
    briefing: 'Four things look like a plan from inside a tent. One of them is one.',
    solutionKey: 'reach-the-lower-hut-before-dark',
    maxAttempts: 3,
  },
  nodes: {
    // ── Act I: the sixth day ──────────────────────────────────────────────
    open: {
      text: `The forecast said three days. It has been six.

The canister has the light sound that means tomorrow at the latest, and above the col the weather is doing something with the light that nobody who has spent time up here likes to watch.

You are not in trouble yet. You are in the hour before trouble, which is the only hour in which anything can be done about it.`,
      choices: [
        ['Take stock of everything', 'stock'],
        ['Look at the sky first', 'sky1'],
      ],
    },
    stock: {
      text: `Laid out on the groundsheet, in the order you will need it:

Half a canister. Four days of food if food mattered, which it does not. A bag good to minus fifteen. Rope you have not used. Two litres of water, one of it in the bottle you have been sleeping with so it does not freeze.

And a map, which is the only object here that knows anything you do not.`,
      choices: [['Get on with it', 'hubA']],
    },
    sky1: {
      text: `Cloud coming over the col from the north-west in a long unbroken sheet, and beneath it, on the snow, the flat grey light that takes away every shadow and every edge at once.

You have watched this from a tent door four times in eleven years. Twice it was nothing. Twice it was three days.

The one thing it has never once been is *shorter than the forecast*.`,
      clues: [['Flat light and unbroken north-west cloud', 'Four times in eleven years. Never once shorter than forecast.', 'observation', 2]],
      choices: [['Get on with it', 'hubA']],
    },
    hubA: {
      text: `Half past nine in the morning on the sixth day, in a tent, at the col, with about seven hours of usable light and no reason yet to spend them.

Everything you decide today you will decide again tomorrow with less fuel and worse feet. That is the whole arithmetic of this place, and it only ever runs one way.`,
      choices: [
        ['Weigh the fuel properly', 'fuel1'],
        ['Try the radio', 'rad1'],
        ['Look at your feet', 'feet1'],
        ['Read the map again', 'map1'],
        ['Get out and look at the ground', 'hubB'],
      ],
    },

    fuel1: {
      text: `Half a canister, perhaps less. The gauge lies at altitude and the only honest measure is the weight of the thing in your hand.

Weighed honestly it is one day of melting snow, or two days of being cold and drinking less than you should.`,
      clues: [['The fuel is one day of water, or two of thirst', 'Weighed in the hand, not read off the gauge.', 'evidence', 3]],
      choices: [
        ['Ration it across two days', 'fuel2'],
        ['Accept that it is one day', 'fuel3'],
        ['Put it away', 'hubA'],
      ],
    },
    fuel2: {
      text: `Two days of being cold, then. It is the wrong arithmetic and you know it while you are doing it.

Rationing water is how people talk themselves into staying still, and staying still is the only thing the mountain has ever needed you to do.

You have read nine accounts of this. In eight of them the word *rationing* appears about two days before the word *rescue*.`,
      clues: [['Rationing water is how people talk themselves into staying put', 'And staying put is the thing that kills you here.', 'clue', 2, true]],
      choices: [['Put it away', 'hubA']],
    },
    fuel3: {
      text: `One day. That makes it simple, which is not at all the same as easy.

One day of fuel means you go in the morning whatever the sky is doing — and it means the lower hut, four hours down the west side, stops being an option you are considering and becomes the only plan you have.

Everything from here is about getting there in daylight.`,
      clues: [['One day of fuel means moving, whatever the sky does', 'It converts the hut from an option into the plan.', 'evidence', 3]],
      choices: [['Put it away', 'hubA']],
    },

    rad1: {
      text: `The radio gives you sixteen seconds of a woman reading numbers, and then nothing at all, for the rest of the evening.

Sixteen seconds is enough to know the repeater on the ridge is still standing. It is also enough to know that you are the thing that has stopped working.`,
      clues: [['The ridge repeater is still transmitting', 'Sixteen seconds of numbers, then nothing.', 'clue', 2]],
      choices: [
        ['Work out where the signal came from', 'rad2'],
        ['Try to transmit', 'rad3'],
        ['Put it away', 'hubA'],
      ],
    },
    rad2: {
      text: `Bearing and distance, worked twice because your hands are cold and once is not enough.

The repeater sits on the shoulder above the lower hut, four hours down the west side, out of the wind. The numbers on the radio were never for you. The direction they came from is.`,
      clues: [['The repeater sits above the lower hut, four hours west', 'Out of the wind, with a stove and a roof under it.', 'evidence', 3]],
      choices: [['Put it away', 'hubA']],
    },
    rad3: {
      text: `You transmit for nine minutes on the hour, three times, into a col that is a bowl of rock with a weather system sitting in it.

Nothing. Which proves nothing about the radio and everything about the col: you are inside a stone dish with a lid on, and the one place a signal was ever going to get out of is somewhere with a horizon.

The shoulder above the hut has a horizon. It is the only ground within four hours that does.`,
      clues: [['The col is a bowl — nothing transmits out of it', 'The shoulder above the hut is the only ground here with a horizon.', 'evidence', 3]],
      choices: [['Put it away', 'hubA']],
    },

    feet1: {
      text: `You have been putting this off for two days, which is itself the diagnosis.

Both feet out, in the bag, in the light from the door. The left is fine and cold. On the right, the two smallest toes are white to the joint and hard, and they do not hurt, and the not hurting is the entire problem.`,
      clues: [['Two toes on the right foot are white to the joint', 'They do not hurt. That is the problem, not the cold.', 'evidence', 3]],
      choices: [
        ['Warm them now', 'feet2'],
        ['Leave them and keep moving tomorrow', 'feet3'],
        ['Put your boots back on', 'hubA'],
      ],
    },
    feet2: {
      text: `Against your own stomach, for forty minutes, with your teeth together.

They come back, and coming back is worse than going, and afterwards you have two toes that hurt a great deal and are no longer white.

You must not let them freeze again. A toe that thaws and refreezes is not a toe any more. Which means that whatever you do tomorrow, you do it in one push, and you do not stop to think about it halfway.`,
      clues: [['Thawed tissue must not be allowed to refreeze', 'Whatever happens tomorrow happens in one push, with no halfway.', 'evidence', 3]],
      choices: [['Boots on', 'hubA']],
    },
    feet3: {
      text: `You put the boot back on over it, which is the standard advice for a foot you are going to have to walk on, and the standard advice assumes you are walking somewhere today.

Six days in, on the fourth grey morning, "tomorrow" has become a thing you say rather than a thing you plan.

That is the sentence you catch yourself in, sitting in a tent door with a boot in your hand.`,
      choices: [['Boots on', 'hubA']],
    },

    map1: {
      text: `A 1:25,000 that has been folded to this square for six days.

The col where you are. The east gully, which is a black hatched line and four hours faster than anything else. The west side, which is a long dull descent over two shoulders. The hut, which is a small square with a dot beside it.

And the contours, which are the only part of a map that has never once lied to anybody.`,
      choices: [
        ['Read the west side properly', 'map2'],
        ['Read the gully properly', 'map3'],
        ['Fold it away', 'hubA'],
      ],
    },
    map2: {
      text: `Four hours if you are well. Five and a half as you are.

It is a stupid, plodding, unheroic line: down off the col to the north, across the shoulder, down the spur, and along. Nothing on it is steep enough to be dangerous and nothing on it is quick.

Seven hours of light. Five and a half hours of walking. That is not a comfortable margin, and it is a margin, and it only exists if you leave at first light.`,
      clues: [['The west line is 5½ hours as you are, in 7 hours of light', 'Dull, plodding, and the only route with a margin in it.', 'evidence', 3]],
      choices: [['Fold it away', 'hubA']],
    },
    map3: {
      text: `The gully is beautiful on paper: a straight fall line, two hours to the valley floor, no navigation at all in bad visibility.

It is also thirty-eight degrees for the top four hundred metres, which is the angle at which every avalanche in the world happens, and it faces the way the last six days of wind have been going.

Everything that has been stripped off this plateau for six days is now sitting in that gully.`,
      clues: [['The gully is 38°, lee-facing, and has been loading for six days', 'Every avalanche in the world happens at that angle.', 'evidence', 3]],
      choices: [['Fold it away', 'hubA']],
    },

    // ── Act II: the seventh day ───────────────────────────────────────────
    hubB: {
      text: `The seventh day is better and is not good: the cloud has lifted off the tops and sits at the level of the col, and you can see about four hundred metres, which is enough to look at things and not enough to travel in.

One day of fuel. Two toes. Six hours of light left.

Whatever you are going to believe about this mountain tomorrow, today is when you go and check it.`,
      choices: [
        ['Go and listen to the gully', 'gul1'],
        ['Dig a pit in the snow', 'pit1'],
        ['Walk the first half hour of the west line', 'west1'],
        ['Look at what the col does to the wind', 'col1'],
        ['Look for the marker posts', 'post1'],
        ['Get back in the tent', 'hubC'],
      ],
    },

    gul1: {
      text: `The gully is loaded. You can hear it in the way the snow answers your boot — a hollow note, like a drum skin, that carries further than snow should.

It is the fast way down. It is also, in precisely this weather, the way down that kills people.`,
      clues: [['The gully snow sounds hollow', 'A drum-skin note that carries. Loaded.', 'observation', 1, true]],
      choices: [
        ['Go to the edge and look in', 'gul2'],
        ['Back', 'hubB'],
      ],
    },
    gul2: {
      text: `From the lip you can see two hundred metres down it and no further.

There is a fracture line already, old, from some night in the last six, running about forty metres across the slope below you and filled in with new snow since.

Something in there has already gone once this week without anybody watching it, and it has been reloading ever since.`,
      clues: [['An old fracture line in the gully, already filled in', 'It has gone once this week and reloaded since.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    pit1: {
      text: `A metre down, cut square, with the shovel, on a slope that faces the same way as the top of the gully.

The layers are a diary of the last three weeks and you can read them with a gloved finger.`,
      choices: [
        ['Test the column', 'pit2'],
        ['Just look at the layers', 'pit3'],
        ['Back', 'hubB'],
      ],
    },
    pit2: {
      text: `Ten taps from the wrist: nothing. Ten from the elbow: nothing.

Three from the shoulder and the top forty centimetres goes as one clean slab, all at once, sliding off the block onto your boots with a sound like a book closing.

That is not a bad result. That is the worst result there is. A clean shear at moderate load is the thing the whole science exists to warn you about.`,
      clues: [['A clean slab shear at moderate load', 'It went as one piece, off a weak layer, onto your boots.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },
    pit3: {
      text: `Twenty centimetres of new wind slab, hard and dense, sitting on something that looks like sugar.

Faceted crystals. The whole of the third week of the month is in that layer, when it was clear and still and cold and nothing was happening, and while nothing was happening this snowpack was quietly turning its own foundations into ball bearings.

You do not need to test it. You have seen enough pits.`,
      clues: [['Hard wind slab sitting on a layer of facets', 'Three weeks of clear cold weather turned the base to ball bearings.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    west1: {
      text: `Half an hour out and half an hour back, with the tent left standing, which is the only way to look at a route honestly.

The first two hundred metres off the col is the worst of it: a broad slope, wind-scoured to old hard snow, crampons biting properly for the first time in a week.`,
      clues: [['The west slope is wind-scoured to old hard snow', 'Scoured, not loaded. Crampons bite.', 'evidence', 3]],
      choices: [
        ['Go on to the shoulder', 'west2'],
        ['Turn back here', 'hubB'],
      ],
    },
    west2: {
      text: `From the shoulder, in a gap in the cloud that lasts about ninety seconds, you see the whole of it.

The spur running down, dull and safe and long. The valley. And four hours away, small and grey and unmistakably rectangular, the hut, with the shoulder above it and something on the shoulder that catches the light like an aerial.

Then the cloud comes back. But you have seen it, and you will not now have to believe in it on faith at seven o'clock tomorrow morning in the dark.`,
      clues: [['You have now seen the hut with your own eyes', 'Four hours off, with an aerial on the shoulder above it.', 'evidence', 3]],
      choices: [['Back to the tent', 'hubB']],
    },

    col1: {
      text: `The col does to wind what a funnel does to water, which you have known for six days in the abstract and now go and stand in on purpose.

At the narrows it takes you off balance twice in a minute. The tent is where it is because it is the one square of ground here with any shelter, and the shelter is a boulder the size of a van, and the boulder has a drift behind it that has grown two metres since Tuesday.`,
      clues: [['The drift behind the tent boulder has grown two metres since Tuesday', 'The one sheltered square on the col is filling in.', 'evidence', 3]],
      choices: [
        ['Work out what the drift is doing', 'col2'],
        ['Back', 'hubB'],
      ],
    },
    col2: {
      text: `It is doing what drifts do: growing downwind, into the sheltered lee, which is exactly and precisely the place a person puts a tent.

Two more days of this and the tent is a hole in a snowbank, which is warmer, and quieter, and completely invisible from the air.

The thing that makes the col survivable is the thing that will make it impossible to find you in it.`,
      clues: [['The shelter that keeps the tent warm makes it invisible from the air', 'Two more days and it is a hole in a snowbank.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    post1: {
      text: `Somebody put marker posts on this crossing in the nineteen-fifties and the estate has replaced them badly ever since.

You find the first at the edge of the col, leaning, with a faded blue band. Then nothing for four hundred metres, and then another, on the bearing, exactly where the map says the spur begins.`,
      clues: [['Marker posts run along the west line, on the bearing', 'Blue bands, badly maintained, and where the map says they are.', 'evidence', 2]],
      choices: [
        ['Follow them a little further', 'post2'],
        ['Back', 'hubB'],
      ],
    },
    post2: {
      text: `Three more, and the third has a metal plate on it with an arrow and one word stamped into it, and the word is worn almost flat and is still legible if you take your glove off and put your thumb across it.

HUT.

Somebody, seventy years ago, stood in weather like this and decided that the single most useful thing they could leave behind was an arrow pointing away from the col.`,
      clues: [['A stamped plate on the third post: an arrow, and HUT', 'Seventy years old, pointing away from the col.', 'evidence', 3]],
      choices: [['Back', 'hubB']],
    },

    // ── Act III: the eighth morning ───────────────────────────────────────
    hubC: {
      text: `The eighth morning, and it is the last one you get to choose anything on, because tomorrow you will be doing it with no fuel and whatever the toes have become overnight.

It is not clear. It is not going to be clear. There is grey light at about half past seven and there will be dark by half past three, and everything in between is yours.

Four things look like a plan from inside a tent.`,
      choices: [
        ['Go west for the hut, now, at first light', 'go_hut'],
        ['Take the gully — it is two hours', 'go_gully'],
        ['Wait it out at the col', 'go_wait'],
        ['Dig in and burn what is left', 'go_dig'],
      ],
    },

    go_hut: {
      text: `Everything packed by the light of the stove's last useful minutes. Two litres melted and both inside your jacket. Tent struck at twenty past seven and you are moving before you can have an opinion about it.

The scoured slope takes crampons the way it did yesterday. At the first post you stop and take a bearing you do not need, because taking it is how you make yourself keep taking it.`,
      choices: [
        ['Push straight through', 'e_hut_push'],
        ['Stop at the shoulder and try the radio', 'e_hut_radio'],
        ['Turn back when the cloud comes down', 'e_hut_back'],
      ],
    },
    e_hut_push: {
      text: `Five hours and fifty minutes, in flat light, on a bearing, post to post, without stopping for anything except to put your hands under your arms twice.

The hut comes out of the cloud at eighty metres and is exactly where the map said it would be, and it is unlocked, because they always are, and there is a stove and a stack of cut wood and four tins and a visitors' book with the last entry from October.

You get your boots off at twenty past one in the afternoon. The right foot is bad and it is not as bad as it was going to be. You are still there four days later when the weather finally breaks, and you walk out on your own feet, which is the only outcome on this mountain that anybody would call a good one.`,
      ending: true,
    },
    e_hut_radio: {
      text: `On the shoulder above the hut there is a horizon for the first time in eight days, and the radio finds it immediately.

You are talking to somebody in nine seconds. They have had you as overdue since Thursday and they have had a helicopter waiting on the coast since Friday for a window nobody has given them.

You give them a grid and then you walk the last twenty minutes down to the hut anyway, because it is twenty minutes and because you would rather be found somewhere with a roof. They come at first light with the first clear sky in nine days. You lose the two toes. You keep everything else, including the foot.`,
      ending: true,
    },
    e_hut_back: {
      text: `The cloud comes down at the shoulder, two hours out, and the world becomes four metres of grey in every direction, and you make the decision that ninety people out of a hundred make.

You turn round. You get back to the col at half past one because it is uphill and you are slower, and you put the tent up in the wind with your hands finished, and there is no fuel now, and there is no second morning like the one you have just spent.

They find the tent eleven days later. They find you eight hundred metres west of it, on the bearing, where you finally went — with the posts still in front of you and no daylight left to use them in.`,
      ending: true,
    },

    go_gully: {
      text: `Two hours instead of six. Downhill. No navigation. On the eighth morning, with two toes gone white and a canister you can hear the bottom of, it is the most persuasive argument on this mountain.

You stand on the lip at eight o'clock with the drum-skin note still in your boots from Tuesday.`,
      choices: [
        ['Go anyway', 'e_gul_go'],
        ['Go, but on the rock rib at the edge', 'e_gul_rib'],
      ],
    },
    e_gul_go: {
      text: `Forty metres in, the slope makes a sound that you feel through your knees rather than hear, and the whole width of it lets go at once, above you, the way they always do.

The thing nobody tells you is how quiet the middle of it is.

You come to rest six hundred metres down, on your back, under about a metre, with one arm across your face where you put it, which is the only reason there is an air space, and the air space is the reason you are still breathing at eleven o'clock when the second party of the week comes down the gully and one of them sees a hand.`,
      ending: true,
    },
    e_gul_rib: {
      text: `The rock rib on the true left is scoured bare, awkward, and slow — it takes three hours instead of two, and every one of those hours is spent ten metres from a slope you would not stand on.

Two thirds of the way down the gully goes on its own, without anybody touching it, in a slab four hundred metres wide, and you watch it from the rib, standing very still, with your hand on a spike of rock.

You get to the valley at half past eleven. You are alive because you refused the fast line while taking the fast route, which is the narrowest margin anybody on this mountain gets, and you are honest about it afterwards, which is rarer.`,
      ending: true,
    },

    go_wait: {
      text: `The weather has to break. It always breaks.

That is true, and it is the truest sentence available, and everything wrong with it is in the word *always*.`,
      choices: [
        ['Wait and keep the fuel for water', 'e_wait_water'],
        ['Wait and try the radio hourly', 'e_wait_radio'],
      ],
    },
    e_wait_water: {
      text: `The ninth day is the same. The tenth is worse. The fuel goes on the ninth evening and after that water is snow held in the mouth, which costs more heat than it gives.

The drift behind the boulder takes the tent's windward side on the tenth night and you spend four hours digging with a pan.

It breaks on the twelfth. By then you have been three days without water that was not paid for in body heat, and the walk that was five and a half hours on the eighth is not a thing your legs can be asked for. They lift you off on the thirteenth. You are alive. The right foot is not.`,
      ending: true,
    },
    e_wait_radio: {
      text: `On the hour, every hour, nine minutes at a time, into a stone bowl with a lid on it.

You have known since the seventh day that the col does not transmit. You do it anyway, because it is the only action available inside a tent, and doing something is how a person stays sane while doing nothing.

The battery goes on the eleventh day. The weather goes on the twelfth. On the thirteenth a helicopter comes up the valley on a search pattern and passes eight hundred metres to the west of a green tent that is now a smooth white shape behind a boulder, and does not see it, and does not come back that way.`,
      ending: true,
    },

    go_dig: {
      text: `A snow hole is warmer than any tent ever made and every book says so.

It takes four hours with a pan and a shovel and you burn most of what is left in the canister making water while you dig, because digging is thirsty work and there is no version of this where you dig dry.`,
      choices: [
        ['Move into the hole and sit it out', 'e_dig_sit'],
        ['Use the warm night to leave at first light', 'e_dig_go'],
      ],
    },
    e_dig_sit: {
      text: `It is warmer. It is much warmer — minus two inside instead of minus fourteen, and quiet, and out of the wind, and you sleep for the first time in five days.

You have traded the fuel for the warmth, and the warmth does not make water, and by the third night in the hole the thing that is killing you is not the cold at all.

They find the hole in April, when the col melted out, with everything stacked neatly beside the entrance in the order it was needed. The report is careful and kind and says that the decision to dig was sound and the decision to stay was not, and that the two are usually made by the same person on the same afternoon.`,
      ending: true,
    },
    e_dig_go: {
      text: `You sleep warm for eight hours, which is the first real sleep since Tuesday, and you leave at first light with no fuel at all and two litres you melted while you were digging.

Warm and slept and dry-footed, the west line takes five hours ten instead of five and a half.

You are at the hut by half past twelve with nothing left in the pack that burns, and the hut has a stove and cut wood, and you sit in front of it for two days and think about the fact that the snow hole did not save you and the eight hours of sleep in it did.`,
      ending: true,
    },
  },
}
