// Catalog of story soundscapes — five per genre. These ids map to the
// procedural ambience builders in AudioProvider.jsx (keep the two in sync).
// The reader plays the one the author selects; the editor previews them.

export const GENRE_LABELS = {
  fantasy: 'Fantasy',
  mystery: 'Mystery',
  sci_fi: 'Science Fiction',
  romance: 'Romance',
  horror: 'Horror',
  thriller: 'Thriller',
  literary: 'Literary',
}

export const AMBIENCE_BY_GENRE = {
  fantasy: [
    { id: 'fant_forest', name: 'Enchanted Forest', desc: 'Birdsong over a soft breeze, with far-off chimes.' },
    { id: 'fant_tavern', name: 'Tavern Hearth', desc: 'A crackling fire and the low murmur of a warm room.' },
    { id: 'fant_castle', name: 'Castle Halls', desc: 'Cavernous stone, distant wind, and a slow bell.' },
    { id: 'fant_magic', name: 'Arcane Shimmer', desc: 'An airy pad laced with glittering sparks of sound.' },
    { id: 'fant_highlands', name: 'Windswept Highlands', desc: 'Open wind and a low, mournful horn on the moor.' },
  ],
  mystery: [
    { id: 'myst_rain', name: 'Rain on the Glass', desc: 'Steady rainfall against the window of a quiet study.' },
    { id: 'myst_clock', name: 'The Ticking Study', desc: 'A patient clock over a low, waiting room tone.' },
    { id: 'myst_noir', name: 'Noir Alley', desc: 'A distant city hum with the odd stray drip.' },
    { id: 'myst_fog', name: 'Foggy Harbor', desc: 'A foghorn calls through gulls and lapping water.' },
    { id: 'myst_suspense', name: 'Held Breath', desc: 'A taut low drone with sparse, anxious highs.' },
  ],
  sci_fi: [
    { id: 'sci_ship', name: 'Starship Hum', desc: 'The steady thrum of engines and quiet console beeps.' },
    { id: 'sci_console', name: 'Command Deck', desc: 'Soft air vents and a chatter of readouts.' },
    { id: 'sci_space', name: 'Deep Space', desc: 'A vast, weightless pad over a subsonic rumble.' },
    { id: 'sci_reactor', name: 'Reactor Core', desc: 'A pulsing throb wrapped in electric hiss.' },
    { id: 'sci_alien', name: 'Alien World', desc: 'Wobbling tones and strange wind on unknown ground.' },
  ],
  romance: [
    { id: 'rom_cafe', name: 'Little Café', desc: 'Warm chatter and the clink of cups nearby.' },
    { id: 'rom_rain', name: 'Rainy Afternoon', desc: 'Gentle rain over a soft, warm chord.' },
    { id: 'rom_fire', name: 'Fireside', desc: 'A crackling hearth and low, mellow strings.' },
    { id: 'rom_shore', name: 'Evening Shore', desc: 'Slow waves at dusk with a distant gull.' },
    { id: 'rom_waltz', name: 'Slow Waltz', desc: 'A soft three-beat lilt, played very quietly.' },
  ],
  horror: [
    { id: 'hor_drone', name: 'Dread Drone', desc: 'A dissonant low drone that never quite settles.' },
    { id: 'hor_wind', name: 'Haunted Wind', desc: 'Howling gusts and the creak of old timber.' },
    { id: 'hor_heart', name: 'Racing Heart', desc: 'A pounding heartbeat under airless tension.' },
    { id: 'hor_whisper', name: 'Whispers', desc: 'Breathy swells and voices just out of reach.' },
    { id: 'hor_bells', name: 'Distant Toll', desc: 'An ominous bell over a deep, dark rumble.' },
  ],
  thriller: [
    { id: 'thr_pulse', name: 'Pursuit Pulse', desc: 'A driving low pulse that keeps pushing forward.' },
    { id: 'thr_city', name: 'City at Night', desc: 'Cars passing, a horn, a far-off siren.' },
    { id: 'thr_tension', name: 'Wire Tension', desc: 'A high, trembling line over a ticking clock.' },
    { id: 'thr_stakeout', name: 'Stakeout Rain', desc: 'Rain on the windshield of an idling car.' },
    { id: 'thr_countdown', name: 'Countdown', desc: 'A steady tick under a slowly rising drone.' },
  ],
  literary: [
    { id: 'lit_cafe', name: 'Coffeehouse', desc: 'A gentle hum of talk and the clink of saucers.' },
    { id: 'lit_library', name: 'Quiet Library', desc: 'Still air, a page turning, footsteps two aisles over.' },
    { id: 'lit_rain', name: 'Study Rain', desc: 'Soft rain beside a warm reading lamp.' },
    { id: 'lit_garden', name: 'Morning Garden', desc: 'Birdsong and a light breeze through leaves.' },
    { id: 'lit_night', name: 'Late Night', desc: 'Crickets, still summer air, an owl somewhere out there.' },
  ],
}

export const ALL_AMBIENCE = Object.entries(AMBIENCE_BY_GENRE).flatMap(([genre, list]) =>
  list.map((a) => ({ ...a, genre }))
)

export const findAmbience = (id) => (id ? ALL_AMBIENCE.find((a) => a.id === id) || null : null)
