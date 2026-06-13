import * as gamesData from './data/games.js'

const games = gamesData.games || gamesData.default || []

const requiredIds = [
  'reaction-wave',
  'magic-block-builder',
  'emotion-cipher-gate',
  'voice-gesture-radio',
  'color-paper-synth',
  'dinosaur-run',
  'bell-template'
]

const removedIds = [
  'bubble-template'
]

function fail(message) {
  throw new Error(message)
}

if (!Array.isArray(games)) {
  fail('games data must export an array named games')
}

const ids = games.map((item) => item && item.id).filter(Boolean)
const uniqueIds = new Set(ids)

if (ids.length !== games.length) {
  fail('every game item must have an id')
}

if (uniqueIds.size !== ids.length) {
  fail('games data contains duplicated game ids')
}

for (const id of requiredIds) {
  if (!uniqueIds.has(id)) {
    fail(`games data missing required game: ${id}`)
  }
}

for (const id of removedIds) {
  if (uniqueIds.has(id)) {
    fail(`games data still contains removed game: ${id}`)
  }
}

if (games.length !== requiredIds.length) {
  fail(`games data must contain exactly ${requiredIds.length} registered games after removing bubble-template, got ${games.length}`)
}

for (const game of games) {
  if (!game.title && !game.name) {
    fail(`game ${game.id} must have title or name`)
  }
  if (!game.description && !game.summary) {
    fail(`game ${game.id} must have description or summary`)
  }
  if (!game.route && !game.path && !game.backendKey && !game.id) {
    fail(`game ${game.id} must have a route/path/backend key`)
  }
}

console.log(`SELF_TEST_OK games=${games.length} ids=${ids.join(',')}`)

