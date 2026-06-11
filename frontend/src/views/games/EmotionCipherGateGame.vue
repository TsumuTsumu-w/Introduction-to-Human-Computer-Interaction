<template>
  <main class="cipher-game-page" aria-label="星语密门">
    <section class="cipher-stage">
      <img :src="plaza" alt="" class="cipher-bg asset-img" />
      <div class="cipher-mask"></div>

      <header class="cipher-header content-layer">
        <div>
          <p class="section-kicker">{{ game.play.kicker }}</p>
          <h1 class="section-title">{{ game.name }}</h1>
          <p class="section-copy">{{ game.play.intro }}</p>
        </div>

        <aside class="score-pass">
          <small>Score</small>
          <strong>{{ cipherState.score }}</strong>
          <span>{{ cipherState.currentIndex }} / {{ cipherState.locks.length }} 锁</span>
        </aside>
      </header>

      <div class="cipher-layout content-layer">
        <aside class="cipher-panel">
          <div class="lock-list">
            <article v-for="(lock, index) in cipherState.locks" :key="lock.id" class="lock-card" :class="{ done: lock.done, current: index === cipherState.currentIndex && cipherState.phase !== 'done' }">
              <span>{{ index + 1 }}</span>
              <div>
                <b>{{ lock.label }}</b>
                <small>{{ lock.hint }}</small>
              </div>
              <em>{{ lock.done ? '已点亮' : index === cipherState.currentIndex ? '当前目标' : '等待中' }}</em>
            </article>
          </div>

          <div class="cipher-readout">
            <b>当前识别</b>
            <span>{{ cipherState.recognizedExpression }}</span>
            <small>{{ faceStatus }}</small>
          </div>

          <div class="cipher-readout">
            <b>设备状态</b>
            <span>{{ cameraStatus }}</span>
            <small>{{ game.play.idleHint }}</small>
          </div>

          <div class="action-row">
            <button class="park-button" type="button" @click="requestCamera">
              {{ cameraRunning ? '重新申请摄像头' : '申请摄像头' }}
            </button>
            <button class="park-button soft" type="button" @click="startRound">{{ game.play.startLabel }}</button>
            <button class="park-button ghost" type="button" @click="resetRound">{{ game.play.resetLabel }}</button>
          </div>

          <div class="manual-row">
            <button class="park-button ghost" type="button" @click="sendExpression('smile')">我在微笑</button>
            <button class="park-button ghost" type="button" @click="sendExpression('blow')">我在吹气</button>
          </div>
        </aside>

        <section class="cipher-camera-shell">
          <div class="cipher-camera-frame">
            <video ref="videoRef" class="cipher-video" autoplay playsinline muted></video>
            <div class="cipher-camera-overlay">
              <div>
                <small>{{ phaseTitle }}</small>
                <strong>{{ cipherState.feedback }}</strong>
              </div>
              <span>合成口令长度 {{ cipherState.expectedCode.length }} 位</span>
            </div>
          </div>

          <div v-if="cipherState.phase === 'typing'" class="cipher-code-box">
            <div>
              <b>输入合成口令</b>
              <span>按三道门锁的顺序拼出字符。你也可以直接按回车提交。</span>
            </div>
            <div class="code-row">
              <input ref="codeInputRef" v-model.trim="typedCode" type="text" autocomplete="off" spellcheck="false" placeholder="例如 SBS" @keyup.enter="submitCode" />
              <button class="park-button" type="button" @click="submitCode">{{ game.play.finishLabel }}</button>
            </div>
          </div>

          <div class="cipher-note">
            <b>门锁提示</b>
            <span>{{ cipherState.codeHint }}</span>
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
import { createFaceExpressionEngine } from '../../utils/sensory/simpleFaceExpressionEngine'
import { applyEmotionCipherExpression, createEmotionCipherState, resetEmotionCipherState, startEmotionCipherState, submitEmotionCipherCode } from '../../games/emotionCipherGateLogic'
import plaza from '../../assets/park-scenes/plaza.png'

const game = findGame('emotion-cipher-gate')
const cipherState = ref(createEmotionCipherState())
const typedCode = ref('')
const videoRef = ref(null)
const codeInputRef = ref(null)
const cameraRunning = ref(false)
const cameraStatus = ref('未申请')
const faceStatus = ref('等待镜头')

let faceEngine = null
let stream = null
let rafId = 0
let processing = false

const phaseTitle = computed(() => {
  if (cipherState.value.phase === 'done') return game.play.doneTitle
  if (cipherState.value.phase === 'typing') return '输入合成口令'
  if (cipherState.value.phase === 'active') return game.play.activeTitle
  return game.play.idleTitle
})

onMounted(() => {
  startLoop()
})

function startLoop() {
  cancelAnimationFrame(rafId)
  const loop = async () => {
    if (cameraRunning.value && videoRef.value?.readyState >= 2 && faceEngine && !processing) {
      processing = true
      try {
        const detection = faceEngine.recognize(videoRef.value, performance.now())
        faceStatus.value = detection.smile
          ? '识别到微笑'
          : detection.blow
            ? '识别到吹气'
            : detection.hasFace
              ? '检测到人脸'
              : '等待人脸'
        cipherState.value = applyEmotionCipherExpression(cipherState.value, detection, Date.now())
      } catch (error) {
        faceStatus.value = '表情识别暂时不可用'
        cipherState.value = { ...cipherState.value, feedback: error?.message || '表情识别暂时不可用。' }
      } finally {
        processing = false
      }
    }

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
    if (!faceEngine) {
      try {
        faceEngine = await createFaceExpressionEngine()
      } catch (error) {
        faceEngine = null
        faceStatus.value = error?.message || '表情识别模型加载失败'
      }
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
    faceStatus.value = faceEngine ? '表情识别已就绪' : '摄像头可用，表情识别暂不可用'
  } catch (error) {
    cameraStatus.value = error?.message || '摄像头申请失败'
    cameraRunning.value = false
  }
}

function startRound() {
  cipherState.value = startEmotionCipherState(cipherState.value, Date.now())
  if (cipherState.value.phase === 'typing') {
    nextTick(() => codeInputRef.value?.focus())
  }
}

async function submitCode() {
  cipherState.value = submitEmotionCipherCode(cipherState.value, typedCode.value, Date.now())

  if (cipherState.value.phase === 'done' && !cipherState.value.recorded) {
    await saveCipherRecord()
  }

  if (cipherState.value.phase === 'typing') {
    nextTick(() => codeInputRef.value?.focus())
  }
}

function sendExpression(kind) {
  const detection = {
    smile: kind === 'smile',
    blow: kind === 'blow',
    hasFace: true,
    source: '手动按钮'
  }
  cipherState.value = applyEmotionCipherExpression(cipherState.value, detection, Date.now())

  if (cipherState.value.phase === 'typing') {
    nextTick(() => codeInputRef.value?.focus())
  }
}

async function saveCipherRecord() {
  cipherState.value = { ...cipherState.value, recorded: true }
  await saveGameRecord(game, {
    action: `${game.stamp} · ${cipherState.value.expectedCode}`,
    score: cipherState.value.score,
    rounds: cipherState.value.currentIndex,
    durationMs: cipherState.value.completedAt ? cipherState.value.completedAt - cipherState.value.roundStartedAt : 0,
    result: 'complete'
  })
}

function resetRound() {
  typedCode.value = ''
  cipherState.value = resetEmotionCipherState(cameraRunning.value)
}

function stopCamera(updateText = true) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  cameraRunning.value = false
  if (updateText) {
    cameraStatus.value = '未申请'
    faceStatus.value = '等待镜头'
  }
}

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  stopCamera(false)
  if (faceEngine) {
    faceEngine.close()
    faceEngine = null
  }
})
</script>

<style scoped>
.cipher-game-page {
  min-height: 100%;
}

.cipher-stage {
  position: relative;
  min-height: 760px;
  overflow: hidden;
  border-radius: 44px;
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: var(--shadow);
  background: linear-gradient(135deg, rgba(255, 247, 231, .96), rgba(232, 245, 244, .86));
}

.cipher-bg,
.cipher-mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.cipher-bg {
  object-fit: cover;
  opacity: .52;
}

.cipher-mask {
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 255, 255, .88), transparent 28%),
    linear-gradient(90deg, rgba(255, 251, 241, .94), rgba(255, 251, 241, .52) 46%, rgba(233, 246, 245, .80));
}

.cipher-header,
.cipher-layout {
  position: relative;
  z-index: 1;
}

.cipher-header {
  padding: clamp(30px, 5vw, 58px) clamp(26px, 4vw, 44px) 20px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.cipher-layout {
  padding: 0 clamp(26px, 4vw, 44px) clamp(28px, 4vw, 42px);
  display: grid;
  grid-template-columns: minmax(320px, .88fr) minmax(0, 1.12fr);
  gap: 20px;
}

.cipher-panel,
.cipher-camera-shell {
  background: rgba(255, 250, 235, .70);
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: 0 18px 46px rgba(70, 55, 30, .12);
  border-radius: 28px;
}
@supports (-webkit-backdrop-filter: blur(1px)) {
  .cipher-panel,
  .cipher-camera-shell {
    -webkit-backdrop-filter: blur(18px);
  }
}
@supports (-moz-appearance: none) and (backdrop-filter: blur(1px)) {
  .cipher-panel,
  .cipher-camera-shell {
    backdrop-filter: blur(18px);
  }
}

.cipher-panel {
  padding: 18px;
}

.lock-list {
  display: grid;
  gap: 12px;
}

.lock-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: rgba(255, 255, 255, .64);
  border: 1px solid rgba(183, 142, 78, .18);
}

.lock-card span {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 238, 187, .78);
  color: #b77945;
  font-weight: 950;
}

.lock-card b,
.lock-card small,
.lock-card em {
  display: block;
}

.lock-card b {
  color: var(--ink);
  font-size: 18px;
}

.lock-card small,
.lock-card em {
  color: #6a7a78;
  font-size: 12px;
}

.lock-card.current {
  border-color: rgba(122, 175, 154, .40);
  background: rgba(235, 252, 246, .86);
}

.lock-card.done {
  background: rgba(244, 255, 232, .92);
  border-color: rgba(120, 186, 92, .36);
}

.cipher-readout {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, .64);
  border: 1px solid rgba(183, 142, 78, .18);
}

.cipher-readout b,
.cipher-readout span,
.cipher-readout small {
  display: block;
}

.cipher-readout b {
  color: #9a6b36;
  font-size: 12px;
}

.cipher-readout span {
  margin-top: 4px;
  color: var(--ink);
  font-size: 18px;
  font-weight: 900;
}

.cipher-readout small {
  margin-top: 6px;
  color: #6f807e;
}

.action-row,
.manual-row {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.cipher-camera-shell {
  padding: 18px;
}

.cipher-camera-frame {
  position: relative;
  min-height: 500px;
  overflow: hidden;
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(35, 47, 63, .95), rgba(17, 26, 37, .92));
  border: 1px solid rgba(183, 142, 78, .20);
}

.cipher-video {
  width: 100%;
  height: 100%;
  min-height: 500px;
  object-fit: cover;
  transform: scaleX(-1);
}

.cipher-camera-overlay {
  position: absolute;
  inset: auto 18px 18px 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(255, 250, 235, .74);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.cipher-camera-overlay small,
.cipher-camera-overlay strong,
.cipher-camera-overlay span {
  display: block;
}

.cipher-camera-overlay small {
  color: #b77945;
  font-weight: 950;
}

.cipher-camera-overlay strong {
  color: var(--ink);
  font-size: 19px;
}

.cipher-camera-overlay span {
  color: #697a78;
  font-size: 12px;
}

.cipher-code-box {
  margin-top: 14px;
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, .66);
  border: 1px solid rgba(183, 142, 78, .18);
}

.cipher-code-box b,
.cipher-code-box span {
  display: block;
}

.cipher-code-box b {
  color: var(--ink);
  font-size: 18px;
}

.cipher-code-box span {
  margin-top: 5px;
  color: #6a7a78;
  line-height: 1.6;
}

.code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.code-row input {
  width: 100%;
  border: 1px solid rgba(183, 142, 78, .24);
  border-radius: 18px;
  padding: 0 16px;
  min-height: 48px;
  background: rgba(255,255,255,.86);
  color: var(--ink);
  font-size: 18px;
  font-weight: 800;
  outline: none;
}

.cipher-note {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, .64);
  border: 1px solid rgba(183, 142, 78, .18);
}

.cipher-note b,
.cipher-note span {
  display: block;
}

.cipher-note b {
  color: #9a6b36;
  font-size: 12px;
}

.cipher-note span {
  margin-top: 5px;
  color: #6a7a78;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .cipher-layout,
  .cipher-header {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}

@media (max-width: 900px) {
  .cipher-layout {
    grid-template-columns: 1fr;
  }

  .code-row {
    grid-template-columns: 1fr;
  }
}
</style>
