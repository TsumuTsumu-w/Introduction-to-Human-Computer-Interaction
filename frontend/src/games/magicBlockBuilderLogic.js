import { CONTROL_PRESETS, MAGIC_BLOCK_MODE_NAME, VOXEL_MATERIALS } from './voxelFreeBuild/voxelConstants.js'
import { analyzeVoxelGesture, createEmptyVoxelGesture } from './voxelFreeBuild/voxelGesture.js'
import { clearWorld, createVoxelWorld, cycleMaterial, resetCamera, setControlPreset, updateVoxelWorld } from './voxelFreeBuild/voxelWorld.js'

export { MAGIC_BLOCK_MODE_NAME }
export const MAGIC_BLOCK_SEEK_MS = 5000

export const MAGIC_BLOCK_DIFFICULTIES = [
  { id: 'calm', name: CONTROL_PRESETS.calm.name, lives: 999, towerGoal: 20, label: '柔和控制：移动、旋转、俯仰和升降都更慢，更适合首次体验。' },
  { id: 'responsive', name: CONTROL_PRESETS.responsive.name, lives: 999, towerGoal: 20, label: '灵敏控制：动作更跟手，但仍然限制最大速度，避免突然飞走。' }
]

export function getMagicBlockDifficulty(id = 'responsive') {
  return MAGIC_BLOCK_DIFFICULTIES.find((item) => item.id === id) || MAGIC_BLOCK_DIFFICULTIES[1]
}

export function createMagicBlockState(difficulty = getMagicBlockDifficulty()) {
  const world = setControlPreset(createVoxelWorld(), difficulty.id)
  return {
    phase: 'idle',
    mode: 'three-real-voxel-scored-locked-gestures',
    handWindowEndsAt: 0,
    lastUpdatedAt: Date.now(),
    lastHandSeenAt: 0,
    gesture: createEmptyVoxelGesture(),
    previousGesture: null,
    world,
    immersive: false,
    cameraReady: false,
    expression: { smile: false, confidence: 0 },
    feedback: '申请摄像头后进入真实三维体素世界：强排斥评分式识别 + 用户视角方向修正会先区分张开手、握拳、捏合和几根手指，再锁定操作模式。'
  }
}

export function resetMagicBlockState(difficulty = getMagicBlockDifficulty(), cameraReady = false) {
  return { ...createMagicBlockState(difficulty), phase: cameraReady ? 'ready' : 'idle', cameraReady, feedback: cameraReady ? '摄像头已准备。点击开始创造。' : '先申请摄像头。' }
}

export function startMagicBlockState(state, arg1 = Date.now(), arg2 = null) {
  const now = typeof arg1 === 'number' ? arg1 : (typeof arg2 === 'number' ? arg2 : Date.now())
  return { ...state, phase: 'seeking', handWindowEndsAt: now + MAGIC_BLOCK_SEEK_MS, feedback: '把手放到摄像头中央，识别后进入真实体素建造。' }
}

export function updateMagicBlockFrame(state, frame, difficulty = getMagicBlockDifficulty(), now = Date.now()) {
  let next = { ...state, world: setControlPreset(state.world || createVoxelWorld(), difficulty.id), lastUpdatedAt: now }
  if (next.phase === 'idle' || next.phase === 'ready') return next

  const gesture = analyzeVoxelGesture(frame, state.previousGesture, now)
  next.gesture = gesture

  if (gesture.hasHand) {
    next.lastHandSeenAt = now
    if (next.phase === 'seeking') {
      next.phase = 'playing'
      next.feedback = '已识别到手：现在使用强排斥评分锁定识别 + 用户视角方向修正，一指移动、两指旋转、三指俯仰、四指升降，握拳放置，捏合删除。'
    }
  } else if (next.phase === 'seeking') {
    if (now >= next.handWindowEndsAt) return { ...next, previousGesture: gesture, phase: 'ready', feedback: '没有识别到手。可以重新开始。' }
    return { ...next, previousGesture: gesture, feedback: getMagicBlockSeekText(next, now) }
  }

  if (next.phase === 'playing') {
    const world = updateVoxelWorld(next.world, gesture, now)
    next.world = world
    next.feedback = world.feedback || gesture.label
  }

  next.previousGesture = gesture
  return next
}

export function drawMagicBlockStage() {
  // Three.js 版本由 voxelThreeScene 渲染；保留这个导出，避免旧页面命名导入导致白屏。
}

export function getMagicBlockPrompt(state) {
  if (state.phase === 'idle') return { title: '自由建造', hint: '申请摄像头后进入真实三维体素世界。' }
  if (state.phase === 'seeking') return { title: '寻找手部', hint: '把手放在摄像头中央。' }
  return { title: '真实体素建造', hint: '强排斥评分锁定识别 + 用户视角方向修正：一指移动，两指横向旋转，三指调俯仰，四指升降；准星命中目标后握拳放置、捏合删除。' }
}

export function getMagicBlockSeekText(state, now = Date.now(), quality = null) {
  const remain = Math.max(0, Math.ceil(((state?.handWindowEndsAt || 0) - now) / 1000))
  if (quality?.reason) return `${quality.reason}。剩余 ${remain} 秒。`
  if (state?.phase === 'seeking') return `等待识别手部。剩余 ${remain} 秒。`
  if (state?.gesture?.hasHand) return '手部已识别。'
  return '未识别到手。'
}

export function getMagicBlockSummary(state) {
  const world = state.world || createVoxelWorld()
  const mat = VOXEL_MATERIALS[world.selectedMaterialIndex] || VOXEL_MATERIALS[0]
  return {
    blocks: world.stats?.blockCount || 0,
    maxHeight: world.stats?.maxHeight || 0,
    stars: Math.min(3, Math.floor((world.stats?.maxHeight || 0) / 6)),
    viewMode: `俯视 ${Math.round(world.camera.pitch)}°`,
    currentPiece: mat.name,
    currentColor: mat.name,
    cameraHeight: world.camera.height,
    cameraPitch: world.camera.pitch,
    cameraYaw: world.camera.yaw,
    activeMode: world.activeMode || 'open',
    targetFace: world.target?.attachFaceText || '无目标',
    holding: false,
    expression: state.expression
  }
}

export function setMagicBlockViewMode(state, viewMode) {
  if (viewMode === 'reset') return { ...state, world: resetCamera(state.world) }
  if (viewMode === 'top') return { ...state, world: { ...state.world, camera: { ...state.world.camera, pitch: 89, height: Math.max(state.world.camera.height, 12), y: Math.max(state.world.camera.height, 12) }, feedback: '已切换到接近垂直俯视。' } }
  if (viewMode === 'near') return { ...state, world: { ...state.world, camera: { ...state.world.camera, pitch: 38, height: 4.5, y: 4.5 }, feedback: '已切换到近处建造视角。' } }
  return { ...state, world: resetCamera(state.world) }
}

export function cycleMagicBlockShape(state) { return { ...state, world: cycleMaterial(state.world, 1) } }
export function changeMagicBlockPiece(state) { return cycleMagicBlockShape(state) }
export function cycleMagicBlockColor(state) { return { ...state, world: cycleMaterial(state.world, 1) } }
export function clearMagicBlockStage(state) { return { ...state, world: clearWorld(state.world) } }
export function applyMagicBlockVoice(state, text) {
  const raw = String(text || '').replace(/\s/g, '')
  if (/清空|重来|reset/i.test(raw)) return clearMagicBlockStage(state)
  if (/颜色|换色|方块|下一|shape|color/i.test(raw)) return cycleMagicBlockColor(state)
  if (/视角|重置|camera/i.test(raw)) return { ...state, world: resetCamera(state.world) }
  return state
}
export function applyMagicBlockExpression(state, expression) {
  if (!expression?.smile) return state
  return { ...state, expression: { smile: true, confidence: expression.confidence || 1 }, feedback: '检测到微笑，继续自由建造。' }
}
export function toggleMagicBlockImmersive(state) {
  return { ...state, immersive: !state.immersive, feedback: state.immersive ? '已退出沉浸模式。' : '已进入沉浸模式，只保留隐私副屏和退出按钮。' }
}

