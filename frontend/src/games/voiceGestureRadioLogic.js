import { OFFICIAL_GESTURES } from '../utils/gesture/mediapipeGestureEngine'

export const STAR_GRID_SIZE = 5
export const MOVE_COOLDOWN_MS = 620

export const GESTURE_STAR_MAP_ROUNDS = [
  {
    id: 'orchard-line',
    title: '果园星线',
    intro: '用四种手势移动信标，按顺序点亮星点。',
    timeLimitMs: 38000,
    start: { x: 0, y: 4 },
    targets: [
      { x: 2, y: 4, label: '南门' },
      { x: 2, y: 2, label: '钟塔' },
      { x: 4, y: 1, label: '灯树' }
    ]
  },
  {
    id: 'bridge-loop',
    title: '桥环巡游',
    intro: '路线会绕开中心。注意边界，撞墙会扣分。',
    timeLimitMs: 42000,
    start: { x: 4, y: 4 },
    targets: [
      { x: 4, y: 0, label: '桥头' },
      { x: 1, y: 0, label: '风铃' },
      { x: 1, y: 3, label: '回廊' },
      { x: 3, y: 3, label: '出口' }
    ]
  },
  {
    id: 'sky-drift',
    title: '天幕折线',
    intro: '最后一轮目标更多，保持节奏完成整张星图。',
    timeLimitMs: 48000,
    start: { x: 2, y: 2 },
    targets: [
      { x: 0, y: 2, label: '西塔' },
      { x: 0, y: 0, label: '月台' },
      { x: 4, y: 0, label: '云梯' },
      { x: 4, y: 4, label: '终点' }
    ]
  }
]

export const STAR_MAP_MOVES = [
  { gesture: OFFICIAL_GESTURES.OPEN_PALM, label: '张开手掌', shortLabel: '掌', direction: 'up', dx: 0, dy: -1, icon: '↑' },
  { gesture: OFFICIAL_GESTURES.CLOSED_FIST, label: '握拳', shortLabel: '拳', direction: 'down', dx: 0, dy: 1, icon: '↓' },
  { gesture: OFFICIAL_GESTURES.VICTORY, label: '比出 V', shortLabel: 'V', direction: 'left', dx: -1, dy: 0, icon: '←' },
  { gesture: OFFICIAL_GESTURES.THUMB_UP, label: '点赞', shortLabel: '赞', direction: 'right', dx: 1, dy: 0, icon: '→' }
]

function createInitialState() {
  return {
    phase: 'idle',
    rounds: GESTURE_STAR_MAP_ROUNDS,
    roundIndex: 0,
    totalRounds: GESTURE_STAR_MAP_ROUNDS.length,
    targetIndex: 0,
    completedRounds: 0,
    capturedTargets: 0,
    score: 0,
    moves: 0,
    misses: 0,
    position: { ...GESTURE_STAR_MAP_ROUNDS[0].start },
    deadlineAt: 0,
    roundStartedAt: 0,
    sessionStartedAt: 0,
    lastGesture: '',
    lastMoveAt: 0,
    feedback: '申请摄像头后开始，用手势移动信标点亮星图。',
    recorded: false
  }
}

function getMove(gestureName) {
  const normalized = normalizeGesture(gestureName)
  return STAR_MAP_MOVES.find((move) => normalizeGesture(move.gesture) === normalized) || null
}

function normalizeGesture(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function clampGrid(value) {
  return Math.max(0, Math.min(STAR_GRID_SIZE - 1, value))
}

function sameCell(a, b) {
  return a?.x === b?.x && a?.y === b?.y
}

function getTotalTargets(state) {
  return state.rounds.reduce((sum, round) => sum + round.targets.length, 0)
}

function startRoundState(state, roundIndex, now) {
  const round = state.rounds[roundIndex]
  return {
    ...state,
    phase: 'active',
    roundIndex,
    targetIndex: 0,
    position: { ...round.start },
    deadlineAt: now + round.timeLimitMs,
    roundStartedAt: now,
    lastGesture: '',
    lastMoveAt: 0,
    feedback: `${round.title} 已开始，先去点亮：${round.targets[0].label}`,
    recorded: false
  }
}

function captureTarget(state, now, manual = false) {
  const round = getStarMapRound(state)
  const target = getStarMapTarget(state)
  if (!round || !target) return state

  const capturedTargets = state.capturedTargets + 1
  const timeBonus = Math.max(0, Math.ceil((state.deadlineAt - now) / 1000))
  const scoreGain = manual ? 30 : 70 + timeBonus * 2
  const nextTargetIndex = state.targetIndex + 1

  if (nextTargetIndex >= round.targets.length) {
    const completedRounds = state.completedRounds + 1
    const nextRound = state.rounds[state.roundIndex + 1]
    const nextScore = state.score + scoreGain + 50

    if (!nextRound) {
      return {
        ...state,
        phase: 'done',
        completedRounds,
        capturedTargets,
        score: nextScore,
        feedback: '整张星图点亮完成。',
        recorded: false
      }
    }

    return startRoundState(
      {
        ...state,
        completedRounds,
        capturedTargets,
        score: nextScore,
        feedback: `${round.title} 完成。`
      },
      state.roundIndex + 1,
      now
    )
  }

  const nextTarget = round.targets[nextTargetIndex]
  return {
    ...state,
    targetIndex: nextTargetIndex,
    capturedTargets,
    score: state.score + scoreGain,
    feedback: `${target.label} 已点亮，下一站：${nextTarget.label}`
  }
}

export function createStarMapState() {
  return createInitialState()
}

export function startStarMapState(state, now = Date.now()) {
  return startRoundState(
    {
      ...createInitialState(),
      sessionStartedAt: now,
      rounds: state?.rounds || GESTURE_STAR_MAP_ROUNDS
    },
    0,
    now
  )
}

export function resetStarMapState(cameraReady = false) {
  return {
    ...createInitialState(),
    feedback: cameraReady ? '已重置，可以重新开始星图。' : '先申请摄像头，再开始星图。'
  }
}

export function tickStarMapState(state, now = Date.now()) {
  if (state.phase !== 'active') return state
  if (state.deadlineAt && now >= state.deadlineAt) {
    return {
      ...state,
      phase: 'failed',
      feedback: '时间到了，星图没有点亮完成。',
      misses: state.misses + 1
    }
  }
  return state
}

export function applyStarMapGesture(state, gestureName, now = Date.now()) {
  let next = tickStarMapState(state, now)
  if (next.phase !== 'active') return next

  const move = getMove(gestureName)
  if (!move) {
    if (!gestureName || gestureName === OFFICIAL_GESTURES.NONE) return next
    return {
      ...next,
      lastGesture: String(gestureName || ''),
      feedback: '这个手势不是移动指令。'
    }
  }

  if (now - next.lastMoveAt < MOVE_COOLDOWN_MS) {
    return {
      ...next,
      lastGesture: move.gesture
    }
  }

  const moved = {
    x: clampGrid(next.position.x + move.dx),
    y: clampGrid(next.position.y + move.dy)
  }
  const hitWall = sameCell(moved, next.position)
  const afterMove = {
    ...next,
    position: moved,
    lastGesture: move.gesture,
    lastMoveAt: now,
    moves: next.moves + 1,
    misses: hitWall ? next.misses + 1 : next.misses,
    score: Math.max(0, next.score - (hitWall ? 8 : 0)),
    feedback: hitWall ? `${move.label}撞到边界了，换个方向。` : `${move.label}：信标移动 ${move.icon}`
  }

  const target = getStarMapTarget(afterMove)
  if (sameCell(afterMove.position, target)) {
    return captureTarget(afterMove, now)
  }

  return afterMove
}

export function completeCurrentStarMapTarget(state, now = Date.now()) {
  const next = tickStarMapState(state, now)
  if (next.phase !== 'active') return next
  const target = getStarMapTarget(next)
  if (!target) return next
  return captureTarget({ ...next, position: { x: target.x, y: target.y } }, now, true)
}

export function getStarMapRound(state) {
  return state.rounds[state.roundIndex] || null
}

export function getStarMapTarget(state) {
  const round = getStarMapRound(state)
  return round?.targets[state.targetIndex] || null
}

export function getStarMapProgress(state) {
  const visibleRound = state.phase === 'done'
    ? state.totalRounds
    : Math.min(state.completedRounds + 1, state.totalRounds)
  return `${visibleRound}/${state.totalRounds} 轮 · ${state.capturedTargets}/${getTotalTargets(state)} 星`
}

export function getStarMapTimerText(state, now = Date.now()) {
  if (state.phase !== 'active') return '00:00'
  return formatDuration(Math.max(0, state.deadlineAt - now))
}

export function getStarMapMoveLabel(gestureName) {
  const move = getMove(gestureName)
  return move ? `${move.label} ${move.icon}` : '等待手势'
}

function formatDuration(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
