
import { OFFICIAL_GESTURES, scoreSkeletonQuality } from '../utils/gesture/mediapipeGestureEngine'

export const HAND_SEEK_MS = 5000

export const DIFFICULTY_LEVELS = [
  {
    id: 'easy',
    name: '轻松',
    rounds: 5,
    stableFrames: 4,
    motionX: 0.14,
    motionY: 0.13,
    gestureScore: 0.56,
    countdownMs: 1300,
    successMs: 760,
    label: '适合先熟悉画面'
  },
  {
    id: 'normal',
    name: '标准',
    rounds: 7,
    stableFrames: 5,
    motionX: 0.17,
    motionY: 0.15,
    gestureScore: 0.62,
    countdownMs: 1400,
    successMs: 820,
    label: '推荐课堂演示'
  },
  {
    id: 'hard',
    name: '挑战',
    rounds: 9,
    stableFrames: 6,
    motionX: 0.20,
    motionY: 0.18,
    gestureScore: 0.68,
    countdownMs: 1500,
    successMs: 880,
    label: '动作更稳才通过'
  }
]

export const REACTION_TASKS = [
  {
    id: 'move-left',
    type: 'motion',
    label: '向你的左边挥一下',
    hint: '屏幕左边就是你的左边，横向位移要明显。',
    icon: '←'
  },
  {
    id: 'move-right',
    type: 'motion',
    label: '向你的右边挥一下',
    hint: '屏幕右边就是你的右边，横向位移要明显。',
    icon: '→'
  },
  {
    id: 'move-up',
    type: 'motion',
    label: '向上抬一下',
    hint: '手掌整体向上移动，幅度要明显。',
    icon: '↑'
  },
  {
    id: 'move-down',
    type: 'motion',
    label: '向下压一下',
    hint: '手掌整体向下移动，幅度要明显。',
    icon: '↓'
  },
  {
    id: 'open-palm',
    type: 'gesture',
    label: '张开手掌',
    hint: '手掌打开，手指尽量展开，保持半秒。',
    icon: '✋',
    officialGesture: OFFICIAL_GESTURES.OPEN_PALM
  },
  {
    id: 'closed-fist',
    type: 'gesture',
    label: '握拳',
    hint: '握成拳头，保持半秒。',
    icon: '✊',
    officialGesture: OFFICIAL_GESTURES.CLOSED_FIST
  },
  {
    id: 'thumb-up',
    type: 'gesture',
    label: '点赞',
    hint: '摆出点赞手势，保持半秒。',
    icon: '👍',
    officialGesture: OFFICIAL_GESTURES.THUMB_UP
  },
  {
    id: 'victory',
    type: 'gesture',
    label: '比 V',
    hint: '摆出剪刀手，保持半秒。',
    icon: '✌',
    officialGesture: OFFICIAL_GESTURES.VICTORY
  },
  {
    id: 'pointing-up',
    type: 'gesture',
    label: '食指向上',
    hint: '伸出食指向上，保持半秒。',
    icon: '☝',
    officialGesture: OFFICIAL_GESTURES.POINTING_UP
  }
]

export function getDifficulty(id = 'normal') {
  return DIFFICULTY_LEVELS.find((item) => item.id === id) || DIFFICULTY_LEVELS[1]
}

export function buildReactionDeck(difficulty = getDifficulty()) {
  const motion = shuffle(REACTION_TASKS.filter((task) => task.type === 'motion'))
  const gesture = shuffle(REACTION_TASKS.filter((task) => task.type === 'gesture'))
  const deck = interleave(motion, gesture)

  while (deck.length < difficulty.rounds) {
    deck.push(...shuffle(REACTION_TASKS))
  }

  return deck.slice(0, difficulty.rounds)
}

export function createReactionState(difficulty = getDifficulty()) {
  return {
    total: difficulty.rounds,
    difficultyId: difficulty.id,
    tasks: [],
    currentIndex: 0,
    completedRounds: 0,
    score: 0,
    phase: 'idle',
    baselineCenter: null,
    stableFrames: 0,
    motionStrength: 0,
    roundStartedAt: 0,
    promptStartedAt: 0,
    countdownEndsAt: 0,
    successEndsAt: 0,
    handWindowEndsAt: 0,
    lastFeedback: '先申请摄像头权限。',
    recorded: false
  }
}

export function startReactionState(state, currentFrame, difficulty = getDifficulty(), now = Date.now()) {
  const tasks = buildReactionDeck(difficulty)

  return {
    ok: true,
    state: {
      ...state,
      total: difficulty.rounds,
      difficultyId: difficulty.id,
      tasks,
      currentIndex: 0,
      completedRounds: 0,
      score: 0,
      phase: 'seeking',
      baselineCenter: currentFrame?.center ? { ...currentFrame.center } : null,
      stableFrames: 0,
      motionStrength: 0,
      roundStartedAt: now,
      promptStartedAt: 0,
      countdownEndsAt: 0,
      successEndsAt: 0,
      handWindowEndsAt: now + HAND_SEEK_MS,
      lastFeedback: '开始已确认。请在 5 秒内把一只手完整伸到摄像头前，识别到骨骼后会自动开始。',
      recorded: false
    },
    feedback: '开始已确认。请在 5 秒内把一只手完整伸到摄像头前，识别到骨骼后会自动开始。'
  }
}

export function resetReactionState(difficulty = getDifficulty(), cameraRunning = false) {
  return {
    ...createReactionState(difficulty),
    lastFeedback: cameraRunning ? '已重置。骨骼清晰后可以重新开始。' : '先申请摄像头权限。'
  }
}

export function advanceReactionPhase(state, frame, difficulty = getDifficulty(), now = Date.now()) {
  if (state.phase === 'seeking') {
    const quality = scoreSkeletonQuality(frame)
    if (quality.ready && frame?.center) {
      const task = state.tasks[state.currentIndex]
      return {
        ...state,
        phase: 'countdown',
        baselineCenter: { ...frame.center },
        stableFrames: 0,
        motionStrength: 0,
        promptStartedAt: 0,
        countdownEndsAt: now + difficulty.countdownMs,
        successEndsAt: 0,
        handWindowEndsAt: 0,
        lastFeedback: `已识别到手部骨骼。第 1 / ${difficulty.rounds} 题准备：${task?.label || '准备开始'}`
      }
    }

    if (now >= state.handWindowEndsAt) {
      return {
        ...createReactionState(difficulty),
        lastFeedback: '5 秒内没有识别到完整手部，已取消开始。请把手靠近摄像头后重新点击开始挑战。'
      }
    }
  }

  if (state.phase === 'countdown' && now >= state.countdownEndsAt) {
    return beginActionPhase(state, frame, now)
  }

  if (state.phase === 'success' && now >= state.successEndsAt) {
    if (state.completedRounds >= state.total) {
      return {
        ...state,
        phase: 'finished',
        lastFeedback: `挑战完成：${state.completedRounds}/${state.total}，${state.score} 分。`
      }
    }

    const nextIndex = state.currentIndex + 1
    const nextTask = state.tasks[nextIndex]

    return {
      ...state,
      phase: 'countdown',
      currentIndex: nextIndex,
      stableFrames: 0,
      motionStrength: 0,
      baselineCenter: frame?.center ? { ...frame.center } : state.baselineCenter,
      promptStartedAt: 0,
      countdownEndsAt: now + difficulty.countdownMs,
      successEndsAt: 0,
      handWindowEndsAt: 0,
      lastFeedback: `第 ${nextIndex + 1} / ${state.total} 题准备：${nextTask?.label || '准备'}`
    }
  }

  return state
}

function beginActionPhase(state, frame, now = Date.now()) {
  const task = state.tasks[state.currentIndex]

  return {
    ...state,
    phase: 'action',
    baselineCenter: frame?.center ? { ...frame.center } : state.baselineCenter,
    promptStartedAt: now + 180,
    stableFrames: 0,
    motionStrength: 0,
    lastFeedback: task ? `开始：${task.label}` : '开始动作。'
  }
}

export function evaluateReactionFrame(state, frame, difficulty = getDifficulty(), now = Date.now()) {
  if (state.phase !== 'action') {
    return { state, completed: false, finished: false, feedback: state.lastFeedback }
  }

  const task = state.tasks[state.currentIndex]
  if (!task) {
    return {
      state: {
        ...state,
        phase: 'finished',
        lastFeedback: '挑战完成。'
      },
      completed: false,
      finished: true,
      feedback: '挑战完成。'
    }
  }

  const quality = scoreSkeletonQuality(frame)
  if (!quality.ready || !frame?.center) {
    return {
      state: {
        ...state,
        stableFrames: 0,
        motionStrength: 0,
        lastFeedback: '骨骼不够清晰：请靠近一点，露出完整手掌。'
      },
      completed: false,
      finished: false,
      feedback: '骨骼不够清晰：请靠近一点，露出完整手掌。'
    }
  }

  if (now < state.promptStartedAt) {
    return {
      state: {
        ...state,
        lastFeedback: '保持手掌可见，马上开始判定。'
      },
      completed: false,
      finished: false,
      feedback: '保持手掌可见，马上开始判定。'
    }
  }

  const evaluation = task.type === 'motion'
    ? evaluateMotionTask(task, frame.center, state.baselineCenter, difficulty)
    : evaluateOfficialGestureTask(task, frame, difficulty)

  const nextStableFrames = evaluation.matched
    ? state.stableFrames + 1
    : Math.max(0, state.stableFrames - 1)

  const nextState = {
    ...state,
    stableFrames: nextStableFrames,
    motionStrength: evaluation.strength,
    lastFeedback: evaluation.feedback
  }

  if (nextStableFrames < difficulty.stableFrames) {
    return {
      state: nextState,
      completed: false,
      finished: false,
      feedback: evaluation.feedback
    }
  }

  const scoreBonus = Math.max(0, 26 - Math.round((now - state.promptStartedAt) / 180))
  const scoreGain = task.type === 'gesture' ? 95 + scoreBonus : 85 + scoreBonus
  const completedRounds = state.completedRounds + 1
  const nextScore = state.score + scoreGain

  return {
    state: {
      ...nextState,
      completedRounds,
      score: nextScore,
      phase: 'success',
      stableFrames: 0,
      motionStrength: 0,
      successEndsAt: now + difficulty.successMs,
      lastFeedback: `${task.label} 成功！准备下一题。`
    },
    completed: true,
    finished: completedRounds >= state.total,
    feedback: `${task.label} 成功！准备下一题。`
  }
}

export function getCountdownText(state, now = Date.now()) {
  if (state.phase !== 'countdown') return ''
  const left = Math.max(0, state.countdownEndsAt - now)
  if (left > 1000) return '3'
  if (left > 500) return '2'
  if (left > 0) return '1'
  return '开始'
}

export function getHandSeekText(state, now = Date.now()) {
  if (state.phase !== 'seeking') return ''
  const left = Math.max(0, Math.ceil((state.handWindowEndsAt - now) / 1000))
  return String(left)
}

export function getCurrentTask(state) {
  return state.tasks[state.currentIndex] || null
}

export function getTaskPrompt(state) {
  const task = getCurrentTask(state)

  if (state.phase === 'finished') {
    return {
      label: '挑战完成',
      hint: `共完成 ${state.completedRounds}/${state.total} 个动作。`,
      icon: '★',
      type: 'done'
    }
  }

  if (state.phase === 'success') {
    return {
      label: '成功',
      hint: '这一题完成，马上进入下一题。',
      icon: '✓',
      type: 'success'
    }
  }

  if (state.phase === 'seeking') {
    return {
      label: '伸手入镜',
      hint: '5 秒内识别到完整手部后自动开始。',
      icon: '✋',
      type: 'seeking'
    }
  }

  if (!task) {
    return {
      label: '准备开始',
      hint: '申请摄像头后，系统会随机给出动作牌。',
      icon: 'GF',
      type: 'idle'
    }
  }

  if (state.phase === 'countdown') {
    return {
      ...task,
      label: `第 ${state.currentIndex + 1} 题准备`,
      hint: task.label
    }
  }

  return task
}

export function getModeText() {
  return '单手模式：任意一只手都可以玩，系统只追踪当前最清晰的一只手。'
}

export function getOfficialGestureText(frame) {
  if (!frame?.hasHand) return '未识别'
  const name = frame.gestureName || OFFICIAL_GESTURES.NONE
  const score = Math.round((frame.gestureScore || 0) * 100)
  return `${name} · ${score}%`
}

function evaluateOfficialGestureTask(task, frame, difficulty) {
  const matched = frame.gestureName === task.officialGesture && frame.gestureScore >= difficulty.gestureScore
  return {
    matched,
    strength: frame.gestureScore || 0,
    feedback: matched
      ? `${task.label} 识别稳定，继续保持。`
      : `请摆出：${task.label}。当前官方识别：${frame.gestureName || 'None'}。`
  }
}

function evaluateMotionTask(task, center, baselineCenter, difficulty) {
  if (!center || !baselineCenter) {
    return { matched: false, strength: 0, feedback: '等待手部中心稳定。' }
  }

  const dx = center.x - baselineCenter.x
  const dy = center.y - baselineCenter.y
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)

  const horizontalClear = absX >= difficulty.motionX && absX >= absY * 1.28
  const verticalClear = absY >= difficulty.motionY && absY >= absX * 1.18

  let matched = false
  if (task.id === 'move-left') matched = horizontalClear && dx < 0
  if (task.id === 'move-right') matched = horizontalClear && dx > 0
  if (task.id === 'move-up') matched = verticalClear && dy < 0
  if (task.id === 'move-down') matched = verticalClear && dy > 0

  const strength = Math.max(absX, absY)

  return {
    matched,
    strength,
    feedback: matched
      ? `${task.label} 方向正确，继续保持。`
      : `${task.label}，动作幅度要更明显。`
  }
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function interleave(a, b) {
  const out = []
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i += 1) {
    if (a[i]) out.push(a[i])
    if (b[i]) out.push(b[i])
  }
  return out
}

