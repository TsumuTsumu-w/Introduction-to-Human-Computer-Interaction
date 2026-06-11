<template>
  <main class="freebuild-page" aria-label="自由积木乐园全屏搭建">
    <canvas ref="stageCanvasRef" class="freebuild-canvas"></canvas>
    <video ref="videoRef" class="hidden-video" autoplay playsinline muted></video>

    <header class="freebuild-topbar">
      <div class="brand-card">
        <img :src="blockMascot" alt="" />
        <div>
          <small>GestureFlow Park</small>
          <strong>自由积木乐园</strong>
          <span>全屏轻 3D · 固定自由沙盒 · 手势搭建玩具台</span>
        </div>
      </div>

      <div class="view-tabs" aria-label="视角切换">
        <button v-for="item in viewModes" :key="item.id" type="button" :class="{ active: blockSummary.viewMode === item.label }" @click="setView(item.id)">
          {{ item.label }}
        </button>
      </div>

      <div class="top-actions">
        <button type="button" class="glass-button" @click="goGarden">返回游戏庭</button>
        <button type="button" class="dark-button" @click="goDashboard">离开园区</button>
      </div>
    </header>

    <aside class="left-console" aria-label="自由搭建控制台">
      <section class="guide-card hero-card">
        <span class="pill">自由搭建模式</span>
        <h1>{{ blockPrompt.title }}</h1>
        <p>{{ blockPrompt.hint }}</p>
        <div class="free-mode-banner">
          <strong>只保留自由沙盒</strong>
          <span>不限任务、不倒计时。这里就是一个全屏积木玩具台，搭高、抽底、吹风和堆叠都会反馈。</span>
        </div>
        <div class="gesture-steps">
          <span>张开移动</span>
          <span>闭合抓取</span>
          <span>张开放下</span>
        </div>
      </section>

      <section class="panel-card">
        <b>自由搭建参数</b>
        <div class="difficulty-switch compact">
          <button v-for="item in blockDifficultyLevels" :key="item.id" type="button" :class="{ active: blockDifficultyId === item.id }" @click="setBlockDifficulty(item.id)">
            <strong>{{ item.name }}</strong>
            <span>参考高度 {{ item.towerGoal }}m</span>
          </button>
        </div>
        <div class="physics-label-strip" aria-label="自由搭建物理选项">
          <span>轻柔物理</span>
          <span>标准物理</span>
        </div>
        <p>{{ blockDifficulty.label }}</p>
      </section>

      <section class="panel-card compact-copy">
        <b>操作规则</b>
        <p>手势是核心。打开手只是移动，经过方块不会抓取；只有在方块上方由张开变闭合才抓，闭合后张开才放下。</p>
      </section>

      <section class="button-grid">
        <button class="park-button" type="button" @click="requestBlockCamera">{{ blockCameraRunning ? '重新申请摄像头' : '申请摄像头' }}</button>
        <button class="park-button soft" type="button" :disabled="!blockCanStart" @click="startBlockRound">开始自由搭建</button>
        <button class="park-button ghost" type="button" @click="resetBlockRound">重置舞台</button>
        <button class="park-button ghost" type="button" @click="changeBlockPiece">换块</button>
        <button class="park-button ghost" type="button" @click="triggerWind">吹风</button>
        <button class="park-button ghost" type="button" @click="setView('close')">近景查看</button>
      </section>
    </aside>

    <aside class="right-console" aria-label="识别状态栏">
      <section class="privacy-card">
        <div class="privacy-head">
          <b>隐私副屏</b>
          <span>强模糊，只确认手部区域</span>
        </div>
        <canvas ref="privacyCanvasRef" class="privacy-canvas"></canvas>
      </section>

      <section class="status-list">
        <article :class="{ good: blockCameraRunning }">
          <b>摄像头</b>
          <span>{{ blockCameraStatus }}</span>
        </article>
        <article :class="{ good: blockSkeletonReady }">
          <b>手势</b>
          <span>{{ blockGestureText }}</span>
        </article>
        <article :class="{ good: expressionReady }">
          <b>表情彩蛋</b>
          <span>{{ expressionStatus }}</span>
        </article>
      </section>
    </aside>

    <footer class="bottom-dock">
      <div class="dock-stat">
        <small>积木数</small>
        <strong>{{ blockSummary.blocks }}</strong>
      </div>
      <div class="dock-stat">
        <small>最高</small>
        <strong>{{ blockSummary.maxHeight.toFixed(1) }}m</strong>
      </div>
      <div class="dock-stat">
        <small>星章</small>
        <strong>{{ blockSummary.stars }}</strong>
      </div>
      <div class="dock-message">
        <b>{{ blockFeedbackTitle }}</b>
        <span>{{ blockState.feedback }}</span>
      </div>
    </footer>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createGestureEngine, drawPrivacyPreview, scoreSkeletonQuality } from '../utils/gesture/mediapipeGestureEngine'
import { createFaceExpressionEngine } from '../utils/sensory/simpleFaceExpressionEngine'
import { MAGIC_BLOCK_DIFFICULTIES, applyMagicBlockExpression, changeMagicBlockPiece, createMagicBlockState, drawMagicBlockStage, getMagicBlockDifficulty, getMagicBlockPrompt, getMagicBlockSeekText, getMagicBlockSummary, resetMagicBlockState, setMagicBlockViewMode, startMagicBlockState, updateMagicBlockFrame } from '../games/magicBlockBuilderLogic'
import blockMascot from '../assets/park-decor/magic-block-mascot.svg'

const router = useRouter()
const stageCanvasRef = ref(null)
const videoRef = ref(null)
const privacyCanvasRef = ref(null)

const blockDifficultyLevels = MAGIC_BLOCK_DIFFICULTIES
const blockDifficultyId = ref('normal')
const blockDifficulty = computed(() => getMagicBlockDifficulty(blockDifficultyId.value))
const blockState = ref(createMagicBlockState(blockDifficulty.value))
const blockFrame = ref(null)
const blockQuality = ref({ ready: false, score: 0, size: 0 })
const blockCameraRunning = ref(false)
const blockCameraStatus = ref('未申请')
const expressionReady = ref(false)
const expressionStatus = ref('可选：微笑/吹气')

let blockGestureEngine = null
let faceEngine = null
let stream = null
let rafId = 0
let processing = false
let lastExpressionAt = 0

const viewModes = [
  { id: 'plaza', label: '广场视角' },
  { id: 'close', label: '近景视角' },
  { id: 'top', label: '俯视辅助' }
]

const blockSummary = computed(() => getMagicBlockSummary(blockState.value))
const blockPrompt = computed(() => getMagicBlockPrompt(blockState.value))
const blockSkeletonReady = computed(() => blockCameraRunning.value && blockQuality.value.ready)
const blockBusy = computed(() => ['seeking', 'playing'].includes(blockState.value.phase))
const blockCanStart = computed(() => blockCameraRunning.value && !blockBusy.value)

const blockGestureText = computed(() => {
  const gesture = blockState.value.gesture
  if (!blockCameraRunning.value) return '等待摄像头'
  if (!gesture?.hasHand) return '未识别到手'
  if (blockState.value.holdingId) return '闭合拿着：张开放下'
  if (blockState.value.hoverBlockId) return '积木上方：闭合抓取'
  if (gesture.palmState === 'open') return '张开手：只移动'
  if (gesture.palmState === 'closed') return '闭合手'
  return gesture.gestureName || '手势已识别'
})

const blockFeedbackTitle = computed(() => {
  if (blockState.value.phase === 'seeking') return `找手 ${getMagicBlockSeekText(blockState.value, Date.now())}s`
  if (blockState.value.holdingId) return '正在拿积木'
  if (blockState.value.hoverBlockId) return '可以抓取'
  return '自由搭建'
})

onMounted(() => {
  startRenderLoop()
})

function startRenderLoop() {
  cancelAnimationFrame(rafId)
  const loop = () => {
    const now = Date.now()
    if (blockCameraRunning.value && videoRef.value?.readyState >= 2 && blockGestureEngine && !processing) {
      processing = true
      try {
        const frame = blockGestureEngine.recognize(videoRef.value, performance.now())
        blockFrame.value = frame
        blockQuality.value = scoreSkeletonQuality(frame)
        blockState.value = updateMagicBlockFrame(blockState.value, frame, blockDifficulty.value, now)
        updateExpression(now)
      } catch (error) {
        blockState.value = { ...blockState.value, feedback: error?.message || '识别暂时中断。' }
      } finally {
        processing = false
      }
    } else {
      blockState.value = updateMagicBlockFrame(blockState.value, null, blockDifficulty.value, now)
    }
    drawMagicBlockStage(stageCanvasRef.value, blockState.value)
    drawPrivacyPreview(privacyCanvasRef.value, videoRef.value, blockFrame.value)
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

async function updateExpression(now) {
  if (!faceEngine || !videoRef.value || now - lastExpressionAt < 450) return
  try {
    const expression = faceEngine.recognize(videoRef.value, performance.now())
    if (expression?.hasFace) {
      expressionReady.value = true
      expressionStatus.value = expression.blow ? '检测到吹气' : expression.smile ? '检测到微笑' : '等待微笑/吹气'
      if (expression.smile || expression.blow) {
        blockState.value = applyMagicBlockExpression(blockState.value, expression, blockDifficulty.value, now)
        lastExpressionAt = now
      }
    }
  } catch {
    expressionStatus.value = '表情彩蛋暂不可用'
  }
}

async function requestBlockCamera() {
  try {
    blockCameraStatus.value = '正在申请视频权限'
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器不支持摄像头访问，或页面不是 localhost/https。')
    if (!blockGestureEngine) {
      blockCameraStatus.value = '正在加载手势识别模型'
      blockGestureEngine = await createGestureEngine()
    }
    try {
      if (!faceEngine) faceEngine = await createFaceExpressionEngine()
      expressionStatus.value = '微笑/吹气彩蛋已准备'
    } catch {
      expressionStatus.value = '表情彩蛋加载失败，不影响手势搭建'
    }
    await nextTick()
    stopCamera(false)
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false })
    videoRef.value.srcObject = stream
    await videoRef.value.play()
    blockCameraRunning.value = true
    blockCameraStatus.value = '已开启'
    blockState.value = { ...blockState.value, feedback: '摄像头已开启。点击开始后，5 秒内把手伸进画面。' }
  } catch (error) {
    blockCameraStatus.value = '申请失败'
    blockCameraRunning.value = false
    blockState.value = { ...blockState.value, feedback: error?.message || '摄像头申请失败。' }
  }
}

function startBlockRound() {
  blockState.value = startMagicBlockState(blockState.value, blockDifficulty.value, Date.now())
}

function resetBlockRound() {
  blockState.value = resetMagicBlockState(blockDifficulty.value, blockCameraRunning.value)
}

function setBlockDifficulty(id) {
  if (blockBusy.value) return
  blockDifficultyId.value = id
  blockState.value = resetMagicBlockState(blockDifficulty.value, blockCameraRunning.value)
}

function setView(id) {
  blockState.value = setMagicBlockViewMode(blockState.value, id)
}

function changeBlockPiece() {
  blockState.value = changeMagicBlockPiece(blockState.value, blockDifficulty.value, Date.now())
}

function triggerWind() {
  blockState.value = applyMagicBlockExpression(blockState.value, { blow: true, source: '手动吹风按钮' }, blockDifficulty.value, Date.now())
}

function stopCamera(updateText = true) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  blockCameraRunning.value = false
  blockFrame.value = null
  blockQuality.value = { ready: false, score: 0, size: 0 }
  if (updateText) blockCameraStatus.value = '未申请'
}

function goGarden() {
  router.push('/games')
}

function goDashboard() {
  router.push('/dashboard')
}

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  stopCamera(false)
  if (blockGestureEngine) {
    blockGestureEngine.close()
    blockGestureEngine = null
  }
  if (faceEngine) {
    faceEngine.close()
    faceEngine = null
  }
})
</script>

<style scoped>
.freebuild-page {
  position: fixed;
  inset: 0;
  z-index: 80;
  overflow: hidden;
  color: #263650;
  background: #f5ead0;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
}

.freebuild-page *,
.freebuild-page *::before,
.freebuild-page *::after {
  box-sizing: border-box;
}

button { font: inherit; }

.freebuild-canvas,
.hidden-video { position: absolute; inset: 0; }

.freebuild-canvas { width: 100%; height: 100%; }

.hidden-video {
  opacity: 0;
  pointer-events: none;
}

.freebuild-topbar,
.left-console,
.right-console,
.bottom-dock {
  position: absolute;
  z-index: 3;
}

.freebuild-topbar {
  left: 24px;
  right: 24px;
  top: 18px;
  display: grid;
  grid-template-columns: minmax(360px, 1fr) auto auto;
  gap: 14px;
  align-items: center;
}

.brand-card,
.view-tabs,
.top-actions,
.left-console,
.right-console,
.bottom-dock,
.panel-card,
.guide-card,
.privacy-card,
.status-list article,
.dock-stat,
.dock-message {
  background: rgba(255, 250, 235, .74);
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: 0 18px 46px rgba(70, 55, 30, .12);
}
@supports (-webkit-backdrop-filter: blur(1px)) {
  .brand-card,
  .view-tabs,
  .top-actions,
  .left-console,
  .right-console,
  .bottom-dock,
  .panel-card,
  .guide-card,
  .privacy-card,
  .status-list article,
  .dock-stat,
  .dock-message {
    -webkit-backdrop-filter: blur(18px);
  }
}
@supports (-moz-appearance: none) and (backdrop-filter: blur(1px)) {
  .brand-card,
  .view-tabs,
  .top-actions,
  .left-console,
  .right-console,
  .bottom-dock,
  .panel-card,
  .guide-card,
  .privacy-card,
  .status-list article,
  .dock-stat,
  .dock-message {
    backdrop-filter: blur(18px);
  }
}


.brand-card {
  backdrop-filter: blur(18px);
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 74px;
  padding: 10px 16px;
  border-radius: 24px;
}

.brand-card img {
  width: 54px;
  height: 54px;
  object-fit: contain;
}

.brand-card small,
.brand-card strong,
.brand-card span { display: block; }

.brand-card small {
  color: #b77945;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.brand-card strong {
  margin-top: 2px;
  color: #263650;
  font-size: 21px;
  font-weight: 950;
}

.brand-card span {
  color: #667370;
  font-size: 12px;
  font-weight: 850;
}

.view-tabs,
.top-actions {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 999px;
}

.view-tabs button,
.glass-button,
.dark-button {
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.view-tabs button,
.glass-button {
  color: #263650;
  background: rgba(255,255,255,.76);
}

.view-tabs button.active,
.dark-button {
  color: #fff8e8;
  background: #263650;
}

.left-console {
  left: 24px;
  top: 116px;
  bottom: 96px;
  width: min(330px, 22vw);
  border-radius: 30px;
  padding: 14px;
  display: grid;
  gap: 10px;
  align-content: start;
  overflow-y: auto;
  scrollbar-width: thin;
}

.guide-card,
.panel-card {
  border-radius: 24px;
  padding: 15px;
}

.pill {
  display: inline-flex;
  padding: 6px 11px;
  border-radius: 999px;
  color: #a86e33;
  background: rgba(255, 248, 226, .88);
  border: 1px solid rgba(183, 142, 78, .20);
  font-size: 12px;
  font-weight: 950;
}

.guide-card h1 {
  margin: 12px 0 7px;
  color: #263650;
  font-size: clamp(25px, 2vw, 36px);
  line-height: 1.02;
  letter-spacing: -.06em;
}

.guide-card p,
.panel-card p {
  margin: 0;
  color: #607171;
  line-height: 1.55;
  font-weight: 850;
  font-size: 13px;
}

.free-mode-banner {
  margin-top: 12px;
  padding: 11px 13px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255, 243, 200, .92), rgba(231, 247, 245, .82));
  border: 1px solid rgba(183, 142, 78, .18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.62);
}

.free-mode-banner strong,
.free-mode-banner span { display: block; }

.free-mode-banner strong {
  color: #263650;
  font-size: 14px;
  font-weight: 950;
}

.free-mode-banner span {
  margin-top: 4px;
  color: #667370;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.45;
}

.gesture-steps {
  margin-top: 11px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}

.gesture-steps span {
  padding: 8px 5px;
  border-radius: 15px;
  text-align: center;
  color: #263650;
  font-size: 11px;
  font-weight: 950;
  background: rgba(255,255,255,.60);
}

.panel-card b {
  display: block;
  margin-bottom: 9px;
  color: #263650;
  font-size: 17px;
}

.difficulty-switch.compact {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 9px;
  margin-bottom: 9px;
}

.difficulty-switch button {
  border: 0;
  border-radius: 16px;
  padding: 10px 6px;
  color: #7a623a;
  background: rgba(255,247,224,.86);
  box-shadow: inset 0 0 0 1px rgba(183,142,78,.14);
  cursor: pointer;
}

.difficulty-switch button.active {
  color: #263650;
  background: linear-gradient(135deg, #f0b66a, #f6d98b);
}

.difficulty-switch strong,
.difficulty-switch span { display: block; }

.difficulty-switch span {
  margin-top: 3px;
  font-size: 10.5px;
  font-weight: 900;
}

.physics-label-strip {
  margin: 8px 0 8px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.physics-label-strip span {
  padding: 7px 10px;
  border-radius: 999px;
  text-align: center;
  color: #6e744f;
  font-size: 11px;
  font-weight: 950;
  background: rgba(236, 247, 218, .72);
  border: 1px solid rgba(139, 174, 122, .20);
}

.compact-copy p { font-size: 12.5px; }

.button-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.park-button {
  border: 0;
  border-radius: 999px;
  min-height: 42px;
  padding: 10px 12px;
  color: #fff8e8;
  background: linear-gradient(135deg, #efb05f, #e99972);
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(178,109,48,.18);
}

.park-button.soft,
.park-button.ghost {
  color: #263650;
  background: rgba(255,255,255,.78);
  box-shadow: inset 0 0 0 1px rgba(183,142,78,.16);
}

.park-button:disabled {
  opacity: .48;
  cursor: not-allowed;
}

.right-console {
  right: 24px;
  top: 116px;
  width: min(292px, 20vw);
  display: grid;
  gap: 10px;
  background: transparent;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
}

.privacy-card {
  border-radius: 30px;
  padding: 15px;
}

.privacy-head b,
.privacy-head span { display: block; }

.privacy-head b {
  color: #263650;
  font-size: 21px;
}

.privacy-head span {
  margin-top: 3px;
  color: #667370;
  font-size: 13px;
  font-weight: 850;
}

.privacy-canvas {
  margin-top: 12px;
  width: 100%;
  height: clamp(165px, 20vh, 225px);
  border-radius: 24px;
  overflow: hidden;
  background: #17243a;
}

.status-list {
  display: grid;
  gap: 9px;
}

.status-list article {
  padding: 12px 14px;
  border-radius: 20px;
}

.status-list article.good {
  box-shadow: inset 0 0 0 2px rgba(124,190,139,.20), 0 18px 46px rgba(70,55,30,.12);
}

.status-list b,
.status-list span { display: block; }

.status-list b {
  color: #263650;
  font-size: 16px;
}

.status-list span {
  margin-top: 4px;
  color: #657473;
  font-size: 12.5px;
  line-height: 1.42;
  font-weight: 850;
}

.bottom-dock {
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  width: min(720px, calc(100vw - 760px));
  min-width: 560px;
  border-radius: 30px;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(3, 88px) 1fr;
  gap: 9px;
  align-items: stretch;
}

.dock-stat,
.dock-message {
  border-radius: 20px;
  padding: 10px 12px;
  box-shadow: none;
}

.dock-stat { text-align: center; }

.dock-stat small,
.dock-stat strong,
.dock-message b,
.dock-message span { display: block; }

.dock-stat small {
  color: #667370;
  font-size: 11px;
  font-weight: 850;
}

.dock-stat strong {
  margin-top: 3px;
  color: #263650;
  font-size: 24px;
  font-weight: 950;
}

.dock-message b {
  color: #263650;
  font-size: 17px;
}

.dock-message span {
  margin-top: 4px;
  color: #657473;
  font-size: 12.5px;
  line-height: 1.42;
  font-weight: 850;
}

@media (max-width: 1380px) {
  .freebuild-topbar { grid-template-columns: 1fr auto; }
  .top-actions { grid-column: 2; }
  .left-console { width: 310px; }
  .right-console { width: 270px; }
  .bottom-dock {
    width: min(640px, calc(100vw - 660px));
    min-width: 500px;
  }
}

@media (max-width: 1080px) {
  .freebuild-topbar {
    left: 14px;
    right: 14px;
    top: 12px;
    grid-template-columns: 1fr;
  }

  .view-tabs,
  .top-actions { display: none; }

  .left-console {
    left: 14px;
    top: 98px;
    width: 292px;
    bottom: 92px;
  }

  .right-console { display: none; }

  .bottom-dock {
    left: 320px;
    right: 14px;
    transform: none;
    width: auto;
    min-width: 0;
    grid-template-columns: repeat(3, 76px) 1fr;
  }
}
</style>

