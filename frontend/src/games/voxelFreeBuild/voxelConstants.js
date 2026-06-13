export const MAGIC_BLOCK_MODE_NAME = '三维体素自由建造园'

export const CAMERA_LIMITS = {
  minPitch: 0,
  maxPitch: 89,
  minHeight: 2,
  maxHeight: 20,
  maxDistance: 140
}

export const CONTROL_PRESETS = {
  calm: {
    id: 'calm',
    name: '柔和控制',
    // 一指移动减速：只降低水平移动，不影响两指旋转、三指俯仰、四指升降。
    moveSpeed: 0.92,
    yawDegPerSec: 28,
    pitchDegPerSec: 26,
    heightSpeed: 3.40,
    indexDirectionMin: 0.052,
    moveDeadZone: 0.14,
    yawDeadZone: 0.095,
    pitchDeadZone: 0.080,
    heightDeadZone: 0.065,
    maxDt: 0.045
  },
  responsive: {
    id: 'responsive',
    name: '灵敏控制',
    // 一指移动减速：上一版太快，这里约降到原来的 45%。
    moveSpeed: 1.28,
    yawDegPerSec: 40,
    pitchDegPerSec: 36,
    heightSpeed: 5.40,
    indexDirectionMin: 0.044,
    moveDeadZone: 0.12,
    yawDeadZone: 0.080,
    pitchDeadZone: 0.065,
    heightDeadZone: 0.052,
    maxDt: 0.045
  }
}

export const VOXEL_MATERIALS = [
  { id: 'cream', name: '奶油方块', color: '#efd28a', side: '#caa461', roughness: 0.86 },
  { id: 'berry', name: '莓果方块', color: '#e7a398', side: '#bd756d', roughness: 0.86 },
  { id: 'grass', name: '草地方块', color: '#98bf73', side: '#709a57', roughness: 0.92 },
  { id: 'sky', name: '天空方块', color: '#8dbdd4', side: '#6596ad', roughness: 0.78 },
  { id: 'moon', name: '月光方块', color: '#e7dfd1', side: '#b7ad9c', roughness: 0.80 },
  { id: 'violet', name: '紫晶方块', color: '#b9a7ee', side: '#8c78c9', roughness: 0.72 }
]

export const VOXEL_GESTURE = {
  // 评分式识别 + 强排斥规则，不再靠一帧硬判断。
  // 用户视角修正：前置摄像头的左右按用户自己的左右理解，不按原始视频坐标。
  mirrorUserX: true,
  confidenceMin: 0.46,
  actionConfidenceMin: 0.58,
  modeEnterMs: 140,
  actionEnterMs: 170,
  strongSwitchMs: 240,
  modeHoldGraceMs: 230,
  switchScoreGap: 0.16,
  strongSwitchScore: 0.74,
  placeHoldMs: 230,
  deleteHoldMs: 185,
  actionCooldownMs: 620,
  lostGraceMs: 700,

  // 食指移动：放宽触发，先看食指方向，方向不明显再用掌根偏离中心兜底。
  indexDirectionMin: 0.042,
  rootDirectionMin: 0.095,

  // 指尖/掌心距离比例阈值，后续都按手掌尺度归一，减少远近变化影响。
  palmMinSize: 0.070,
  fingerExtendedLow: 0.22,
  fingerExtendedHigh: 0.72,
  longOpenSoft: 0.46,
  longOpenHard: 0.61,
  longClosedSoft: 0.38,
  longClosedHard: 0.30,
  longOpenVeto: 0.55,
  indexOpenVeto: 0.54,
  longClosedForFist: 0.40,
  thumbOpenScore: 0.52,
  thumbClosedScore: 0.36,
  openImmediateScore: 0.72,
  fistTriggerScore: 0.66,
  fistMaxWhenIndexOpen: 0.16,
  fistMaxWhenAnyLongOpen: 0.24,
  pinchTriggerScore: 0.60,
  pinchCloseRatio: 0.22,
  pinchLooseRatio: 0.70,

  // 控制反馈用。
  debugScoreDigits: 2
}

export const INITIAL_BLOCKS = [
  { x: -2, y: 1, z: 5, materialIndex: 1 },
  { x: -1, y: 1, z: 5, materialIndex: 1 },
  { x: 0, y: 1, z: 5, materialIndex: 2 },
  { x: 0, y: 2, z: 5, materialIndex: 2 },
  { x: 2, y: 1, z: 4, materialIndex: 3 },
  { x: 3, y: 1, z: 4, materialIndex: 0 }
]

export function clamp(value, min, max) {
  const num = Number(value)
  if (!Number.isFinite(num)) return min
  return Math.max(min, Math.min(max, num))
}

export function normalizeAngle(angle) {
  let next = Number(angle || 0) % 360
  if (next < 0) next += 360
  return next
}

export function degToRad(deg) {
  return deg * Math.PI / 180
}

export function smoothAxis(value, deadZone = 0.13) {
  const raw = Number(value) || 0
  const abs = Math.abs(raw)
  if (abs <= deadZone) return 0
  const scaled = (abs - deadZone) / Math.max(0.0001, 0.50 - deadZone)
  return Math.sign(raw) * clamp(scaled, 0, 1)
}

