import { games, findGame } from './data/games.js'

if (!Array.isArray(games) || games.length !== 6) {
  throw new Error('games data must contain exactly six games')
}

for (const id of ['reaction-wave', 'magic-block-builder', 'emotion-cipher-gate', 'voice-gesture-radio', 'bell-template', 'bubble-template']) {
  if (!findGame(id)) throw new Error(`missing required game id: ${id}`)
}

if (findGame('reaction-wave')?.status !== 'official-gesture-game') {
  throw new Error('reaction-wave must be official-gesture-game')
}

if (findGame('reaction-wave')?.template !== false) {
  throw new Error('reaction-wave must not be template')
}

if (findGame('magic-block-builder')?.template !== false) {
  throw new Error('magic-block-builder must not be template')
}

if (findGame('emotion-cipher-gate')?.template !== false) {
  throw new Error('emotion-cipher-gate must not be template')
}

if (findGame('voice-gesture-radio')?.template !== false) {
  throw new Error('voice-gesture-radio must not be template')
}

if (findGame('bell-template')?.template !== true) {
  throw new Error('bell-template must be template')
}

if (findGame('bubble-template')?.template !== true) {
  throw new Error('bubble-template must be template')
}

for (const game of games) {
  for (const key of ['id', 'name', 'status', 'summary']) {
    if (!game[key]) throw new Error(`game missing ${key}`)
  }
}

console.log('STATIC_SELF_TEST_OK')
