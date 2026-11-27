// Change these to rebrand the game.
export const SITE_NAME = 'Mural Crew'
export const SITE_TAGLINE = 'Shape Shifter: paint the city wall, one stencil at a time.'
export const HUB_URL = 'https://pltl-game-hub.vercel.app'

export const MIN_TEAMS = 1
export const MAX_TEAMS = 8
// Spray-paint colors (the same order the server uses)
export const TEAM_COLORS = ['#22d3ee', '#f472b6', '#a3e635', '#fbbf24', '#a78bfa', '#fb923c', '#34d399', '#60a5fa']
export const DURATIONS = [null, 20, 30, 45] // minutes (null: no clock)

// The rounds, in play order (the same ids the server uses)
export const ROUNDS = [
  { id: 'place', title: 'Place the stencil', emoji: '🎨', what: 'Shifts, stretches and flips of the toolkit functions', sections: '3.5', steps: 4 },
  { id: 'read', title: 'Read the wall', emoji: '📏', what: 'Domain and range in interval notation', sections: '3.2', steps: 3 },
  { id: 'steep', title: 'Steep or flat', emoji: '⛰️', what: 'Average rate of change, increasing and decreasing, local max and min', sections: '3.3', steps: 3 },
  { id: 'mirror', title: 'Mirror mural', emoji: '🪞', what: 'One-to-one, mirroring points, inverse functions', sections: '3.7', steps: 3 },
]
export const roundOf = (id) => ROUNDS.find((r) => r.id === id)

// The stencils (College Algebra's toolkit functions)
export const STENCILS = [
  { id: 'sq', label: 'x²' },
  { id: 'cube', label: 'x³' },
  { id: 'abs', label: '|x|' },
  { id: 'sqrt', label: '√x' },
  { id: 'cbrt', label: '∛x' },
  { id: 'recip', label: '1/x' },
  { id: 'recip2', label: '1/x²' },
]

// A different mural every game
export const SCENES = {
  city: 'City skyline at dusk',
  sunset: 'Sunset over the mountains',
  ocean: 'Ocean waves',
  night: 'Starry night',
  canyon: 'Desert canyon',
}

// mm:ss left on the clock
export function clockText(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Leader scenarios (the /scenarios and /review pages): this game's id, and the pages' background
export const SCENARIO_GAME = 'mural'
export const PAGE_BG = 'lab-bg'
