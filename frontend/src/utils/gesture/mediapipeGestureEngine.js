import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'

export const OFFICIAL_GESTURES = {
  CLOSED_FIST: 'Closed_Fist',
  OPEN_PALM: 'Open_Palm',
  POINTING_UP: 'Pointing_Up',
  THUMB_DOWN: 'Thumb_Down',
  THUMB_UP: 'Thumb_Up',
  VICTORY: 'Victory',
  I_LOVE_YOU: 'ILoveYou',
  NONE: 'None'
}

export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
]

const DEFAULT_MODEL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'

const DEFAULT_WASM =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

let sharedVision = null

export async function createGestureEngine(options = {}) {
  const vision = await resolveVision(options.wasmBase)
  const recognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: options.modelAssetPath || DEFAULT_MODEL,
      delegate: options.delegate || 'GPU'
    },
    runningMode: 'VIDEO',
    numHands: 1
  })

  return {
    recognize(video, timestampMs = performance.now()) {
      return normalizeGestureResult(recognizer.recognizeForVideo(video, timestampMs))
    },
    close() {
      recognizer.close()
    }
  }
}

async function resolveVision(wasmBase = DEFAULT_WASM) {
  if (!sharedVision) {
    sharedVision = await FilesetResolver.forVisionTasks(wasmBase)
  }
  return sharedVision
}

export function normalizeGestureResult(result) {
  const rawLandmarks = result?.landmarks?.[0] || []
  const mirroredLandmarks = rawLandmarks.map((point) => ({
    x: 1 - point.x,
    y: point.y,
    z: point.z || 0
  }))

  const gesture = result?.gestures?.[0]?.[0] || null
  const handedness = result?.handedness?.[0]?.[0] || null

  return {
    hasHand: mirroredLandmarks.length === 21,
    landmarks: mirroredLandmarks,
    gestureName: gesture?.categoryName || OFFICIAL_GESTURES.NONE,
    gestureScore: gesture?.score || 0,
    handednessName: handedness?.categoryName || '',
    handednessScore: handedness?.score || 0,
    center: calculateHandCenter(mirroredLandmarks),
    bounds: calculateHandBounds(mirroredLandmarks)
  }
}

export function calculateHandCenter(points) {
  if (!points?.length) return null
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  }
}

export function calculateHandBounds(points, padding = 0.08) {
  if (!points?.length) return null
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  return {
    minX: clamp01(Math.min(...xs) - padding),
    maxX: clamp01(Math.max(...xs) + padding),
    minY: clamp01(Math.min(...ys) - padding),
    maxY: clamp01(Math.max(...ys) + padding)
  }
}

export function scoreSkeletonQuality(frame) {
  if (!frame?.hasHand || !frame.bounds) {
    return { ready: false, score: 0, size: 0 }
  }

  const width = frame.bounds.maxX - frame.bounds.minX
  const height = frame.bounds.maxY - frame.bounds.minY
  const size = Math.max(width, height)
  const gesturePart = Math.min(frame.gestureScore / 0.68, 1) * 0.56
  const sizePart = Math.min(size / 0.22, 1) * 0.44
  const score = clamp01(gesturePart + sizePart)

  return {
    ready: frame.hasHand && score >= 0.68 && size >= 0.14,
    score,
    size
  }
}

export function drawPureSkeleton(canvas, frame, options = {}) {
  if (!canvas) return
  const ctx = prepareCanvas(canvas)
  const { width, height } = canvas
  const phase = options.phase || 'idle'

  const background = ctx.createLinearGradient(0, 0, width, height)
  background.addColorStop(0, '#17243a')
  background.addColorStop(0.52, '#243a53')
  background.addColorStop(1, '#10212f')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, height)

  drawStageGrid(ctx, width, height)
  drawSignalAura(ctx, width, height, phase)

  if (!frame?.hasHand) {
    drawEmptyWaitingHalo(ctx, width, height)
    return
  }

  drawSkeletonLines(ctx, frame.landmarks, width, height, {
    outer: 'rgba(255, 232, 153, 0.98)',
    inner: 'rgba(96, 199, 224, 0.95)',
    dot: 'rgba(255, 242, 184, 0.98)'
  })

  if (frame.bounds) {
    drawHandFrame(ctx, frame.bounds, width, height)
  }
}

export function drawPrivacyPreview(canvas, video, frame) {
  if (!canvas) return
  const ctx = prepareCanvas(canvas)
  const { width, height } = canvas

  if (!video || video.readyState < 2) {
    ctx.fillStyle = 'rgba(20, 31, 43, 0.96)'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = 'rgba(255, 250, 235, 0.82)'
    ctx.font = '700 16px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('等待摄像头画面', width / 2, height / 2)
    return
  }

  ctx.save()
  ctx.filter = 'blur(16px) brightness(0.35) saturate(0.45)'
  mirrorDrawVideo(ctx, video, width, height)
  ctx.restore()

  ctx.fillStyle = 'rgba(18, 26, 38, 0.42)'
  ctx.fillRect(0, 0, width, height)

  if (frame?.bounds) {
    const box = frame.bounds
    const x = box.minX * width
    const y = box.minY * height
    const w = (box.maxX - box.minX) * width
    const h = (box.maxY - box.minY) * height
    const r = Math.min(34, Math.max(18, Math.min(w, h) * 0.18))

    ctx.save()
    roundedRect(ctx, x, y, w, h, r)
    ctx.clip()
    ctx.filter = 'blur(1.2px) brightness(0.92) saturate(0.82)'
    mirrorDrawVideo(ctx, video, width, height)
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = 'rgba(255, 229, 138, 0.92)'
    ctx.lineWidth = 4
    roundedRect(ctx, x, y, w, h, r)
    ctx.stroke()
    ctx.restore()

    drawSkeletonLines(ctx, frame.landmarks, width, height, {
      outer: 'rgba(255, 229, 138, 0.95)',
      inner: 'rgba(39, 60, 91, 0.82)',
      dot: 'rgba(255, 250, 235, 0.96)'
    })
  }

  ctx.fillStyle = 'rgba(255, 250, 235, 0.82)'
  ctx.font = '800 12px system-ui'
  ctx.textAlign = 'left'
  ctx.fillText('隐私副屏：强模糊，仅确认手部区域', 16, height - 18)
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const displayWidth = Math.max(320, Math.floor(rect.width * dpr))
  const displayHeight = Math.max(220, Math.floor(rect.height * dpr))

  if (canvas.width !== displayWidth) canvas.width = displayWidth
  if (canvas.height !== displayHeight) canvas.height = displayHeight

  const ctx = canvas.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return ctx
}

function mirrorDrawVideo(ctx, video, width, height) {
  ctx.save()
  ctx.translate(width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, 0, 0, width, height)
  ctx.restore()
}

function drawStageGrid(ctx, width, height) {
  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.strokeStyle = '#c5e7ec'
  ctx.lineWidth = 1

  for (let x = 0; x < width; x += width / 12) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y < height; y += height / 8) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.restore()
}

function drawSignalAura(ctx, width, height, phase) {
  const x = width * 0.5
  const y = height * 0.48
  const radius = Math.min(width, height) * (phase === 'action' ? 0.42 : 0.34)
  const gradient = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius)
  gradient.addColorStop(0, phase === 'finished' ? 'rgba(132, 218, 151, 0.34)' : 'rgba(255, 225, 132, 0.28)')
  gradient.addColorStop(1, 'rgba(255, 225, 132, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function drawEmptyWaitingHalo(ctx, width, height) {
  ctx.save()
  ctx.translate(width / 2, height / 2)

  ctx.strokeStyle = 'rgba(255, 230, 150, 0.34)'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 12])

  ctx.beginPath()
  ctx.arc(0, 0, Math.min(width, height) * 0.18, 0, Math.PI * 2)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(126, 202, 222, 0.58)'

  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath()
    const angle = (Math.PI * 2 * i) / 8
    ctx.arc(Math.cos(angle) * 120, Math.sin(angle) * 90, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function drawSkeletonLines(ctx, points, width, height, colors) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const [a, b] of HAND_CONNECTIONS) {
    const p1 = points[a]
    const p2 = points[b]
    ctx.beginPath()
    ctx.moveTo(p1.x * width, p1.y * height)
    ctx.lineTo(p2.x * width, p2.y * height)
    ctx.strokeStyle = colors.outer
    ctx.lineWidth = 8
    ctx.stroke()
    ctx.strokeStyle = colors.inner
    ctx.lineWidth = 3.2
    ctx.stroke()
  }

  points.forEach((point, index) => {
    ctx.beginPath()
    ctx.arc(point.x * width, point.y * height, index === 0 ? 8 : 5.2, 0, Math.PI * 2)
    ctx.fillStyle = index === 0 ? colors.dot : 'rgba(126, 202, 222, 0.96)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(20, 31, 43, 0.78)'
    ctx.stroke()
  })

  ctx.restore()
}

function drawHandFrame(ctx, box, width, height) {
  const x = box.minX * width
  const y = box.minY * height
  const w = (box.maxX - box.minX) * width
  const h = (box.maxY - box.minY) * height

  ctx.save()
  ctx.strokeStyle = 'rgba(255, 222, 130, 0.80)'
  ctx.lineWidth = 3
  ctx.setLineDash([12, 9])
  roundedRect(ctx, x, y, w, h, 28)
  ctx.stroke()
  ctx.restore()
}

function roundedRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }

  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value))
}
