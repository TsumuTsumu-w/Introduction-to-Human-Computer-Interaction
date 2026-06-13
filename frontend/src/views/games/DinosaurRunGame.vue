<template>
  <main class="dino-run-page" aria-label="恐龙奔袭">
    <section class="dino-run-stage">
      <img :src="plaza" alt="" class="dino-run-bg asset-img" />
      <div class="dino-run-mask"></div>

      <header class="dino-run-header content-layer">
        <p class="section-kicker">{{ game.play.kicker }}</p>
        <h1 class="section-title">{{ game.name }}</h1>
        <p class="section-copy">{{ game.play.intro }}</p>
      </header>

      <div class="dino-run-layout content-layer">
        <main class="dino-game-panel">
          <section class="score-strip" aria-label="恐龙奔袭分数">
            <article>
              <span>当前分数</span>
              <strong>{{ paddedCurrentScore }}</strong>
            </article>
            <article>
              <span>最高分数</span>
              <strong>{{ paddedBestScore }}</strong>
            </article>
          </section>

          <section class="dino-canvas-shell">
            <DinosaurGame
              ref="dinoRef"
              :keyboard-enabled="false"
              @score="handleScore"
              @started="handleStarted"
              @game-over="handleGameOver"
            />
          </section>

          <p class="dino-hint">握拳手势即可开始或重新开始游戏</p>

          <section class="gesture-readouts">
            <div class="recognition-readout">
              <b>握拳</b>
              <span>跳跃</span>
            </div>
            <div class="recognition-readout">
              <b>比V</b>
              <span>俯身</span>
            </div>
          </section>
        </main>

        <aside class="dino-camera-panel">
          <div class="privacy-head">
            <b>骨骼显示屏</b>
            <span>只显示骨骼，不显示原始画面</span>
          </div>

          <section class="skeleton-screen">
            <video ref="videoRef" class="hidden-video" autoplay playsinline muted></video>
            <canvas ref="skeletonCanvasRef" class="main-skeleton-canvas"></canvas>
          </section>

          <button class="park-button" type="button" @click="requestCamera">
            {{ cameraRunning ? '重新申请摄像头' : '申请摄像头' }}
          </button>

          <div class="recognition-readout current-gesture">
            <b>识别结果</b>
            <span>{{ recognizedGestureText }}</span>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import DinosaurGame from '../../components/games/DinosaurGame.vue'
import { findGame } from '../../data/games'
import { saveGameRecord } from '../../games/gameRecords'
import { createGestureEngine, drawPureSkeleton, OFFICIAL_GESTURES } from '../../utils/gesture/mediapipeGestureEngine'
import plaza from '../../assets/park-scenes/plaza.png'

const game = findGame('dinosaur-run')

const dinoRef = ref(null)
const videoRef = ref(null)
const skeletonCanvasRef = ref(null)
const cameraRunning = ref(false)
const cameraStatus = ref('未申请')
const currentFrame = ref(null)
const currentScore = ref(0)
const bestScore = ref(0)
const roundStartedAt = ref(0)
const roundRecorded = ref(false)

let gestureEngine = null
let stream = null
let rafId = 0
let processingFrame = false
let lastFist = false

const paddedCurrentScore = computed(() => formatScore(currentScore.value))
const paddedBestScore = computed(() => formatScore(bestScore.value))

const recognizedGestureText = computed(() => {
  const name = currentFrame.value?.gestureName
  if (!cameraRunning.value || !currentFrame.value?.hasHand) return '未识别'
  if (name === OFFICIAL_GESTURES.CLOSED_FIST) return '握拳'
  if (name === OFFICIAL_GESTURES.VICTORY) return '比V'
  return '未识别'
})

onMounted(() => {
  startLoop()
})

function startLoop() {
  cancelAnimationFrame(rafId)

  const loop = async () => {
    if (cameraRunning.value && videoRef.value?.readyState >= 2 && gestureEngine && !processingFrame) {
      processingFrame = true
      try {
        const frame = gestureEngine.recognize(videoRef.value, performance.now())
        currentFrame.value = frame
        applyGestureControls(frame)
      } catch (error) {
        currentFrame.value = null
        cameraStatus.value = error?.message || '手势识别暂时不可用'
      } finally {
        processingFrame = false
      }
    }

    drawPureSkeleton(skeletonCanvasRef.value, currentFrame.value, { phase: 'action' })
    rafId = requestAnimationFrame(loop)
  }

  rafId = requestAnimationFrame(loop)
}

async function requestCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.value = '当前浏览器不支持摄像头'
    return
  }

  try {
    cameraStatus.value = '正在申请摄像头'
    await nextTick()
    stopCamera(false)
    if (!gestureEngine) gestureEngine = await createGestureEngine()
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false
    })
    videoRef.value.srcObject = stream
    await videoRef.value.play()
    cameraRunning.value = true
    cameraStatus.value = '摄像头已开启'
  } catch (error) {
    cameraRunning.value = false
    cameraStatus.value = error?.message || '摄像头申请失败'
  }
}

function applyGestureControls(frame) {
  const name = frame?.hasHand ? frame.gestureName : ''
  const isFist = name === OFFICIAL_GESTURES.CLOSED_FIST
  const isVictory = name === OFFICIAL_GESTURES.VICTORY

  if (isFist && !lastFist) {
    dinoRef.value?.jump()
  }

  dinoRef.value?.setDucking(isVictory)
  lastFist = isFist
}

function handleStarted(snapshot) {
  currentScore.value = snapshot?.score || 0
  roundStartedAt.value = Date.now()
  roundRecorded.value = false
}

function handleScore(score) {
  currentScore.value = Number(score) || 0
  bestScore.value = Math.max(bestScore.value, currentScore.value)
}

async function handleGameOver(snapshot) {
  const score = Number(snapshot?.score || currentScore.value || 0)
  currentScore.value = score
  bestScore.value = Math.max(bestScore.value, score)

  if (roundRecorded.value) return
  roundRecorded.value = true
  await saveGameRecord(game, {
    action: `${game.stamp} · ${score}分`,
    score,
    rounds: 1,
    durationMs: roundStartedAt.value ? Date.now() - roundStartedAt.value : 0,
    result: 'dinosaur-run-game-over'
  })
}

function stopCamera(updateText = true) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  cameraRunning.value = false
  currentFrame.value = null
  lastFist = false
  if (updateText) cameraStatus.value = '未申请'
}

function formatScore(score) {
  return String(Math.max(0, Math.floor(score))).padStart(5, '0')
}

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  stopCamera(false)
  if (gestureEngine) {
    gestureEngine.close()
    gestureEngine = null
  }
})
</script>

<style scoped>
.dino-run-page {
  min-height: 100%;
}

.dino-run-stage {
  position: relative;
  min-height: 740px;
  overflow: hidden;
  border-radius: 44px;
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: var(--shadow);
  background: linear-gradient(135deg, rgba(255, 247, 231, .96), rgba(232, 245, 244, .86));
}

.dino-run-bg,
.dino-run-mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.dino-run-bg {
  object-fit: cover;
  opacity: .52;
}

.dino-run-mask {
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 255, 255, .88), transparent 28%),
    linear-gradient(90deg, rgba(255, 251, 241, .94), rgba(255, 251, 241, .54) 46%, rgba(233, 246, 245, .80));
}

.dino-run-header,
.dino-run-layout {
  position: relative;
  z-index: 1;
}

.dino-run-header {
  padding: clamp(26px, 4vw, 48px) clamp(26px, 4vw, 44px) 18px;
}

.dino-run-header .section-copy {
  max-width: 780px;
}

.dino-run-layout {
  padding: 0 clamp(26px, 4vw, 44px) clamp(26px, 4vw, 38px);
  display: grid;
  grid-template-columns: minmax(0, 1.22fr) minmax(320px, .78fr);
  gap: 20px;
  align-items: stretch;
}

.dino-game-panel,
.dino-camera-panel {
  background: rgba(255, 250, 235, .70);
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: 0 18px 46px rgba(70, 55, 30, .12);
  border-radius: 28px;
}

@supports (-webkit-backdrop-filter: blur(1px)) {
  .dino-game-panel,
  .dino-camera-panel {
    -webkit-backdrop-filter: blur(18px);
  }
}

@supports (-moz-appearance: none) and (backdrop-filter: blur(1px)) {
  .dino-game-panel,
  .dino-camera-panel {
    backdrop-filter: blur(18px);
  }
}

.dino-game-panel {
  padding: 18px;
  display: grid;
  grid-template-rows: auto minmax(260px, 1fr) auto auto;
  gap: 14px;
}

.score-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(170px, 1fr));
  gap: 12px;
}

.score-strip article {
  min-height: 78px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, .62);
  border: 1px solid rgba(183, 142, 78, .17);
}

.score-strip span,
.score-strip strong {
  display: block;
}

.score-strip span {
  color: #687879;
  font-size: 13px;
  font-weight: 850;
}

.score-strip strong {
  margin-top: 6px;
  width: 7ch;
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace;
  font-size: 28px;
  letter-spacing: 0;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.dino-canvas-shell {
  min-height: 260px;
  display: grid;
  place-items: center;
  padding: 16px;
  border-radius: 24px;
  background: rgba(255, 255, 255, .58);
  border: 1px solid rgba(183, 142, 78, .17);
}

.dino-hint {
  margin: 0;
  color: #687879;
  font-size: 13px;
  font-weight: 850;
  text-align: center;
}

.gesture-readouts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.recognition-readout {
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, .62);
  border: 1px solid rgba(183, 142, 78, .17);
}

.recognition-readout b,
.recognition-readout span {
  display: block;
}

.recognition-readout b {
  color: var(--ink);
  font-size: 18px;
}

.recognition-readout span {
  margin-top: 5px;
  color: #687879;
  line-height: 1.52;
  font-weight: 850;
  font-size: 15px;
}

.dino-camera-panel {
  padding: 18px;
  display: grid;
  gap: 14px;
  align-content: start;
}

.privacy-head b,
.privacy-head span {
  display: block;
}

.privacy-head b {
  color: var(--ink);
  font-size: 22px;
}

.privacy-head span {
  margin-top: 5px;
  color: #667370;
  font-weight: 850;
}

.skeleton-screen {
  position: relative;
  min-height: 245px;
  overflow: hidden;
  border-radius: 26px;
  background: #162131;
  border: 1px solid rgba(183, 142, 78, .22);
}

.hidden-video,
.main-skeleton-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hidden-video {
  opacity: 0;
  pointer-events: none;
}

.current-gesture span {
  min-height: 24px;
}

@media (max-width: 1050px) {
  .dino-run-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .dino-run-stage {
    border-radius: 30px;
  }

  .dino-run-header,
  .dino-run-layout {
    padding-left: 18px;
    padding-right: 18px;
  }

  .score-strip,
  .gesture-readouts {
    grid-template-columns: 1fr;
  }
}
</style>
