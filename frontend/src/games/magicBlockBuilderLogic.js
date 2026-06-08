import { OFFICIAL_GESTURES, scoreSkeletonQuality } from '../utils/gesture/mediapipeGestureEngine'

export const MAGIC_BLOCK_SEEK_MS = 5000
export const MAGIC_BLOCK_MODE_NAME = '自由物理玩具'

const GRAVITY = 9.8
const FRAME_DT = 1 / 60
const BOARD = {
  width: 7.4,
  depth: 4.6,
  groundY: 0,
  leftRecycleX: -4.55,
  rightRecycleX: 4.55
}

const HAND = {
  hoverMs: 260,
  closeMs: 360,
  releaseMs: 340,
  minHoldMs: 360,
  lostGraceMs: 650,
  seekGraceMs: 900,
  calmGrab: 0.055,
  calmDrop: 0.075
}

export const MAGIC_BLOCK_DIFFICULTIES = [
  {
    id: 'easy',
    name: '轻柔物理',
    lives: 999,
    towerGoal: 5,
    windPower: 3.0,
    friction: 0.88,
    lockHeight: 1.20,
    label: '自由物理玩具：固定自由沙盒，重力更温和，适合先熟悉抓取、放下和堆叠。'
  },
  {
    id: 'normal',
    name: '标准物理',
    lives: 999,
    towerGoal: 7,
    windPower: 4.0,
    friction: 0.86,
    lockHeight: 1.45,
    label: '自由物理玩具：推荐课堂演示，方块会下落、堆叠、受风、被抽底后自然掉落。'
  },
]

const BLOCK_CATALOG = [
  { type: 'wood-cube', name: '奶油木块', shape: 'box', w: 1.05, h: 0.72, d: 0.82, color: '#e8bf7c', accent: '#f7dca4', weight: 1.1 },
  { type: 'blue-plank', name: '星桥板', shape: 'box', w: 1.72, h: 0.42, d: 0.76, color: '#87b9cf', accent: '#c8e6ef', weight: 1.0 },
  { type: 'pink-brick', name: '草莓砖', shape: 'box', w: 1.22, h: 0.58, d: 0.82, color: '#e9a28b', accent: '#ffd0bd', weight: 0.95 },
  { type: 'mint-block', name: '薄荷块', shape: 'box', w: 1.20, h: 0.58, d: 0.92, color: '#9fc6ae', accent: '#d7ead8', weight: 0.9 },
  { type: 'star-gold', name: '星星块', shape: 'star', w: 1.05, h: 0.54, d: 0.80, color: '#f1c95f', accent: '#fff0ae', weight: 0.86 },
  { type: 'crystal', name: '水晶块', shape: 'crystal', w: 0.92, h: 0.78, d: 0.72, color: '#b8a9ee', accent: '#f3e8ff', weight: 0.7 },
  { type: 'arch', name: '拱桥块', shape: 'arch', w: 1.48, h: 0.92, d: 0.74, color: '#94b5d1', accent: '#d7edf5', weight: 1.05 },
  { type: 'roof', name: '小屋顶', shape: 'roof', w: 1.10, h: 0.72, d: 0.82, color: '#e3ad51', accent: '#ffe0a1', weight: 0.78 }
]

const VIEW_PRESETS = {
  plaza: { name: '广场视角', scale: 62, lift: 34, depth: 23, horizon: 0.62, rot: 0 },
  close: { name: '近景视角', scale: 73, lift: 39, depth: 26, horizon: 0.66, rot: 0 },
  top: { name: '俯视辅助', scale: 67, lift: 22, depth: 12, horizon: 0.58, rot: 0 }
}

let nextId = 1

export function getMagicBlockDifficulty(id = 'normal') {
  return MAGIC_BLOCK_DIFFICULTIES.find((item) => item.id === id) || MAGIC_BLOCK_DIFFICULTIES[1]
}

export function createMagicBlockState(difficulty = getMagicBlockDifficulty()) {
  return {
    phase: 'idle',
    mode: 'freebuild',
    difficultyId: difficulty.id,
    viewMode: 'plaza',
    blocks: createInitialBlocks(),
    activeBlock: createBlock(0, { x: 0, y: 2.9, z: 0.1, kinematic: true }),
    holdingId: null,
    heldOffset: { x: 0, y: 0, z: 0 },
    hoverBlockId: null,
    hoverOpenSince: 0,
    closeSince: 0,
    releaseSince: 0,
    protectedUntil: 0,
    handWindowEndsAt: 0,
    lastHandSeenAt: 0,
    lastHand: null,
    lastHandHistory: [],
    gesture: createGestureSnapshot(),
    cursor: { x: 0, y: 2.1, z: 0.5, visible: false },
    expression: createExpressionSnapshot(),
    score: 0,
    stars: 0,
    maxHeight: 0,
    stableSeconds: 0,
    combo: 0,
    wind: { activeUntil: 0, power: 0, direction: 1, source: '' },
    sunshine: { activeUntil: 0, rainbowUntil: 0, source: '' },
    effects: [],
    achievements: [],
    feedback: '自由搭建模式：张开手移动，方块上方张开到闭合才抓取，闭合到张开放下。',
    roundStartedAt: 0,
    lastUpdatedAt: 0,
    recorded: false
  }
}

export function resetMagicBlockState(difficulty = getMagicBlockDifficulty(), cameraReady = false) {
  return {
    ...createMagicBlockState(difficulty),
    feedback: cameraReady ? '已重置。可以重新开始自由搭建。' : '先申请摄像头权限。'
  }
}

export function startMagicBlockState(state, difficulty = getMagicBlockDifficulty(), now = Date.now()) {
  return {
    ...state,
    phase: 'seeking',
    handWindowEndsAt: now + MAGIC_BLOCK_SEEK_MS,
    protectedUntil: now + HAND.seekGraceMs,
    roundStartedAt: now,
    lastUpdatedAt: now,
    recorded: false,
    feedback: '5 秒找手窗口已开启。识别到手后进入自由搭建，不需要回来点按钮。'
  }
}

export function updateMagicBlockFrame(state, frame, difficulty = getMagicBlockDifficulty(), now = Date.now()) {
  const dt = clamp(((state.lastUpdatedAt ? now - state.lastUpdatedAt : 16) / 1000), 0.006, 0.045)
  const quality = scoreSkeletonQuality(frame)
  const gesture = analyzeHandGesture(frame, state.lastHand, now)
  const history = updateHandHistory(state.lastHandHistory, gesture, now)
  const handSeenAt = gesture.hasHand ? now : state.lastHandSeenAt
  let next = stepPhysics({
    ...state,
    gesture,
    lastHandHistory: history,
    lastHandSeenAt: handSeenAt,
    lastUpdatedAt: now
  }, difficulty, dt, now)

  if (next.phase === 'idle' || next.phase === 'finished' || next.phase === 'failed') {
    return updatePassiveHand(next, gesture)
  }

  if (next.phase === 'seeking') {
    if (quality.ready && gesture.hasHand) {
      return {
        ...next,
        phase: 'playing',
        protectedUntil: now + HAND.seekGraceMs,
        lastHand: gesture.center,
        cursor: mapHandToWorld(gesture),
        feedback: '手已找到。先稳定一下，张开手只会移动，不会误抓。'
      }
    }

    if (now >= next.handWindowEndsAt) {
      return {
        ...next,
        phase: 'idle',
        feedback: '5 秒内没有识别到完整手部。请把手伸进画面后重新开始。'
      }
    }

    return {
      ...next,
      feedback: `正在找手：还剩 ${getMagicBlockSeekText(next, now)} 秒。`
    }
  }

  if (next.phase !== 'playing') return next

  if (!quality.ready || !gesture.hasHand) {
    return {
      ...next,
      cursor: { ...next.cursor, visible: false },
      releaseSince: 0,
      closeSince: 0,
      feedback: now - next.lastHandSeenAt <= HAND.lostGraceMs ? '手部暂时不清晰，积木保持当前物理状态。' : '没有识别到完整手部。主舞台仍会继续物理模拟。'
    }
  }

  next = {
    ...next,
    cursor: mapHandToWorld(gesture),
    lastHand: gesture.center
  }

  if (now < next.protectedUntil) {
    return {
      ...next,
      feedback: '校准中：张开手移动光标，稍等一下再抓取。'
    }
  }

  return updateHandStateMachine(next, gesture, difficulty, now)
}

export function changeMagicBlockPiece(state, difficulty = getMagicBlockDifficulty(), now = Date.now()) {
  if (state.holdingId) {
    return { ...state, feedback: '正在拿着积木。先张开手放下，或者拖到两侧回收篮。' }
  }

  return {
    ...state,
    activeBlock: createBlock(state.blocks.length + 1, { x: 0, y: 2.8, z: 0.25, kinematic: true }),
    protectedUntil: now + 420,
    feedback: '已换成新的积木。张开手移动到积木上方，再闭合抓取。'
  }
}

export function applyMagicBlockVoice(state, text, difficulty = getMagicBlockDifficulty(), now = Date.now()) {
  const raw = String(text || '').replace(/\s/g, '')
  if (/换|下一|change/i.test(raw)) return changeMagicBlockPiece(state, difficulty, now)
  if (/吹|wind/i.test(raw)) return applyMagicBlockExpression(state, { blow: true, source: '手动吹风按钮' }, difficulty, now)
  if (/放下|drop/i.test(raw)) return releaseHeldBlockByCommand(state, difficulty, now, '手动放下')
  if (/清空|重来|reset/i.test(raw)) return { ...createMagicBlockState(difficulty), phase: state.phase, feedback: '已重置自由积木舞台。' }
  return state
}

export function applyMagicBlockExpression(state, expression = {}, difficulty = getMagicBlockDifficulty(), now = Date.now()) {
  let next = {
    ...state,
    expression: {
      smile: Boolean(expression.smile),
      blow: Boolean(expression.blow),
      confidence: expression.confidence || 0,
      source: expression.source || ''
    }
  }

  if (expression.smile && now > (state.sunshine?.activeUntil || 0) - 900) {
    next = {
      ...next,
      sunshine: { activeUntil: now + 3600, rainbowUntil: now + 5200, source: expression.source || '微笑' },
      effects: addEffect(next.effects, { type: 'rainbow', t: now, x: 0, y: 3.4, z: -0.8, life: 5200 }),
      feedback: '微笑收到：阳光和彩虹出现，积木乐园变亮了。'
    }
  }

  if (expression.blow && now > (state.wind?.activeUntil || 0) - 900) {
    const direction = state.cursor?.x && state.cursor.x < 0 ? 1 : -1
    next = {
      ...next,
      wind: { activeUntil: now + 1700, power: difficulty.windPower, direction, source: expression.source || '吹气' },
      effects: addEffect(next.effects, { type: 'wind', t: now, x: direction < 0 ? 3 : -3, y: 1.8, z: 0, life: 1700 }),
      feedback: '吹风生效：高处和轻的积木会被推一下。'
    }
  }

  return next
}

export function setMagicBlockViewMode(state, viewMode = 'plaza') {
  const mode = VIEW_PRESETS[viewMode] ? viewMode : 'plaza'
  return {
    ...state,
    viewMode: mode,
    feedback: `已切换为${VIEW_PRESETS[mode].name}。视角固定，不会让孩子迷路。`
  }
}

export function getMagicBlockSeekText(state, now = Date.now()) {
  if (state.phase !== 'seeking') return ''
  return String(Math.max(0, Math.ceil((state.handWindowEndsAt - now) / 1000)))
}

export function getMagicBlockPrompt(state) {
  if (state.phase === 'seeking') return { title: '把手伸进画面', hint: '5 秒内识别到手后自动开始自由搭建。' }
  if (state.phase === 'playing') {
    if (state.holdingId) return { title: '正在拿积木', hint: '闭合手移动，张开手放下。拖到两侧回收篮可换块。' }
    if (state.hoverBlockId) return { title: '可以抓取', hint: '张开手停在积木上，闭合并保持一下才会抓。' }
    return { title: '自由搭建', hint: '张开手只移动光标，划过积木不会误抓。' }
  }
  return { title: '自由积木乐园', hint: '全屏轻 3D 物理舞台，搭高、抽底、吹风都会有反馈。' }
}

export function getMagicBlockSummary(state) {
  return {
    blocks: state.blocks.length,
    stableBlocks: state.blocks.filter((block) => block.sleeping).length,
    towerHeight: Math.max(0, ...state.blocks.map((block) => block.y + block.h / 2)),
    maxHeight: state.maxHeight,
    score: state.score,
    stars: state.stars,
    stableSeconds: state.stableSeconds,
    achievements: state.achievements,
    viewMode: VIEW_PRESETS[state.viewMode]?.name || '广场视角',
    interaction: state.holdingId ? 'holding' : state.hoverBlockId ? 'hover' : 'free',
    palmState: state.gesture?.palmState || 'unknown',
    holding: Boolean(state.holdingId),
    expression: state.expression
  }
}

export function drawMagicBlockStage(canvas, state) {
  if (!canvas) return
  const ctx = prepareCanvas(canvas)
  const { width, height } = canvas
  const camera = buildCamera(width, height, state.viewMode)

  drawParkBackground(ctx, width, height, state)
  drawBuildTable(ctx, width, height, camera)
  drawRecycleZones(ctx, width, height, camera, state)

  const allBlocks = [state.activeBlock, ...state.blocks].filter(Boolean)
  allBlocks
    .slice()
    .sort((a, b) => (a.x + a.z + a.y * 0.18) - (b.x + b.z + b.y * 0.18))
    .forEach((block) => drawIsoBlock(ctx, camera, block, state))

  drawPhysicsEffects(ctx, camera, state)
  drawCartoonHandCursor(ctx, camera, state)
  drawFreeBuildHud(ctx, width, height, state)
  drawAchievementToasts(ctx, width, height, state)
}

function createInitialBlocks() {
  return [
    createBlock(100, { x: -1.35, y: 0.35, z: 0.1, type: 'wood-cube', sleeping: true }),
    createBlock(101, { x: 0.0, y: 0.22, z: 0.05, type: 'blue-plank', sleeping: true }),
    createBlock(102, { x: 1.35, y: 0.35, z: 0.1, type: 'pink-brick', sleeping: true })
  ]
}

function createBlock(seed = 0, overrides = {}) {
  const spec = BLOCK_CATALOG[seed % BLOCK_CATALOG.length]
  const block = {
    id: overrides.id || `block-${Date.now()}-${nextId++}`,
    type: overrides.type || spec.type,
    name: spec.name,
    shape: spec.shape,
    w: spec.w,
    h: spec.h,
    d: spec.d,
    weight: spec.weight,
    x: overrides.x ?? 0,
    y: overrides.y ?? 2.8,
    z: overrides.z ?? 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rot: 0,
    spin: 0,
    color: overrides.color || spec.color,
    accent: overrides.accent || spec.accent,
    kinematic: overrides.kinematic ?? false,
    sleeping: overrides.sleeping ?? false,
    grabbed: false
  }
  return block
}

function createGestureSnapshot() {
  return {
    hasHand: false,
    center: null,
    landmarks: [],
    palmState: 'unknown',
    openSignal: false,
    closedSignal: false,
    velocity: { x: 0, y: 0, speed: 0 },
    gestureName: 'None'
  }
}

function createExpressionSnapshot() {
  return { smile: false, blow: false, confidence: 0, source: '' }
}

function updatePassiveHand(state, gesture) {
  return {
    ...state,
    cursor: gesture.hasHand ? mapHandToWorld(gesture) : { ...state.cursor, visible: false },
    lastHand: gesture.hasHand ? gesture.center : state.lastHand
  }
}

function analyzeHandGesture(frame, lastCenter) {
  if (!frame?.hasHand || !frame.landmarks?.length) return createGestureSnapshot()

  const landmarks = frame.landmarks
  const wrist = landmarks[0]
  const thumb = landmarks[4]
  const index = landmarks[8]
  const middle = landmarks[12]
  const ring = landmarks[16]
  const pinky = landmarks[20]
  const palmCenter = averagePoint([landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]])
  const center = { x: wrist.x, y: wrist.y, z: wrist.z || 0 }
  const pinchDistance = distance(thumb, index)
  const spread = [index, middle, ring, pinky].reduce((sum, point) => sum + distance(point, wrist), 0) / 4
  const velocity = lastCenter
    ? { x: center.x - lastCenter.x, y: center.y - lastCenter.y, speed: Math.hypot(center.x - lastCenter.x, center.y - lastCenter.y) }
    : { x: 0, y: 0, speed: 0 }

  const closedSignal = frame.gestureName === OFFICIAL_GESTURES.CLOSED_FIST || pinchDistance < 0.060 || spread < 0.245
  const openSignal = frame.gestureName === OFFICIAL_GESTURES.OPEN_PALM || (spread > 0.355 && pinchDistance > 0.078)

  return {
    hasHand: true,
    center,
    palmCenter,
    wrist: center,
    landmarks,
    pinchDistance,
    fingerSpread: spread,
    palmState: closedSignal ? 'closed' : openSignal ? 'open' : 'unknown',
    openSignal,
    closedSignal,
    velocity,
    gestureName: frame.gestureName || 'None'
  }
}

function updateHandHistory(history, gesture, now) {
  const next = [...history]
  if (gesture.hasHand) next.push({ t: now, center: gesture.center, palmState: gesture.palmState, speed: gesture.velocity.speed })
  return next.filter((item) => now - item.t < 1100).slice(-30)
}

function mapHandToWorld(gesture) {
  const x = clamp((gesture.center.x - 0.5) * BOARD.width * 1.12, -BOARD.width / 2, BOARD.width / 2)
  const z = clamp((gesture.center.y - 0.52) * BOARD.depth * 1.42, -BOARD.depth / 2, BOARD.depth / 2)
  const y = 2.25
  return { x, y, z, visible: true }
}

function updateHandStateMachine(state, gesture, difficulty, now) {
  const hoverId = findHoverBlockId(state, state.cursor)
  let next = { ...state, hoverBlockId: hoverId }

  if (state.holdingId) {
    next = moveHeldBlock(next, state.holdingId, state.cursor)
    const heldLongEnough = now - (state.grabbedAt || now) > HAND.minHoldMs
    const calmEnough = gesture.velocity.speed < HAND.calmDrop

    if (gesture.palmState === 'open' && heldLongEnough && calmEnough) {
      const releaseSince = state.releaseSince || now
      if (now - releaseSince >= HAND.releaseMs) {
        return releaseHeldBlock(next, state.holdingId, difficulty, now, '张开手放下')
      }
      return { ...next, releaseSince, feedback: '保持张开一小会儿，积木就会落下。' }
    }

    return { ...next, releaseSince: 0, feedback: '闭合手掌正在拿积木；张开手掌放下。' }
  }

  if (!hoverId) {
    return { ...next, hoverOpenSince: 0, closeSince: 0, releaseSince: 0, feedback: '张开手只是移动光标；移动到积木上再闭合才能抓取。' }
  }

  if (gesture.palmState === 'open') {
    const hoverOpenSince = state.hoverOpenSince || now
    return {
      ...next,
      hoverOpenSince,
      closeSince: 0,
      feedback: now - hoverOpenSince > HAND.hoverMs ? '小手在积木上方。闭合并保持一下才会抓取。' : '张开手经过积木，不会自动抓。'
    }
  }

  if (gesture.palmState === 'closed') {
    const armed = state.hoverOpenSince && now - state.hoverOpenSince >= HAND.hoverMs && now - state.hoverOpenSince < 2400
    const calmEnough = gesture.velocity.speed < HAND.calmGrab
    if (!armed || !calmEnough) {
      return { ...next, closeSince: 0, feedback: '先张开手停在积木上方，再闭合抓取；直接闭合划过不会抓。' }
    }

    const closeSince = state.closeSince || now
    if (now - closeSince >= HAND.closeMs) {
      return grabBlock(next, hoverId, now)
    }
    return { ...next, closeSince, feedback: '检测到抓取动作，请保持闭合。' }
  }

  return { ...next, feedback: '手势状态不够明确，请张开或闭合得更明显一点。' }
}

function findHoverBlockId(state, cursor) {
  if (!cursor?.visible) return null
  const candidates = [state.activeBlock, ...state.blocks]
    .filter((block) => block && !block.grabbed)
    .map((block) => ({ block, dist: Math.hypot(block.x - cursor.x, block.z - cursor.z) + Math.max(0, block.y - cursor.y) * 0.15 }))
    .filter(({ block, dist }) => dist < Math.max(0.62, (block.w + block.d) * 0.36))
    .sort((a, b) => a.dist - b.dist)
  return candidates[0]?.block?.id || null
}

function grabBlock(state, blockId, now) {
  const activeIsGrabbed = state.activeBlock?.id === blockId
  const block = activeIsGrabbed ? state.activeBlock : state.blocks.find((item) => item.id === blockId)
  if (!block) return state
  const grabbed = { ...block, grabbed: true, kinematic: true, vx: 0, vy: 0, vz: 0, sleeping: false }
  return {
    ...state,
    activeBlock: activeIsGrabbed ? grabbed : state.activeBlock,
    blocks: activeIsGrabbed ? state.blocks : state.blocks.filter((item) => item.id !== blockId),
    holdingId: blockId,
    grabbedAt: now,
    heldOffset: { x: state.cursor.x - block.x, y: 1.15, z: state.cursor.z - block.z },
    hoverOpenSince: 0,
    closeSince: 0,
    releaseSince: 0,
    feedback: '抓住了。小手控制积木在 3D 搭建台上移动。'
  }
}

function moveHeldBlock(state, blockId, cursor) {
  const activeIsHeld = state.activeBlock?.id === blockId
  const block = activeIsHeld ? state.activeBlock : state.blocks.find((item) => item.id === blockId)
  if (!block || !cursor?.visible) return state
  const nextBlock = {
    ...block,
    x: block.x + (cursor.x - state.heldOffset.x - block.x) * 0.38,
    y: Math.max(1.05, block.y + (cursor.y - block.y) * 0.22),
    z: block.z + (cursor.z - state.heldOffset.z - block.z) * 0.38,
    vx: 0,
    vy: 0,
    vz: 0,
    kinematic: true,
    grabbed: true
  }
  return activeIsHeld
    ? { ...state, activeBlock: nextBlock }
    : { ...state, blocks: state.blocks.map((item) => item.id === blockId ? nextBlock : item) }
}

function releaseHeldBlock(state, blockId, difficulty, now, reason = '放下') {
  const activeIsHeld = state.activeBlock?.id === blockId
  const block = activeIsHeld ? state.activeBlock : state.blocks.find((item) => item.id === blockId)
  if (!block) return state

  if (isRecyclePosition(block)) {
    return {
      ...state,
      activeBlock: createBlock(state.blocks.length + 10, { x: 0, y: 2.8, z: 0.15, kinematic: true }),
      blocks: activeIsHeld ? state.blocks : state.blocks.filter((item) => item.id !== blockId),
      holdingId: null,
      releaseSince: 0,
      feedback: '已放进回收篮，换了一块新积木。'
    }
  }

  const released = {
    ...block,
    grabbed: false,
    kinematic: false,
    vy: Math.min(block.vy, 0),
    sleeping: false
  }
  const blocks = activeIsHeld
    ? [...state.blocks, released]
    : state.blocks.map((item) => item.id === blockId ? released : item)
  const achievements = updateAchievements(state, blocks, now)
  return {
    ...state,
    activeBlock: activeIsHeld ? createBlock(blocks.length + 3, { x: 0, y: 2.8, z: 0.2, kinematic: true }) : state.activeBlock,
    blocks,
    holdingId: null,
    releaseSince: 0,
    score: state.score + 12,
    combo: state.combo + 1,
    achievements: achievements.list,
    effects: addEffect(state.effects, { type: 'place', t: now, x: released.x, y: released.y, z: released.z, life: 950 }),
    feedback: achievements.newText || `${reason}：积木会按真实物理继续下落、碰撞和堆叠。`
  }
}

function releaseHeldBlockByCommand(state, difficulty, now, reason) {
  if (!state.holdingId) return { ...state, feedback: '现在没有抓住积木。' }
  return releaseHeldBlock(state, state.holdingId, difficulty, now, reason)
}

function isRecyclePosition(block) {
  return block.x < BOARD.leftRecycleX + 0.75 || block.x > BOARD.rightRecycleX - 0.75
}

function stepPhysics(state, difficulty, dt, now) {
  const dynamicBlocks = state.blocks.map((block) => ({ ...block }))
  const windActive = now < state.wind.activeUntil
  const windStrength = windActive ? state.wind.power : 0

  for (const block of dynamicBlocks) {
    if (block.kinematic || block.grabbed) continue
    block.vy -= GRAVITY * dt
    if (windStrength && block.y > 0.55) block.vx += (windStrength / block.weight) * state.wind.direction * dt
    block.x += block.vx * dt
    block.y += block.vy * dt
    block.z += block.vz * dt
    block.vx *= difficulty.friction
    block.vz *= difficulty.friction
    block.spin *= 0.96
    block.rot += block.spin * dt
  }

  dynamicBlocks.sort((a, b) => a.y - b.y)

  for (const block of dynamicBlocks) {
    if (block.kinematic || block.grabbed) continue
    let supportY = block.h / 2
    let support = null
    for (const other of dynamicBlocks) {
      if (other.id === block.id) continue
      if (other.y + other.h / 2 <= block.y - block.h / 2 + 0.22 && overlapXZ(block, other)) {
        const top = other.y + other.h / 2 + block.h / 2
        if (top > supportY) {
          supportY = top
          support = other
        }
      }
    }
    if (block.y <= supportY) {
      block.y = supportY
      block.vy = Math.max(0, block.vy) * 0.12
      block.sleeping = Math.abs(block.vx) < 0.012 && Math.abs(block.vz) < 0.012
      if (support && !stableOnSupport(block, support)) {
        const dir = Math.sign(block.x - support.x) || 1
        block.vx += dir * 0.12 * dt
        block.spin += dir * 0.9 * dt
        block.sleeping = false
      }
    } else {
      block.sleeping = false
    }
    if (block.x < -4.7 || block.x > 4.7 || block.z < -3.0 || block.z > 3.0 || block.y < -2.0) {
      block.removed = true
    }
  }

  const blocks = dynamicBlocks.filter((block) => !block.removed).slice(-42)
  const topHeight = Math.max(0, ...blocks.map((block) => block.y + block.h / 2))
  const stableSeconds = blocks.length && blocks.every((block) => block.sleeping || block.y <= block.h / 2 + 0.02)
    ? state.stableSeconds + dt
    : Math.max(0, state.stableSeconds - dt * 0.5)
  const achievements = updateAchievements(state, blocks, now, topHeight, stableSeconds)

  return {
    ...state,
    blocks,
    maxHeight: Math.max(state.maxHeight || 0, topHeight),
    stableSeconds,
    achievements: achievements.list,
    score: Math.max(state.score, Math.round(topHeight * 38 + blocks.length * 8 + stableSeconds * 2)),
    stars: Math.max(state.stars, achievements.list.length),
    effects: state.effects.filter((effect) => now - effect.t < effect.life)
  }
}

function overlapXZ(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) * 0.46 && Math.abs(a.z - b.z) < (a.d + b.d) * 0.46
}

function stableOnSupport(block, support) {
  return Math.abs(block.x - support.x) < support.w * 0.48 && Math.abs(block.z - support.z) < support.d * 0.52
}

function updateAchievements(state, blocks, now, topHeight = null, stableSeconds = null) {
  const set = new Set(state.achievements || [])
  const height = topHeight ?? Math.max(0, ...blocks.map((block) => block.y + block.h / 2))
  const stable = stableSeconds ?? state.stableSeconds
  let newText = ''
  if (blocks.length >= 6 && !set.has('小小建筑师')) { set.add('小小建筑师'); newText = '获得成就：小小建筑师。' }
  if (height >= 2.6 && !set.has('三层星桥')) { set.add('三层星桥'); newText = '获得成就：三层星桥。' }
  if (height >= 4.2 && !set.has('高塔探险')) { set.add('高塔探险'); newText = '获得成就：高塔探险。' }
  if (stable >= 8 && !set.has('稳稳塔')) { set.add('稳稳塔'); newText = '获得成就：稳稳塔。' }
  return { list: [...set], newText }
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const displayWidth = Math.max(640, Math.floor(rect.width * dpr))
  const displayHeight = Math.max(420, Math.floor(rect.height * dpr))
  if (canvas.width !== displayWidth) canvas.width = displayWidth
  if (canvas.height !== displayHeight) canvas.height = displayHeight
  const ctx = canvas.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return ctx
}

function buildCamera(width, height, viewMode = 'plaza') {
  const preset = VIEW_PRESETS[viewMode] || VIEW_PRESETS.plaza
  return {
    ...preset,
    cx: width * 0.50,
    cy: height * preset.horizon,
    width,
    height
  }
}

function project(camera, x, y, z) {
  return {
    x: camera.cx + (x - z) * camera.scale,
    y: camera.cy + (x + z) * camera.depth - y * camera.lift
  }
}

function drawParkBackground(ctx, width, height, state) {
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, state.sunshine.activeUntil > Date.now() ? '#fff5ca' : '#e8f6ff')
  sky.addColorStop(0.48, '#fff8e6')
  sky.addColorStop(1, '#efe3c8')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  drawSunAndRainbow(ctx, width, height, state)
  drawFerrisWheel(ctx, width * 0.78, height * 0.24, Math.min(width, height) * 0.12)
  drawCastleSilhouette(ctx, width, height)
  drawBunting(ctx, width, height)

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.55, height * 0.15, width * 0.5, height * 0.55, height * 0.8)
  vignette.addColorStop(0, 'rgba(255,255,255,0)')
  vignette.addColorStop(1, 'rgba(120,92,54,.15)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
}

function drawSunAndRainbow(ctx, width, height, state) {
  const now = Date.now()
  if (now < state.sunshine.activeUntil) {
    const sun = ctx.createRadialGradient(width * 0.16, height * 0.18, 4, width * 0.16, height * 0.18, width * 0.15)
    sun.addColorStop(0, 'rgba(255,231,120,.85)')
    sun.addColorStop(1, 'rgba(255,231,120,0)')
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, width, height)
  }
  if (now < state.sunshine.rainbowUntil) {
    ctx.save()
    ctx.globalAlpha = 0.38
    const colors = ['#f29a9a', '#f7d46c', '#9bd58e', '#82c7e5', '#b9a4ed']
    colors.forEach((color, index) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.arc(width * 0.52, height * 0.84, width * (0.37 + index * 0.018), Math.PI * 1.08, Math.PI * 1.92)
      ctx.stroke()
    })
    ctx.restore()
  }
}

function drawFerrisWheel(ctx, x, y, r) {
  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.strokeStyle = '#6f8ca6'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
  for (let i = 0; i < 10; i += 1) {
    const a = i / 10 * Math.PI * 2
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke()
  }
  ctx.restore()
}

function drawCastleSilhouette(ctx, width, height) {
  ctx.save()
  ctx.globalAlpha = 0.15
  ctx.fillStyle = '#9c774b'
  const y = height * 0.42
  for (let i = 0; i < 7; i += 1) {
    const x = width * (0.08 + i * 0.08)
    ctx.fillRect(x, y + (i % 2) * 18, 42, 86)
    ctx.beginPath(); ctx.moveTo(x - 8, y + (i % 2) * 18); ctx.lineTo(x + 21, y - 34 + (i % 2) * 18); ctx.lineTo(x + 50, y + (i % 2) * 18); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

function drawBunting(ctx, width, height) {
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.strokeStyle = '#d9a85a'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(width * 0.10, height * 0.10); ctx.quadraticCurveTo(width * 0.5, height * 0.18, width * 0.9, height * 0.10); ctx.stroke()
  const colors = ['#eaa06c', '#f0cf72', '#8bc3d5', '#b7d49a']
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = colors[i % colors.length]
    const x = width * (0.12 + i * 0.045)
    const y = height * (0.105 + Math.sin(i * 0.55) * 0.03)
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 9, y + 24); ctx.lineTo(x + 18, y); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

function drawBuildTable(ctx, width, height, camera) {
  const corners = [
    project(camera, -BOARD.width / 2, 0, -BOARD.depth / 2),
    project(camera, BOARD.width / 2, 0, -BOARD.depth / 2),
    project(camera, BOARD.width / 2, 0, BOARD.depth / 2),
    project(camera, -BOARD.width / 2, 0, BOARD.depth / 2)
  ]
  ctx.save()
  ctx.fillStyle = 'rgba(246, 232, 194, .96)'
  ctx.strokeStyle = 'rgba(117, 88, 48, .45)'
  ctx.lineWidth = 3
  drawPolygon(ctx, corners); ctx.fill(); ctx.stroke()

  ctx.globalAlpha = 0.26
  ctx.strokeStyle = '#bda678'
  for (let x = -3; x <= 3; x += 1) {
    const a = project(camera, x, 0.01, -BOARD.depth / 2)
    const b = project(camera, x, 0.01, BOARD.depth / 2)
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }
  for (let z = -2; z <= 2; z += 1) {
    const a = project(camera, -BOARD.width / 2, 0.01, z)
    const b = project(camera, BOARD.width / 2, 0.01, z)
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }
  ctx.restore()
}

function drawRecycleZones(ctx, width, height, camera, state) {
  drawZone(ctx, camera, BOARD.leftRecycleX, 0.04, 0, '回收篮', '#8cb6d2')
  drawZone(ctx, camera, BOARD.rightRecycleX, 0.04, 0, '换块篮', '#e4b969')
}

function drawZone(ctx, camera, x, y, z, label, color) {
  const p = project(camera, x, y, z)
  ctx.save()
  ctx.fillStyle = 'rgba(255,250,235,.76)'
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  roundedRect(ctx, p.x - 50, p.y - 34, 100, 68, 18)
  ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#263650'
  ctx.font = '900 14px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(label, p.x, p.y - 3)
  ctx.font = '800 11px system-ui'
  ctx.fillText('拿着放入', p.x, p.y + 18)
  ctx.restore()
}

function drawIsoBlock(ctx, camera, block, state) {
  const p = project(camera, block.x, block.y, block.z)
  const sw = block.w * camera.scale
  const sd = block.d * camera.depth
  const sh = block.h * camera.lift
  const x = p.x
  const y = p.y
  const top = [
    { x: x, y: y - sh },
    { x: x + sw * 0.5, y: y - sh + sd * 0.5 },
    { x: x, y: y - sh + sd },
    { x: x - sw * 0.5, y: y - sh + sd * 0.5 }
  ]
  const left = [top[3], top[2], { x: top[2].x, y: top[2].y + sh }, { x: top[3].x, y: top[3].y + sh }]
  const right = [top[1], top[2], { x: top[2].x, y: top[2].y + sh }, { x: top[1].x, y: top[1].y + sh }]

  ctx.save()
  ctx.globalAlpha = block.kinematic && !block.grabbed ? 0.86 : 1
  ctx.fillStyle = 'rgba(51,45,36,.20)'
  ctx.beginPath(); ctx.ellipse(x, y + sd * 0.75, sw * 0.42, sd * 0.55, 0, 0, Math.PI * 2); ctx.fill()
  if (block.id === state.hoverBlockId || block.grabbed) {
    ctx.shadowColor = 'rgba(255,216,100,.9)'
    ctx.shadowBlur = 18
  }
  ctx.fillStyle = shade(block.color, -14); drawPolygon(ctx, left); ctx.fill()
  ctx.fillStyle = shade(block.color, -5); drawPolygon(ctx, right); ctx.fill()
  ctx.fillStyle = block.accent || shade(block.color, 18); drawPolygon(ctx, top); ctx.fill()
  ctx.strokeStyle = 'rgba(58,68,83,.38)'
  ctx.lineWidth = 2
  ;[left, right, top].forEach((poly) => { drawPolygon(ctx, poly); ctx.stroke() })
  drawBlockMotif(ctx, camera, block, p, sw, sd, sh)
  ctx.restore()
}

function drawBlockMotif(ctx, camera, block, p, sw, sd, sh) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,250,235,.70)'
  ctx.strokeStyle = 'rgba(99,82,50,.25)'
  ctx.lineWidth = 1.5
  const cx = p.x
  const cy = p.y - sh * 0.25 + sd * 0.68
  if (block.shape === 'star') drawStar(ctx, cx, cy, Math.max(9, sw * 0.12), 5)
  else if (block.shape === 'crystal') {
    ctx.beginPath(); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx + 14, cy); ctx.lineTo(cx, cy + 18); ctx.lineTo(cx - 14, cy); ctx.closePath(); ctx.fill(); ctx.stroke()
  } else if (block.shape === 'arch') {
    ctx.beginPath(); ctx.arc(cx, cy + 8, 18, Math.PI, 0); ctx.lineTo(cx + 20, cy + 22); ctx.lineTo(cx - 20, cy + 22); ctx.closePath(); ctx.fill(); ctx.stroke()
  } else {
    roundedRect(ctx, cx - 18, cy - 10, 36, 20, 8); ctx.fill(); ctx.stroke()
  }
  ctx.restore()
}

function drawPhysicsEffects(ctx, camera, state) {
  const now = Date.now()
  for (const effect of state.effects) {
    const age = now - effect.t
    const t = clamp(age / effect.life, 0, 1)
    const p = project(camera, effect.x || 0, effect.y || 0, effect.z || 0)
    ctx.save()
    ctx.globalAlpha = 1 - t
    if (effect.type === 'wind') {
      ctx.strokeStyle = 'rgba(125,188,215,.80)'
      ctx.lineWidth = 5
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath(); ctx.moveTo(p.x + i * 26 - 70, p.y + i * 16 - 34); ctx.quadraticCurveTo(p.x + i * 26, p.y - 18, p.x + i * 26 + 80, p.y + 4); ctx.stroke()
      }
    } else if (effect.type === 'place') {
      ctx.fillStyle = 'rgba(255,214,102,.9)'
      for (let i = 0; i < 8; i += 1) {
        const a = i / 8 * Math.PI * 2
        ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 42 * t, p.y + Math.sin(a) * 24 * t, 4, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.restore()
  }
}

function drawCartoonHandCursor(ctx, camera, state) {
  if (!state.cursor?.visible) return
  const p = project(camera, state.cursor.x, state.cursor.y, state.cursor.z)
  const holding = Boolean(state.holdingId)
  const closed = state.gesture?.palmState === 'closed' || holding
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.scale(holding ? 0.74 : 0.68, holding ? 0.74 : 0.68)
  ctx.shadowColor = 'rgba(31,45,71,.28)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6
  const tone = holding ? '#f7d98d' : '#fff8ed'
  const cuff = holding ? '#e89770' : '#76bfdd'
  drawGameGlove(ctx, closed, tone, cuff)
  ctx.restore()
}

function drawGameGlove(ctx, closed, glove, cuff) {
  ctx.save()
  ctx.fillStyle = cuff
  ctx.strokeStyle = '#31506e'
  ctx.lineWidth = 3
  roundedRect(ctx, -17, 20, 34, 18, 9); ctx.fill(); ctx.stroke()
  ctx.fillStyle = glove
  roundedRect(ctx, -18, -8, 36, 34, 14); ctx.fill(); ctx.stroke()
  const xs = closed ? [-12, -4, 4, 12] : [-16, -6, 6, 16]
  const hs = closed ? [22, 27, 26, 21] : [36, 42, 39, 32]
  xs.forEach((x, i) => {
    ctx.save(); ctx.translate(x, -6); ctx.rotate(closed ? (i - 1.5) * 0.04 : (i - 1.5) * 0.12)
    roundedRect(ctx, -6, -hs[i], 12, hs[i], 8); ctx.fill(); ctx.stroke(); ctx.restore()
  })
  ctx.save(); ctx.translate(-18, 4); ctx.rotate(closed ? -0.85 : -1.18)
  roundedRect(ctx, -6, -8, 13, 30, 9); ctx.fill(); ctx.stroke(); ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,.45)'
  ctx.beginPath(); ctx.ellipse(-7, 2, 10, 15, -0.55, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawFreeBuildHud(ctx, width, height, state) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,250,235,.82)'
  ctx.strokeStyle = 'rgba(188,142,70,.24)'
  ctx.lineWidth = 2
  roundedRect(ctx, 28, 28, Math.min(520, width * 0.46), 96, 28); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#263650'
  ctx.font = '900 30px system-ui'
  ctx.fillText('自由积木乐园', 54, 72)
  ctx.font = '800 15px system-ui'
  ctx.fillStyle = '#657473'
  ctx.fillText(state.feedback || '张开移动，闭合抓取，张开放下。', 56, 103)
  const stats = getMagicBlockSummary(state)
  drawMiniStat(ctx, width - 300, 34, '积木', String(stats.blocks))
  drawMiniStat(ctx, width - 205, 34, '高度', `${stats.maxHeight.toFixed(1)}m`)
  drawMiniStat(ctx, width - 110, 34, '星章', String(stats.stars))
  ctx.restore()
}

function drawMiniStat(ctx, x, y, label, value) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,.72)'
  roundedRect(ctx, x, y, 82, 66, 18); ctx.fill()
  ctx.fillStyle = '#657473'; ctx.font = '800 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, x + 41, y + 22)
  ctx.fillStyle = '#263650'; ctx.font = '900 24px system-ui'; ctx.fillText(value, x + 41, y + 50)
  ctx.restore()
}

function drawAchievementToasts(ctx, width, height, state) {
  ctx.save()
  const items = (state.achievements || []).slice(-3)
  items.forEach((item, index) => {
    const y = height - 110 - index * 54
    ctx.fillStyle = 'rgba(255,250,235,.82)'
    ctx.strokeStyle = 'rgba(222,177,92,.36)'
    roundedRect(ctx, width - 330, y, 286, 42, 18); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#263650'; ctx.font = '900 15px system-ui'; ctx.fillText(`★ ${item}`, width - 306, y + 27)
  })
  ctx.restore()
}

function drawPolygon(ctx, points) {
  ctx.beginPath()
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y))
  ctx.closePath()
}

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function drawStar(ctx, x, y, radius, points = 5) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 ? radius * 0.46 : radius
    const a = -Math.PI / 2 + i * Math.PI / points
    const px = x + Math.cos(a) * r
    const py = y + Math.sin(a) * r
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
  }
  ctx.closePath()
  ctx.fill(); ctx.stroke()
}

function averagePoint(points) {
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    z: points.reduce((sum, p) => sum + (p.z || 0), 0) / points.length
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function shade(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = clamp(((n >> 16) & 255) + amount, 0, 255)
  const g = clamp(((n >> 8) & 255) + amount, 0, 255)
  const b = clamp((n & 255) + amount, 0, 255)
  return `rgb(${r}, ${g}, ${b})`
}

function brighten(hex) {
  return shade(hex, 28)
}

function addEffect(effects, effect) {
  return [...effects, effect].slice(-24)
}

