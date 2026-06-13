import { VOXEL_GESTURE, clamp } from './voxelConstants.js'

const IDS = {
  wrist: 0,
  thumbTip: 4,
  indexBase: 5,
  indexPip: 6,
  indexTip: 8,
  middleBase: 9,
  middlePip: 10,
  middleTip: 12,
  ringBase: 13,
  ringPip: 14,
  ringTip: 16,
  pinkyBase: 17,
  pinkyPip: 18,
  pinkyTip: 20
}

const MODE_LABELS = {
  open: '张开手：停止/准备',
  indexMove: '一指移动：食指方向控制前后左右',
  twoFingerYaw: '两指旋转：只控制横向 360°',
  threeFingerPitch: '三指俯仰：只控制 0° 到 89°',
  fourFingerHeight: '四指升降：只控制高度',
  fistPlace: '握拳：放置准星方块',
  pinchDelete: '捏合：删除准星方块',
  unknown: '手势未锁定：张开手重置'
}

// 强排斥核心：食指明显伸出，就不允许判握拳。
const CONTROL_MODES = ['indexMove', 'twoFingerYaw', 'threeFingerPitch', 'fourFingerHeight']
const ACTION_MODES = ['fistPlace', 'pinchDelete']
const LONG_FINGERS = ['index', 'middle', 'ring', 'pinky']

export function createEmptyVoxelGesture() {
  return {
    hasHand: false,
    mode: 'none',
    rawMode: 'none',
    candidateMode: 'none',
    label: '未识别到手',
    confidence: 0,
    root: { x: 0.5, y: 0.5, z: 0 },
    rootOffset: { x: 0, y: 0 },
    controlAnchor: { x: 0.5, y: 0.5, z: 0 },
    controlOffset: { x: 0, y: 0 },
    rootVelocity: { x: 0, y: 0, speed: 0 },
    dtSec: 1 / 60,
    landmarks: [],
    pinchDistance: 999,
    pinchRatio: 999,
    palmSize: VOXEL_GESTURE.palmMinSize,
    fingerSpread: 0,
    extended: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    fingerStates: { thumb: 'closed', index: 'closed', middle: 'closed', ring: 'closed', pinky: 'closed' },
    fingerScores: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
    scores: {},
    conflict: 'none',
    openCount: 0,
    moveVector: { x: 0, z: 0, label: '停止' },
    modeStartedAt: 0,
    rawStartedAt: 0,
    candidateStartedAt: 0,
    stableSince: 0,
    debug: '未识别到手'
  }
}

export function analyzeVoxelGesture(frame, previousGesture = null, now = Date.now()) {
  if (!frame?.hasHand || !Array.isArray(frame.landmarks) || frame.landmarks.length < 21) {
    return createEmptyVoxelGesture()
  }

  const landmarks = frame.landmarks
  const rawRoot = stablePalmRoot(landmarks)
  const root = toUserRoot(rawRoot)
  const previousRoot = previousGesture?.hasHand ? previousGesture.root : root
  const dtSec = clampDt((now - (previousGesture?.seenAt || now)) / 1000)
  const rootVelocity = {
    x: (root.x - previousRoot.x) / Math.max(0.001, dtSec),
    y: (root.y - previousRoot.y) / Math.max(0.001, dtSec),
    speed: Math.hypot(root.x - previousRoot.x, root.y - previousRoot.y) / Math.max(0.001, dtSec)
  }
  const rootOffset = { x: root.x - 0.5, y: root.y - 0.5 }
  const metrics = buildHandMetrics(landmarks, frame)
  const scores = buildModeScores(metrics, rootOffset)
  const picked = chooseCandidate(scores, metrics)

  const sameCandidate = previousGesture?.hasHand && previousGesture.candidateMode === picked.mode
  const candidateStartedAt = sameCandidate ? (previousGesture.candidateStartedAt || now) : now
  const rawMode = picked.mode
  const rawStartedAt = previousGesture?.hasHand && previousGesture.rawMode === rawMode ? (previousGesture.rawStartedAt || now) : now

  const mode = resolveLockedMode({
    candidate: picked.mode,
    confidence: picked.confidence,
    scores,
    previousGesture,
    candidateStartedAt,
    now
  })

  const sameMode = previousGesture?.hasHand && previousGesture.mode === mode
  const modeStartedAt = sameMode ? (previousGesture.modeStartedAt || now) : now
  const stableSince = sameMode ? (previousGesture.stableSince || modeStartedAt) : modeStartedAt
  const keepAnchor = sameMode && CONTROL_MODES.includes(mode)
  const controlAnchor = keepAnchor ? (previousGesture.controlAnchor || root) : root
  const controlOffset = { x: root.x - controlAnchor.x, y: root.y - controlAnchor.y }
  const moveVector = mode === 'indexMove' ? getIndexMoveVector(landmarks, rootOffset, metrics) : { x: 0, z: 0, label: '停止' }

  return {
    hasHand: true,
    mode,
    rawMode,
    candidateMode: picked.mode,
    label: labelForMode(mode, picked.confidence),
    confidence: picked.confidence,
    root,
    rootOffset,
    controlAnchor,
    controlOffset,
    rootVelocity,
    dtSec,
    seenAt: now,
    landmarks,
    pinchDistance: metrics.pinchDistance,
    pinchRatio: metrics.pinchRatio,
    palmSize: metrics.palmSize,
    fingerSpread: metrics.fingerSpread,
    extended: metrics.extended,
    fingerStates: metrics.fingerStates,
    fingerScores: metrics.fingerScores,
    scores,
    conflict: picked.conflict || metrics.conflict || 'none',
    openCount: metrics.openCount,
    moveVector,
    modeStartedAt,
    rawStartedAt,
    candidateStartedAt,
    stableSince,
    debug: buildDebugText(mode, picked.mode, picked.confidence, metrics, scores, picked.conflict)
  }
}

function resolveLockedMode({ candidate, confidence, scores, previousGesture, candidateStartedAt, now }) {
  if (candidate === 'open' && confidence >= VOXEL_GESTURE.openImmediateScore) return 'open'

  if (candidate === 'unknown' || confidence < VOXEL_GESTURE.confidenceMin) {
    return keepPreviousBriefly(previousGesture, now) || 'unknown'
  }

  const isAction = ACTION_MODES.includes(candidate)
  const minConfidence = isAction ? VOXEL_GESTURE.actionConfidenceMin : VOXEL_GESTURE.confidenceMin
  if (confidence < minConfidence) return keepPreviousBriefly(previousGesture, now) || 'unknown'

  const requiredMs = isAction ? VOXEL_GESTURE.actionEnterMs : VOXEL_GESTURE.modeEnterMs
  const stableMs = now - candidateStartedAt
  const previousMode = previousGesture?.mode

  if (stableMs < requiredMs) {
    return keepPreviousBriefly(previousGesture, now) || 'unknown'
  }

  if (
    previousGesture?.hasHand &&
    previousMode &&
    previousMode !== 'none' &&
    previousMode !== 'open' &&
    previousMode !== 'unknown' &&
    previousMode !== candidate
  ) {
    const previousScore = Number(scores[previousMode] || 0)
    const strongEnough = confidence >= Math.max(previousScore + VOXEL_GESTURE.switchScoreGap, VOXEL_GESTURE.strongSwitchScore)
    const stableEnough = stableMs >= VOXEL_GESTURE.strongSwitchMs
    if (!strongEnough && !stableEnough) return previousMode
  }

  return candidate
}

function keepPreviousBriefly(previousGesture, now) {
  if (!previousGesture?.hasHand) return null
  const mode = previousGesture.mode
  if (!mode || mode === 'none' || mode === 'open' || mode === 'unknown') return null
  if (ACTION_MODES.includes(mode)) return null
  if (now - (previousGesture.seenAt || now) <= VOXEL_GESTURE.modeHoldGraceMs) return mode
  return null
}

function buildHandMetrics(landmarks, frame) {
  const wrist = landmarks[IDS.wrist]
  const indexBase = landmarks[IDS.indexBase]
  const middleBase = landmarks[IDS.middleBase]
  const ringBase = landmarks[IDS.ringBase]
  const pinkyBase = landmarks[IDS.pinkyBase]
  const thumbTip = landmarks[IDS.thumbTip]
  const indexTip = landmarks[IDS.indexTip]
  const middleTip = landmarks[IDS.middleTip]
  const ringTip = landmarks[IDS.ringTip]
  const pinkyTip = landmarks[IDS.pinkyTip]

  const palmSize = Math.max(
    VOXEL_GESTURE.palmMinSize,
    distance(indexBase, pinkyBase),
    distance(wrist, middleBase),
    distance(wrist, indexBase),
    distance(wrist, pinkyBase)
  )
  const palmCenter = {
    x: wrist.x * 0.42 + indexBase.x * 0.20 + middleBase.x * 0.18 + ringBase.x * 0.10 + pinkyBase.x * 0.10,
    y: wrist.y * 0.42 + indexBase.y * 0.20 + middleBase.y * 0.18 + ringBase.y * 0.10 + pinkyBase.y * 0.10,
    z: (wrist.z || 0) * 0.42 + (indexBase.z || 0) * 0.20 + (middleBase.z || 0) * 0.18 + (ringBase.z || 0) * 0.10 + (pinkyBase.z || 0) * 0.10
  }

  const fingerScores = {
    thumb: thumbOpenScore(landmarks, palmSize),
    index: longFingerScore(landmarks, IDS.indexBase, IDS.indexPip, IDS.indexTip, palmSize),
    middle: longFingerScore(landmarks, IDS.middleBase, IDS.middlePip, IDS.middleTip, palmSize),
    ring: longFingerScore(landmarks, IDS.ringBase, IDS.ringPip, IDS.ringTip, palmSize),
    pinky: longFingerScore(landmarks, IDS.pinkyBase, IDS.pinkyPip, IDS.pinkyTip, palmSize)
  }

  const fingerStates = {
    thumb: fingerScores.thumb >= VOXEL_GESTURE.thumbOpenScore ? 'open' : (fingerScores.thumb <= VOXEL_GESTURE.thumbClosedScore ? 'closed' : 'uncertain'),
    index: classifyLongFinger(fingerScores.index),
    middle: classifyLongFinger(fingerScores.middle),
    ring: classifyLongFinger(fingerScores.ring),
    pinky: classifyLongFinger(fingerScores.pinky)
  }
  const longScores = LONG_FINGERS.map((name) => fingerScores[name])
  const longStates = LONG_FINGERS.map((name) => fingerStates[name])
  const openCount = longStates.filter((state) => state === 'open').length
  const closedCount = longStates.filter((state) => state === 'closed').length
  const maxLong = Math.max(...longScores)
  const minLong = Math.min(...longScores)
  const longAvg = average(longScores)

  const extended = {
    thumb: fingerStates.thumb === 'open',
    index: fingerStates.index === 'open',
    middle: fingerStates.middle === 'open',
    ring: fingerStates.ring === 'open',
    pinky: fingerStates.pinky === 'open'
  }

  const tipDistances = [indexTip, middleTip, ringTip, pinkyTip].map((tip) => distance(tip, palmCenter) / palmSize)
  const avgTipPalm = average(tipDistances)
  const minTipPalm = Math.min(...tipDistances)
  const maxTipPalm = Math.max(...tipDistances)
  const fingerSpread = [indexTip, middleTip, ringTip, pinkyTip].reduce((sum, p) => sum + distance(p, wrist), 0) / 4
  const compactScore = 1 - smoothstep(0.76, 1.34, avgTipPalm)

  const anyLongClearlyOpen = maxLong >= VOXEL_GESTURE.longOpenVeto
  const indexClearlyOpen = fingerScores.index >= VOXEL_GESTURE.indexOpenVeto
  const allLongClearlyClosed = maxLong <= VOXEL_GESTURE.longClosedForFist && closedCount >= 3
  const closedTightScore = clamp((closedCount / 4) * 0.55 + compactScore * 0.32 + (1 - maxLong) * 0.13, 0, 1)
  let fistScore = allLongClearlyClosed ? closedTightScore : closedTightScore * 0.38

  // 强排斥规则：只要食指或任何长手指明显伸出，就不允许判握拳。
  if (indexClearlyOpen) fistScore = Math.min(fistScore, VOXEL_GESTURE.fistMaxWhenIndexOpen)
  else if (anyLongClearlyOpen) fistScore = Math.min(fistScore, VOXEL_GESTURE.fistMaxWhenAnyLongOpen)

  const gestureName = String(frame?.gestureName || '').toLowerCase()
  const hinted = {
    open: gestureName.includes('open') || gestureName.includes('palm'),
    fist: gestureName.includes('closed') || gestureName.includes('fist'),
    point: gestureName.includes('point'),
    victory: gestureName.includes('victory')
  }
  // MediaPipe 的 Closed_Fist 提示只能在没有长手指明显伸出时加分，不能覆盖反证。
  if (hinted.fist && !anyLongClearlyOpen && maxLong <= 0.48) {
    fistScore = Math.max(fistScore, 0.74)
  }

  const pinchDistance = distance(thumbTip, indexTip)
  const pinchRatio = pinchDistance / palmSize
  const pinchCloseScore = 1 - smoothstep(VOXEL_GESTURE.pinchCloseRatio, VOXEL_GESTURE.pinchLooseRatio, pinchRatio)
  const indexVisibleScore = clamp(fingerScores.index * 0.58 + smoothstep(0.56, 1.18, distance(indexTip, palmCenter) / palmSize) * 0.42, 0, 1)
  const notFistScore = 1 - smoothstep(0.46, 0.70, fistScore)
  let pinchScore = clamp(pinchCloseScore * 0.72 + indexVisibleScore * 0.18 + notFistScore * 0.10, 0, 1) * notFistScore
  if (fistScore >= 0.56 || (closedCount >= 3 && compactScore >= 0.56)) pinchScore = Math.min(pinchScore, 0.34)
  if (pinchCloseScore < 0.34) pinchScore = Math.min(pinchScore, 0.40)

  const conflict = describeConflict({ fingerScores, fingerStates, fistScore, pinchScore, openCount, closedCount, anyLongClearlyOpen, indexClearlyOpen })

  return {
    palmSize,
    palmCenter,
    fingerScores,
    fingerStates,
    longScores,
    longStates,
    extended,
    openCount,
    closedCount,
    maxLong,
    minLong,
    longAvg,
    fingerSpread,
    avgTipPalm,
    minTipPalm,
    maxTipPalm,
    compactScore,
    fistScore,
    pinchScore,
    pinchDistance,
    pinchRatio,
    hinted,
    conflict
  }
}

function buildModeScores(metrics, rootOffset) {
  const f = metrics.fingerScores
  const states = metrics.fingerStates
  const thumbOpen = states.thumb === 'open'
  const thumbClosed = states.thumb === 'closed'
  const verticalIntent = clamp((Math.abs(rootOffset.y) - 0.08) / 0.26, 0, 1)
  const horizontalIntent = clamp((Math.abs(rootOffset.x) - 0.08) / 0.26, 0, 1)

  const indexOnly = fingerPatternScore(metrics, ['index'], ['middle', 'ring', 'pinky'])
  const twoLong = fingerPatternScore(metrics, ['index', 'middle'], ['ring', 'pinky'])
  const threeLong = fingerPatternScore(metrics, ['index', 'middle', 'ring'], ['pinky'])
  const fourLong = fingerPatternScore(metrics, ['index', 'middle', 'ring', 'pinky'], [])

  const openScoreRaw = fingerPatternScore(metrics, ['index', 'middle', 'ring', 'pinky'], []) * (thumbOpen ? 1 : 0.52) * smoothstep(0.92, 1.58, metrics.avgTipPalm)
  const openScore = clamp(openScoreRaw * (1 - metrics.fistScore * 0.88), 0, 1)

  const indexMove = clamp(indexOnly * 0.88 + (metrics.hinted.point ? 0.08 : 0) + horizontalIntent * 0.03 + verticalIntent * 0.03, 0, 1) * (1 - metrics.pinchScore * 0.80)
  const twoFingerYaw = clamp(twoLong * 0.90 + (metrics.hinted.victory ? 0.07 : 0) + horizontalIntent * 0.04, 0, 1) * (1 - metrics.pinchScore * 0.50)
  const threeFingerPitch = clamp(threeLong * 0.94 + verticalIntent * 0.05, 0, 1) * (1 - metrics.pinchScore * 0.40)
  // 四指升降必须和张开手分开：拇指明显展开时更像张开手；只有拇指不明显展开并且有上下意图时更像四指升降。
  const fourFingerHeight = clamp(fourLong * (thumbClosed ? 0.96 : 0.58) + verticalIntent * 0.12, 0, 1) * (1 - openScore * 0.45)

  return {
    open: metrics.hinted.open ? Math.max(openScore, 0.76) : openScore,
    indexMove: indexMove * (1 - metrics.fistScore * 0.92),
    twoFingerYaw: twoFingerYaw * (1 - metrics.fistScore * 0.86),
    threeFingerPitch: threeFingerPitch * (1 - metrics.fistScore * 0.82),
    fourFingerHeight: fourFingerHeight * (1 - metrics.fistScore * 0.76),
    fistPlace: metrics.fistScore,
    pinchDelete: metrics.pinchScore
  }
}

function chooseCandidate(scores, metrics) {
  const f = metrics.fingerScores
  const strongIndexMoveEvidence = f.index >= VOXEL_GESTURE.indexOpenVeto && f.middle <= 0.45 && f.ring <= 0.45 && f.pinky <= 0.45
  const anyLongOpen = metrics.maxLong >= VOXEL_GESTURE.longOpenVeto
  const fourAndThumbOpen = metrics.openCount >= 4 && metrics.fingerStates.thumb === 'open'

  // 张开手是强重置，优先让用户能停下来。
  if (scores.open >= VOXEL_GESTURE.openImmediateScore && fourAndThumbOpen) {
    return { mode: 'open', confidence: scores.open, conflict: 'open-reset' }
  }

  // 一指证据很强时，禁止握拳抢模式。截图里“食指 1.00，其他很低”必须走这里。
  if (strongIndexMoveEvidence && scores.indexMove >= 0.52) {
    return { mode: 'indexMove', confidence: Math.max(scores.indexMove, 0.68), conflict: 'index-veto-fist' }
  }

  // 捏合要优先于动作，但必须不是紧凑拳头。
  if (scores.pinchDelete >= VOXEL_GESTURE.pinchTriggerScore && metrics.fistScore <= 0.50) {
    return { mode: 'pinchDelete', confidence: scores.pinchDelete, conflict: 'pinch-not-fist' }
  }

  // 握拳必须没有任何明显伸出的长手指。
  if (!anyLongOpen && scores.fistPlace >= VOXEL_GESTURE.fistTriggerScore) {
    return { mode: 'fistPlace', confidence: scores.fistPlace, conflict: 'closed-long-fingers' }
  }

  const controls = [
    ['fourFingerHeight', scores.fourFingerHeight],
    ['threeFingerPitch', scores.threeFingerPitch],
    ['twoFingerYaw', scores.twoFingerYaw],
    ['indexMove', scores.indexMove],
    ['open', scores.open]
  ].sort((a, b) => b[1] - a[1])

  const [mode, confidence] = controls[0]
  if (confidence < VOXEL_GESTURE.confidenceMin) return { mode: 'unknown', confidence, conflict: metrics.conflict || 'low-confidence' }
  return { mode, confidence, conflict: metrics.conflict || 'control-best-score' }
}

function fingerPatternScore(metrics, mustOpen, mustClosed) {
  const f = metrics.fingerScores
  const openParts = mustOpen.map((name) => smoothstep(VOXEL_GESTURE.longOpenSoft, VOXEL_GESTURE.longOpenHard, f[name]))
  const closedParts = mustClosed.map((name) => 1 - smoothstep(VOXEL_GESTURE.longClosedSoft, VOXEL_GESTURE.longClosedHard, f[name]))
  const openScore = openParts.length ? average(openParts) : 1
  const closedScore = closedParts.length ? average(closedParts) : 1
  const worstOpen = openParts.length ? Math.min(...openParts) : 1
  const worstClosed = closedParts.length ? Math.min(...closedParts) : 1
  return clamp(openScore * 0.42 + closedScore * 0.34 + worstOpen * 0.14 + worstClosed * 0.10, 0, 1)
}


function toUserRoot(point) {
  if (!point) return { x: 0.5, y: 0.5, z: 0 }
  return {
    x: VOXEL_GESTURE.mirrorUserX ? 1 - point.x : point.x,
    y: point.y,
    z: point.z || 0
  }
}

function userDeltaX(from, to) {
  if (!from || !to) return 0
  return VOXEL_GESTURE.mirrorUserX ? from.x - to.x : to.x - from.x
}

function stablePalmRoot(landmarks) {
  const wrist = landmarks[IDS.wrist] || { x: 0.5, y: 0.5, z: 0 }
  const indexBase = landmarks[IDS.indexBase] || wrist
  const pinkyBase = landmarks[IDS.pinkyBase] || wrist
  return {
    x: wrist.x * 0.65 + indexBase.x * 0.18 + pinkyBase.x * 0.17,
    y: wrist.y * 0.65 + indexBase.y * 0.18 + pinkyBase.y * 0.17,
    z: (wrist.z || 0) * 0.65 + (indexBase.z || 0) * 0.18 + (pinkyBase.z || 0) * 0.17
  }
}

function getIndexMoveVector(landmarks, rootOffset, metrics) {
  const wrist = landmarks[IDS.wrist]
  const base = landmarks[IDS.indexBase]
  const tip = landmarks[IDS.indexTip]
  if (!base || !tip || !wrist) return fallbackMoveFromRoot(rootOffset)

  // 左右使用用户视角：前置摄像头中，原始 x 往往和用户自己的左右相反。
  const dxBase = userDeltaX(base, tip)
  const dyBase = tip.y - base.y
  const dxWrist = userDeltaX(wrist, tip)
  const dyWrist = tip.y - wrist.y
  const dx = Math.abs(dxBase) > Math.abs(dxWrist) * 0.68 ? dxBase : dxWrist
  const dy = Math.abs(dyBase) > Math.abs(dyWrist) * 0.68 ? dyBase : dyWrist
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  const min = Math.max(0.030, VOXEL_GESTURE.indexDirectionMin * clamp(metrics.palmSize / 0.10, 0.58, 1.14))

  if (Math.max(absX, absY) < min) return fallbackMoveFromRoot(rootOffset)
  if (absY >= absX * 0.72) return dy < 0 ? { x: 0, z: 1, label: '向前' } : { x: 0, z: -1, label: '向后' }
  return dx < 0 ? { x: -1, z: 0, label: '向左' } : { x: 1, z: 0, label: '向右' }
}

function fallbackMoveFromRoot(rootOffset) {
  const min = VOXEL_GESTURE.rootDirectionMin
  if (!rootOffset || Math.max(Math.abs(rootOffset.x), Math.abs(rootOffset.y)) < min) return { x: 0, z: 0, label: '指向不明显' }
  if (Math.abs(rootOffset.y) >= Math.abs(rootOffset.x) * 0.84) return rootOffset.y < 0 ? { x: 0, z: 1, label: '向前' } : { x: 0, z: -1, label: '向后' }
  return rootOffset.x < 0 ? { x: -1, z: 0, label: '向左' } : { x: 1, z: 0, label: '向右' }
}

function classifyLongFinger(score) {
  if (score >= VOXEL_GESTURE.longOpenHard) return 'open'
  if (score <= VOXEL_GESTURE.longClosedHard) return 'closed'
  return 'uncertain'
}

function longFingerScore(landmarks, mcpId, pipId, tipId, palmSize) {
  const wrist = landmarks[IDS.wrist]
  const mcp = landmarks[mcpId]
  const pip = landmarks[pipId]
  const tip = landmarks[tipId]
  if (!wrist || !mcp || !pip || !tip) return 0
  const tipWrist = distance(tip, wrist)
  const pipWrist = distance(pip, wrist)
  const tipMcp = distance(tip, mcp)
  const tipPip = distance(tip, pip)
  const outPastPip = smoothstep(0.00, palmSize * 0.30, tipWrist - pipWrist * 0.95)
  const longEnough = smoothstep(palmSize * 0.40, palmSize * 0.88, tipMcp)
  const segmentOpen = smoothstep(palmSize * 0.15, palmSize * 0.42, tipPip)
  return clamp(outPastPip * 0.48 + longEnough * 0.34 + segmentOpen * 0.18, 0, 1)
}

function thumbOpenScore(landmarks, palmSize) {
  const thumbTip = landmarks[IDS.thumbTip]
  const indexBase = landmarks[IDS.indexBase]
  const wrist = landmarks[IDS.wrist]
  if (!thumbTip || !indexBase || !wrist) return 0
  const awayFromIndex = smoothstep(palmSize * 0.42, palmSize * 0.94, distance(thumbTip, indexBase))
  const awayFromWrist = smoothstep(palmSize * 0.52, palmSize * 1.15, distance(thumbTip, wrist))
  return clamp(awayFromIndex * 0.58 + awayFromWrist * 0.42, 0, 1)
}

function labelForMode(mode, confidence) {
  const pct = Math.round(clamp(confidence, 0, 1) * 100)
  const base = MODE_LABELS[mode] || MODE_LABELS.unknown
  if (mode === 'none') return '未识别到手'
  if (mode === 'unknown') return `${base} · ${pct}%`
  return `${base} · 锁定 ${pct}%`
}

function buildDebugText(mode, candidate, confidence, metrics, scores, conflict = 'none') {
  const f = metrics.fingerScores
  const st = metrics.fingerStates
  const n = (v) => Number(v || 0).toFixed(VOXEL_GESTURE.debugScoreDigits)
  const stateText = `状${st.thumb[0]}/${st.index[0]}/${st.middle[0]}/${st.ring[0]}/${st.pinky[0]}`
  return `模式 ${mode} / 候选 ${candidate} / 置信 ${n(confidence)} / 拇${n(f.thumb)} 食${n(f.index)} 中${n(f.middle)} 无${n(f.ring)} 小${n(f.pinky)} / ${stateText} / 拳${n(scores.fistPlace)} 捏${n(scores.pinchDelete)} / 排斥 ${conflict || metrics.conflict}`
}

function describeConflict({ fingerScores, fingerStates, fistScore, pinchScore, openCount, closedCount, anyLongClearlyOpen, indexClearlyOpen }) {
  if (indexClearlyOpen && fistScore <= VOXEL_GESTURE.fistMaxWhenIndexOpen) return '食指伸出=>禁止握拳'
  if (anyLongClearlyOpen && fistScore <= VOXEL_GESTURE.fistMaxWhenAnyLongOpen) return '长手指伸出=>压低握拳'
  if (pinchScore >= 0.58 && fistScore <= 0.50) return '捏合成立=>不是握拳'
  if (openCount >= 4 && fingerStates.thumb === 'open') return '五指张开=>重置'
  if (openCount >= 4 && fingerStates.thumb !== 'open') return '四长指=>升降候选'
  if (fingerScores.index >= VOXEL_GESTURE.indexOpenVeto && fingerScores.middle <= 0.45 && fingerScores.ring <= 0.45 && fingerScores.pinky <= 0.45) return '一指证据强=>移动'
  if (closedCount >= 4) return '四长指闭合=>握拳候选'
  return 'none'
}

function distance(a, b) {
  if (!a || !b) return 999
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0), (a.z || 0) - (b.z || 0))
}

function average(values) {
  return values.reduce((sum, value) => sum + (Number(value) || 0), 0) / Math.max(1, values.length)
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / Math.max(0.000001, edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function clampDt(dt) {
  if (!Number.isFinite(dt) || dt <= 0) return 1 / 60
  return Math.max(1 / 120, Math.min(0.06, dt))
}

