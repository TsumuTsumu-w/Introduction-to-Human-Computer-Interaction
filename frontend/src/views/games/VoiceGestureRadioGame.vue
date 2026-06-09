<template>
  <main class="star-map-page" aria-label="手势星图导航">
    <section class="star-stage">
      <img :src="plaza" alt="" class="star-bg asset-img" />
      <div class="star-mask"></div>

      <header class="star-hero content-layer">
        <div>
          <p class="section-kicker">{{ game.play.kicker }}</p>
          <h1 class="section-title">{{ game.name }}</h1>
          <p class="section-copy">{{ game.play.intro }}</p>
          <div class="hero-chips">
            <span>进度 {{ progressText }}</span>
            <span>{{ phaseText }}</span>
            <span>倒计时 {{ timerText }}</span>
            <span>移动 {{ mapState.moves }} 步</span>
          </div>
        </div>

        <aside class="score-pass">
          <small>Score</small>
          <strong>{{ mapState.score }}</strong>
          <span>{{ mapState.misses }} 次失误</span>
        </aside>
      </header>

      <div class="star-layout content-layer">
        <aside class="mission-panel">
          <section class="round-card">
            <p class="mission-kicker">当前星图</p>
            <h2>{{ currentRound.title }}</h2>
            <p>{{ currentRound.intro }}</p>
            <div class="target-card">
              <small>当前目标</small>
              <strong>{{ currentTarget.label }}</strong>
              <span>坐标 {{ currentTarget.x + 1 }}, {{ currentTarget.y + 1 }}</span>
            </div>
          </section>

          <section class="move-list">
            <article v-for="move in moveGuide" :key="move.gesture">
              <b>{{ move.icon }}</b>
              <span>{{ move.label }}</span>
              <small>{{ move.shortLabel }}</small>
            </article>
          </section>

          <section class="readout-card">
            <b>{{ phaseText }}</b>
            <span>{{ mapState.feedback }}</span>
          </section>

          <div class="action-row">
            <button class="park-button" type="button" @click="requestCamera">
              {{ cameraRunning ? '重新申请摄像头' : '申请摄像头' }}
            </button>
            <button class="park-button soft" type="button" @click="startGame">{{ game.play.startLabel }}</button>
            <button class="park-button ghost" type="button" @click="completeTarget">点亮当前星</button>
            <button class="park-button ghost" type="button" @click="resetGame">{{ game.play.resetLabel }}</button>
          </div>
        </aside>

        <section class="play-panel">
          <div class="board-shell">
            <div class="star-board" :style="{ '--grid-size': gridSize }">
              <button
                v-for="cell in boardCells"
                :key="cell.key"
                class="star-cell"
                :class="{
                  active: cell.isPlayer,
                  target: cell.isTarget,
                  captured: cell.isCaptured,
                  start: cell.isStart
                }"
                type="button"
                @click="debugMoveToCell(cell)"
              >
                <span v-if="cell.isPlayer" class="beacon"></span>
                <span v-else-if="cell.isTarget" class="target-dot"></span>
                <span v-else-if="cell.isCaptured" class="captured-dot"></span>
              </button>
            </div>

            <div class="route-strip">
              <article
                v-for="(target, index) in currentRound.targets"
                :key="target.label"
                :class="{ done: index < mapState.targetIndex, current: index === mapState.targetIndex }"
              >
                <b>{{ index + 1 }}</b>
                <span>{{ target.label }}</span>
              </article>
            </div>
          </div>

          <div class="camera-card">
            <div class="camera-frame">
              <video ref="videoRef" class="star-video" autoplay playsinline muted></video>
              <canvas ref="gestureCanvasRef" class="gesture-canvas"></canvas>
              <div class="camera-overlay">
                <div>
                  <small>当前识别</small>
                  <strong>{{ currentGestureText }}</strong>
                </div>
                <div>
                  <small>手势含义</small>
                  <strong>{{ currentMoveText }}</strong>
                </div>
              </div>
            </div>

            <div class="status-grid">
              <article :class="{ good: cameraRunning }">
                <b>摄像头</b>
                <span>{{ cameraStatus }}</span>
              </article>
              <article :class="{ good: skeletonQuality.ready }">
                <b>手部质量</b>
                <span>{{ qualityText }}</span>
              </article>
              <article>
                <b>信标位置</b>
                <span>{{ mapState.position.x + 1 }}, {{ mapState.position.y + 1 }}</span>
              </article>
              <article>
                <b>目标位置</b>
                <span>{{ currentTarget.x + 1 }}, {{ currentTarget.y + 1 }}</span>
              </article>
            </div>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { findGame } from '../../data/games'
import { saveGameRecord } from '../../games/gameRecords'
import { createGestureEngine, drawPureSkeleton, scoreSkeletonQuality } from '../../utils/gesture/mediapipeGestureEngine'
import {
  STAR_GRID_SIZE,
  STAR_MAP_MOVES,
  applyStarMapGesture,
  completeCurrentStarMapTarget,
  createStarMapState,
  getStarMapMoveLabel,
  getStarMapProgress,
  getStarMapRound,
  getStarMapTarget,
  getStarMapTimerText,
  resetStarMapState,
  startStarMapState,
  tickStarMapState
} from '../../games/voiceGestureRadioLogic'
import plaza from '../../assets/park-scenes/plaza.png'

const sourceGame = findGame('voice-gesture-radio')
const game = {
  ...sourceGame,
  name: '手势星图导航',
  stamp: '手势星图导航章',
  play: {
    ...sourceGame.play,
    kicker: 'Gesture Star Map',
    intro: '把手势当成方向键：张开手掌上移，握拳下移，比 V 左移，点赞右移，按顺序点亮星图目标。',
    idleTitle: '等待星图启动',
    activeTitle: '星图导航中',
    doneTitle: '星图完成',
    startLabel: '开始星图',
    resetLabel: '重来'
  }
}
const mapState = ref(createStarMapState())
const videoRef = ref(null)
const gestureCanvasRef = ref(null)
const currentFrame = ref(null)
const skeletonQuality = ref({ ready: false, score: 0, size: 0 })
const cameraRunning = ref(false)
const cameraStatus = ref('未申请')
const nowTick = ref(Date.now())

let stream = null
let gestureEngine = null
let rafId = 0
let timerId = 0
let processing = false

const gridSize = STAR_GRID_SIZE
const moveGuide = STAR_MAP_MOVES

const currentRound = computed(() => getStarMapRound(mapState.value) || mapState.value.rounds[0])
const currentTarget = computed(() => getStarMapTarget(mapState.value) || currentRound.value.targets[0])
const progressText = computed(() => getStarMapProgress(mapState.value))
const timerText = computed(() => getStarMapTimerText(mapState.value, nowTick.value))
const phaseText = computed(() => {
  if (mapState.value.phase === 'done') return game.play.doneTitle
  if (mapState.value.phase === 'failed') return '挑战失败'
  if (mapState.value.phase === 'active') return game.play.activeTitle
  return game.play.idleTitle
})
const currentGestureText = computed(() => {
  const frame = currentFrame.value
  if (!frame?.hasHand) return '等待手部'
  return `${frame.gestureName} ${Math.round((frame.gestureScore || 0) * 100)}%`
})
const currentMoveText = computed(() => getStarMapMoveLabel(currentFrame.value?.gestureName))
const qualityText = computed(() => {
  if (!skeletonQuality.value.ready) return '请把手放到画面中央'
  return `${Math.round(skeletonQuality.value.score * 100)}%`
})
const boardCells = computed(() => {
  const round = currentRound.value
  const target = currentTarget.value
  const position = mapState.value.position
  const captured = round.targets.slice(0, mapState.value.targetIndex)
  const cells = []
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      cells.push({
        x,
        y,
        key: `${x}-${y}`,
        isPlayer: position.x === x && position.y === y,
        isTarget: target.x === x && target.y === y,
        isCaptured: captured.some((item) => item.x === x && item.y === y),
        isStart: round.start.x === x && round.start.y === y
      })
    }
  }
  return cells
})

onMounted(() => {
  startRenderLoop()
  timerId = window.setInterval(() => {
    nowTick.value = Date.now()
    mapState.value = tickStarMapState(mapState.value, nowTick.value)
    maybeSaveRecord()
  }, 200)
})

function startRenderLoop() {
  cancelAnimationFrame(rafId)
  const loop = async () => {
    if (cameraRunning.value && videoRef.value?.readyState >= 2 && gestureEngine && !processing) {
      processing = true
      try {
        const frame = gestureEngine.recognize(videoRef.value, performance.now())
        currentFrame.value = frame
        skeletonQuality.value = scoreSkeletonQuality(frame)
        drawCurrentFrame()
        if (mapState.value.phase === 'active' && frame?.hasHand && frame.gestureName) {
          mapState.value = applyStarMapGesture(mapState.value, frame.gestureName, Date.now())
        }
      } catch (error) {
        cameraStatus.value = error?.message || '手势识别暂时不可用'
      } finally {
        processing = false
      }
    }

    rafId = requestAnimationFrame(loop)
  }

  rafId = requestAnimationFrame(loop)
}

function drawCurrentFrame() {
  drawPureSkeleton(gestureCanvasRef.value, currentFrame.value, { phase: mapState.value.phase })
}

async function requestCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.value = '当前浏览器不支持摄像头'
    return
  }

  try {
    cameraStatus.value = '正在申请摄像头'
    if (!gestureEngine) {
      gestureEngine = await createGestureEngine()
    }
    await nextTick()
    stopCamera(false)
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false
    })
    videoRef.value.srcObject = stream
    await videoRef.value.play()
    cameraRunning.value = true
    cameraStatus.value = '摄像头已开启'
    drawCurrentFrame()
  } catch (error) {
    cameraStatus.value = error?.message || '摄像头申请失败'
    cameraRunning.value = false
  }
}

function startGame() {
  mapState.value = startStarMapState(mapState.value, Date.now())
  currentFrame.value = null
  skeletonQuality.value = { ready: false, score: 0, size: 0 }
  drawCurrentFrame()
}

function completeTarget() {
  mapState.value = completeCurrentStarMapTarget(mapState.value, Date.now())
  maybeSaveRecord()
}

function debugMoveToCell(cell) {
  if (mapState.value.phase !== 'active') return
  mapState.value = { ...mapState.value, position: { x: cell.x, y: cell.y }, feedback: '已手动移动信标。' }
  if (cell.isTarget) {
    completeTarget()
  }
}

function resetGame() {
  mapState.value = resetStarMapState(cameraRunning.value)
  currentFrame.value = null
  skeletonQuality.value = { ready: false, score: 0, size: 0 }
  drawCurrentFrame()
}

function maybeSaveRecord() {
  if (mapState.value.phase === 'done' && !mapState.value.recorded) {
    void saveStarRecord()
  }
}

async function saveStarRecord() {
  mapState.value = { ...mapState.value, recorded: true }
  await saveGameRecord(game, {
    action: `${game.stamp} · ${mapState.value.completedRounds}/${mapState.value.totalRounds}轮 · ${mapState.value.capturedTargets}星`,
    score: mapState.value.score,
    rounds: mapState.value.completedRounds,
    durationMs: Date.now() - (mapState.value.sessionStartedAt || mapState.value.roundStartedAt),
    result: 'complete'
  })
}

function stopCamera(updateText = true) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  cameraRunning.value = false
  currentFrame.value = null
  skeletonQuality.value = { ready: false, score: 0, size: 0 }
  drawCurrentFrame()
  if (updateText) {
    cameraStatus.value = '未申请'
  }
}

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  clearInterval(timerId)
  stopCamera(false)
  if (gestureEngine) {
    gestureEngine.close()
    gestureEngine = null
  }
})
</script>

<style scoped>
.star-map-page {
  min-height: 100%;
}

.star-stage {
  position: relative;
  min-height: 780px;
  overflow: hidden;
  border-radius: 36px;
  border: 1px solid rgba(54, 83, 115, .22);
  background: linear-gradient(135deg, rgba(245, 251, 255, .96), rgba(255, 247, 231, .88));
  box-shadow: var(--shadow);
}

.star-bg,
.star-mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.star-bg {
  object-fit: cover;
  opacity: .42;
}

.star-mask {
  background:
    radial-gradient(circle at 12% 14%, rgba(255, 255, 255, .94), transparent 28%),
    linear-gradient(120deg, rgba(247, 252, 255, .94), rgba(255, 249, 235, .78));
}

.star-hero,
.star-layout {
  position: relative;
  z-index: 1;
}

.star-hero {
  padding: clamp(30px, 5vw, 58px) clamp(26px, 4vw, 44px) 20px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.hero-chips {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hero-chips span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .74);
  border: 1px solid rgba(54, 83, 115, .16);
  color: #31546e;
  font-size: 12px;
  font-weight: 900;
}

.star-layout {
  padding: 0 clamp(26px, 4vw, 44px) clamp(28px, 4vw, 42px);
  display: grid;
  grid-template-columns: minmax(300px, .74fr) minmax(0, 1.26fr);
  gap: 20px;
}

.mission-panel,
.play-panel {
  display: grid;
  gap: 14px;
}

.round-card,
.readout-card,
.camera-card,
.board-shell {
  border-radius: 24px;
  border: 1px solid rgba(54, 83, 115, .18);
  background: rgba(255, 255, 255, .72);
  box-shadow: 0 18px 46px rgba(43, 59, 75, .10);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.round-card,
.readout-card {
  padding: 18px;
}

.mission-kicker {
  margin: 0;
  color: #2d6f73;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.round-card h2 {
  margin: 10px 0 0;
  color: var(--ink);
  font-size: 28px;
}

.round-card p {
  margin: 10px 0 0;
  color: #61706e;
  line-height: 1.7;
}

.target-card {
  margin-top: 16px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(229, 247, 249, .82);
  border: 1px solid rgba(42, 157, 143, .20);
}

.target-card small,
.target-card strong,
.target-card span,
.readout-card b,
.readout-card span {
  display: block;
}

.target-card small,
.readout-card b {
  color: #2d6f73;
  font-size: 12px;
  font-weight: 950;
}

.target-card strong {
  margin-top: 4px;
  color: var(--ink);
  font-size: 24px;
}

.target-card span,
.readout-card span {
  margin-top: 6px;
  color: #536765;
  font-weight: 800;
}

.move-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.move-list article {
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, .72);
  border: 1px solid rgba(54, 83, 115, .14);
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 8px;
  align-items: center;
}

.move-list b {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 232, 153, .86);
  color: #6b5a21;
  font-size: 22px;
}

.move-list span,
.move-list small {
  display: block;
  color: var(--ink);
  font-weight: 900;
}

.move-list small {
  color: #6a7a78;
  font-size: 12px;
}

.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.board-shell {
  padding: 18px;
}

.star-board {
  display: grid;
  grid-template-columns: repeat(var(--grid-size), minmax(0, 1fr));
  gap: 10px;
  aspect-ratio: 1;
}

.star-cell {
  position: relative;
  min-width: 0;
  border: 1px solid rgba(54, 83, 115, .16);
  border-radius: 8px;
  background:
    radial-gradient(circle, rgba(255,255,255,.88) 0 2px, transparent 3px),
    rgba(239, 248, 251, .82);
  cursor: pointer;
}

.star-cell.start {
  background-color: rgba(255, 244, 205, .92);
}

.star-cell.target {
  border-color: rgba(230, 57, 70, .44);
  background-color: rgba(255, 235, 238, .92);
}

.star-cell.captured {
  border-color: rgba(42, 157, 143, .34);
  background-color: rgba(230, 249, 241, .92);
}

.star-cell.active {
  border-color: rgba(45, 111, 115, .58);
  background-color: rgba(217, 242, 247, .98);
}

.beacon,
.target-dot,
.captured-dot {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
}

.beacon {
  width: 42%;
  height: 42%;
  background: #f4a261;
  box-shadow: 0 0 0 8px rgba(244, 162, 97, .20);
}

.target-dot {
  width: 34%;
  height: 34%;
  background: #e63946;
  box-shadow: 0 0 0 8px rgba(230, 57, 70, .18);
}

.captured-dot {
  width: 24%;
  height: 24%;
  background: #2a9d8f;
}

.route-strip {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 10px;
}

.route-strip article {
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(54, 83, 115, .14);
  background: rgba(255, 255, 255, .72);
}

.route-strip b,
.route-strip span {
  display: block;
}

.route-strip b {
  color: #2d6f73;
}

.route-strip span {
  color: var(--ink);
  font-weight: 900;
}

.route-strip article.current {
  border-color: rgba(230, 57, 70, .36);
}

.route-strip article.done {
  border-color: rgba(42, 157, 143, .28);
  background: rgba(232, 249, 241, .90);
}

.camera-card {
  padding: 18px;
}

.camera-frame {
  position: relative;
  min-height: 320px;
  overflow: hidden;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(35, 47, 63, .95), rgba(17, 26, 37, .92));
}

.star-video {
  width: 100%;
  height: 100%;
  min-height: 320px;
  object-fit: cover;
  transform: scaleX(-1);
}

.gesture-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.camera-overlay {
  position: absolute;
  inset: auto 16px 16px 16px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 250, 235, .78);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.camera-overlay small,
.camera-overlay strong {
  display: block;
}

.camera-overlay small {
  color: #2d6f73;
  font-weight: 950;
}

.camera-overlay strong {
  color: var(--ink);
}

.status-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.status-grid article {
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, .70);
  border: 1px solid rgba(54, 83, 115, .14);
}

.status-grid article.good {
  border-color: rgba(42, 157, 143, .30);
  background: rgba(232, 249, 241, .92);
}

.status-grid b,
.status-grid span {
  display: block;
}

.status-grid b {
  color: #2d6f73;
  font-size: 12px;
}

.status-grid span {
  margin-top: 4px;
  color: var(--ink);
  font-weight: 850;
}

@media (max-width: 1000px) {
  .star-layout,
  .star-hero {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .star-layout,
  .move-list,
  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
