<template>
  <main class="paper-synth-page" aria-label="彩纸合成器">
    <section class="paper-synth-stage">
      <img :src="plaza" alt="" class="paper-synth-bg asset-img" />
      <div class="paper-synth-mask"></div>

      <header class="paper-synth-header content-layer">
        <p class="section-kicker">{{ game.play.kicker }}</p>
        <h1 class="section-title">{{ game.name }}</h1>
        <p class="section-copy">{{ game.play.intro }}</p>
      </header>

      <div class="paper-synth-layout content-layer">
        <section class="camera-panel">
          <div ref="cameraFrameRef" class="synth-camera-frame">
            <video ref="videoRef" class="synth-video" autoplay playsinline muted></video>

            <div v-if="!cameraRunning" class="camera-placeholder">
              <small>{{ game.play.idleTitle }}</small>
              <strong>{{ cameraStatus }}</strong>
            </div>

            <div class="binding-overlay">
              <article
                v-for="slot in boundSlots"
                :key="slot.id"
                class="binding-box"
                :class="{ selected: slot.id === selectedSlotId }"
                :style="boxStyle(slot)"
              >
                <span>{{ slot.label }}</span>
              </article>

              <span
                v-if="fingerTip"
                class="finger-tip"
                :style="{ left: `${fingerTip.x * 100}%`, top: `${fingerTip.y * 100}%` }"
              ></span>
            </div>
          </div>

          <div class="camera-actions">
            <button class="park-button" type="button" @click="requestCamera">
              {{ cameraRunning ? '重新申请摄像头' : '申请摄像头' }}
            </button>
            <button
              class="park-button ghost stamp-button"
              :class="{ ready: canStamp }"
              type="button"
              :disabled="!canStamp"
              @click="stampNotebook"
            >
              手账盖章
            </button>
          </div>

          <label class="volume-control">
            <span>输出音量</span>
            <input v-model.number="masterVolume" type="range" min="0" max="100" step="1" aria-label="输出音量" />
            <b>{{ masterVolume }}%</b>
          </label>

          <div class="camera-readout">
            <span>{{ cameraStatus }}</span>
            <small>已绑定 {{ boundCount }} 个音色 · 演奏触发 {{ triggerCount }} 次 · {{ playStatus }}</small>
          </div>
        </section>

        <aside class="sound-panel">
          <section class="sound-list-section">
            <h2>音色列表</h2>
            <p>采样：选择一个音色后按取色，拖到画面中物体的亮色区域，松开应用</p>

            <div class="sound-list">
              <button
                v-for="slot in soundSlots"
                :key="slot.id"
                class="sound-card"
                :class="{ selected: slot.id === selectedSlotId, inactive: !slot.binding }"
                type="button"
                @click="selectSlot(slot.id)"
              >
                <span class="sound-swatch-ring">
                  <i :style="{ backgroundColor: slot.binding?.hex || '#f5f5f5' }"></i>
                </span>
                <span class="sound-name">
                  <b>{{ slot.label }}</b>
                  <small>{{ slot.family }}</small>
                </span>
                <em>{{ slot.binding ? '已应用' : '未应用' }}</em>
              </button>
            </div>
          </section>

          <section class="current-sound">
            <div class="current-title-row">
              <div class="current-title">
                <b>{{ selectedSlot.label }}</b>
                <small>{{ selectedSlot.family }}</small>
              </div>
              <button class="mini-reset" type="button" @click="resetSelectedSlot">重置</button>
            </div>

            <button
              class="sample-button"
              :class="{ active: samplingActive }"
              type="button"
              :disabled="!cameraRunning"
              @pointerdown.prevent="beginSampling"
            >
              {{ samplingActive ? '正在取色，拖动至物体亮色区域' : '取色并预览' }}
            </button>

            <div class="color-detail">
              <span class="detail-swatch-ring">
                <i :style="{ backgroundColor: detailColor }"></i>
              </span>
              <div>
                <b>{{ detailHsvText }}</b>
                <small>{{ detailMetaText }}</small>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  </main>
</template>

<script setup>
import * as Tone from 'tone'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { findGame } from '../../data/games'
import { saveGameRecord } from '../../games/gameRecords'
import { createGestureEngine } from '../../utils/gesture/mediapipeGestureEngine'
import plaza from '../../assets/park-scenes/plaza.png'

const game = findGame('color-paper-synth')

const soundSlots = ref([
  createSlot('piano-c', 'C3', '电子琴', 'C3'),
  createSlot('piano-d', 'D3', '电子琴', 'D3'),
  createSlot('piano-e', 'E3', '电子琴', 'E3'),
  createSlot('piano-f', 'F3', '电子琴', 'F3'),
  createSlot('piano-g', 'G3', '电子琴', 'G3'),
  createSlot('piano-a', 'A3', '电子琴', 'A3'),
  createSlot('piano-b', 'B3', '电子琴', 'B3'),
  createSlot('drum-kick', 'Drum', '低音鼓', 'kick')
])

const selectedSlotId = ref('piano-c')
const videoRef = ref(null)
const cameraFrameRef = ref(null)
const cameraRunning = ref(false)
const cameraStatus = ref('未申请摄像头')
const samplingActive = ref(false)
const liveSample = ref(null)
const triggerCount = ref(0)
const stampCooling = ref(false)
const fingerTip = ref(null)
const playStatus = ref('等待演奏')
const masterVolume = ref(92)

let stream = null
let sampleCanvas = null
let lastStampAt = 0
let gestureEngine = null
let rafId = 0
let processingGesture = false
let pianoSynth = null
let kickSynth = null
let audioReady = false
const activeSlots = new Set()
const lastPlayedAt = new Map()
const NOTE_COOLDOWN_MS = 260

const selectedSlot = computed(() => soundSlots.value.find((slot) => slot.id === selectedSlotId.value) || soundSlots.value[0])
const boundSlots = computed(() => soundSlots.value.filter((slot) => slot.binding))
const boundCount = computed(() => boundSlots.value.length)
const canStamp = computed(() => boundCount.value > 0 && triggerCount.value > 0 && !stampCooling.value)

const detailSample = computed(() => {
  if (samplingActive.value) return liveSample.value
  return selectedSlot.value.binding || null
})

const detailColor = computed(() => {
  if (samplingActive.value) return selectedSlot.value.binding?.hex || '#f5f5f5'
  return selectedSlot.value.binding?.hex || '#f5f5f5'
})

const detailHsvText = computed(() => {
  const sample = detailSample.value
  if (!sample) return 'H — / S — / V —'
  return `H ${sample.hsv.h} / S ${sample.hsv.s.toFixed(2)} / V ${sample.hsv.v.toFixed(2)}`
})

const detailMetaText = computed(() => {
  if (samplingActive.value) {
    return liveSample.value ? `${liveSample.pixelText} · 松开应用` : '拖到摄像头画面中的亮色区域'
  }
  if (!selectedSlot.value.binding) return '等待取色'
  return `${selectedSlot.value.binding.pixelText} · rule: H ±24 · S ±0.28 · V ±0.30`
})

function createSlot(id, label, family, note) {
  return {
    id,
    label,
    family,
    note,
    binding: null
  }
}

function selectSlot(id) {
  selectedSlotId.value = id
}

async function requestCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.value = '当前浏览器不支持摄像头'
    return
  }

  try {
    cameraStatus.value = '正在申请摄像头'
    await ensureAudioReady()
    await nextTick()
    stopCamera(false)
    if (!gestureEngine) {
      gestureEngine = await createGestureEngine()
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false
    })
    videoRef.value.srcObject = stream
    await videoRef.value.play()
    cameraRunning.value = true
    cameraStatus.value = audioReady ? '摄像头已开启 · 音频已就绪' : '摄像头已开启'
  } catch (error) {
    cameraRunning.value = false
    cameraStatus.value = error?.message || '摄像头申请失败'
  }
}

function startGestureLoop() {
  cancelAnimationFrame(rafId)

  const loop = async () => {
    if (cameraRunning.value && videoRef.value?.readyState >= 2 && gestureEngine && !processingGesture) {
      processingGesture = true
      try {
        const frame = gestureEngine.recognize(videoRef.value, performance.now())
        updateFingerTrigger(frame)
      } catch (error) {
        playStatus.value = error?.message || '手指识别暂时不可用'
      } finally {
        processingGesture = false
      }
    }

    rafId = requestAnimationFrame(loop)
  }

  rafId = requestAnimationFrame(loop)
}

function updateFingerTrigger(frame) {
  const tip = frame?.hasHand ? frame.landmarks?.[8] : null
  if (!tip) {
    fingerTip.value = null
    activeSlots.clear()
    playStatus.value = '等待食指入镜'
    return
  }

  fingerTip.value = { x: clamp01(tip.x), y: clamp01(tip.y) }

  if (samplingActive.value) {
    playStatus.value = '正在取色'
    return
  }

  const touching = new Set()
  const now = performance.now()

  for (const slot of boundSlots.value) {
    if (!pointInBox(fingerTip.value, slot.binding.box)) continue
    touching.add(slot.id)

    const wasInside = activeSlots.has(slot.id)
    const lastPlayed = lastPlayedAt.get(slot.id) || 0
    if (!wasInside && now - lastPlayed >= NOTE_COOLDOWN_MS) {
      playSlot(slot)
      lastPlayedAt.set(slot.id, now)
    }
  }

  activeSlots.clear()
  touching.forEach((id) => activeSlots.add(id))

  if (!touching.size) {
    playStatus.value = boundCount.value ? '移动食指进入色块框' : '先绑定音色'
  }
}

function beginSampling(event) {
  if (!cameraRunning.value || event.button !== 0) return
  samplingActive.value = true
  liveSample.value = null
  window.addEventListener('pointermove', updateSamplingPreview)
  window.addEventListener('pointerup', finishSampling, { once: true })
}

function updateSamplingPreview(event) {
  if (!samplingActive.value) return
  liveSample.value = sampleFromPointer(event)
}

function finishSampling(event) {
  window.removeEventListener('pointermove', updateSamplingPreview)
  if (!samplingActive.value) return

  const sample = sampleFromPointer(event)
  if (sample) {
    selectedSlot.value.binding = sample
    liveSample.value = sample
  }

  samplingActive.value = false
  liveSample.value = null
}

function sampleFromPointer(event) {
  const video = videoRef.value
  const frame = cameraFrameRef.value
  if (!video || !frame || video.readyState < 2) return null

  const rect = frame.getBoundingClientRect()
  const nx = (event.clientX - rect.left) / rect.width
  const ny = (event.clientY - rect.top) / rect.height
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null

  const canvas = ensureSampleCanvas(video)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  const sourceX = clamp(Math.round((1 - nx) * (canvas.width - 1)), 0, canvas.width - 1)
  const sourceY = clamp(Math.round(ny * (canvas.height - 1)), 0, canvas.height - 1)
  const color = averageColorAt(ctx, sourceX, sourceY, canvas.width, canvas.height, 5)
  const hsv = rgbToHsv(color.r, color.g, color.b)
  const box = findColorRegionBox(ctx, canvas.width, canvas.height, sourceX, sourceY, hsv)

  return {
    hex: rgbToHex(color.r, color.g, color.b),
    rgb: color,
    hsv,
    box,
    pixelText: `${Math.round(nx * rect.width)} px`
  }
}

function ensureSampleCanvas(video) {
  if (!sampleCanvas) sampleCanvas = document.createElement('canvas')
  const ratio = video.videoHeight && video.videoWidth ? video.videoHeight / video.videoWidth : 0.75
  sampleCanvas.width = 320
  sampleCanvas.height = Math.max(180, Math.round(sampleCanvas.width * ratio))
  return sampleCanvas
}

function averageColorAt(ctx, x, y, width, height, radius) {
  const left = clamp(x - radius, 0, width - 1)
  const top = clamp(y - radius, 0, height - 1)
  const right = clamp(x + radius, 0, width - 1)
  const bottom = clamp(y + radius, 0, height - 1)
  const data = ctx.getImageData(left, top, right - left + 1, bottom - top + 1).data
  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count += 1
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  }
}

function findColorRegionBox(ctx, width, height, seedX, seedY, targetHsv) {
  const data = ctx.getImageData(0, 0, width, height).data
  const visited = new Uint8Array(width * height)
  const stack = [[seedX, seedY]]
  let minX = seedX
  let maxX = seedX
  let minY = seedY
  let maxY = seedY
  let area = 0

  while (stack.length) {
    const [x, y] = stack.pop()
    if (x < 0 || y < 0 || x >= width || y >= height) continue

    const index = y * width + x
    if (visited[index]) continue
    visited[index] = 1

    const offset = index * 4
    const hsv = rgbToHsv(data[offset], data[offset + 1], data[offset + 2])
    if (!isSimilarHsv(hsv, targetHsv)) continue

    area += 1
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)

    stack.push([x + 1, y])
    stack.push([x - 1, y])
    stack.push([x, y + 1])
    stack.push([x, y - 1])
  }

  if (area < 36 || area > width * height * 0.48) {
    minX = clamp(seedX - 18, 0, width - 1)
    maxX = clamp(seedX + 18, 0, width - 1)
    minY = clamp(seedY - 18, 0, height - 1)
    maxY = clamp(seedY + 18, 0, height - 1)
  } else {
    minX = clamp(minX - 8, 0, width - 1)
    maxX = clamp(maxX + 8, 0, width - 1)
    minY = clamp(minY - 8, 0, height - 1)
    maxY = clamp(maxY + 8, 0, height - 1)
  }

  const displayLeft = 1 - ((maxX + 1) / width)
  const displayRight = 1 - (minX / width)

  return {
    left: clamp01(displayLeft),
    top: clamp01(minY / height),
    width: clamp01(displayRight - displayLeft),
    height: clamp01((maxY - minY + 1) / height)
  }
}

function isSimilarHsv(current, target) {
  return hueDistance(current.h, target.h) <= 24
    && Math.abs(current.s - target.s) <= 0.28
    && Math.abs(current.v - target.v) <= 0.30
    && current.v >= Math.max(0.12, target.v - 0.30)
}

function resetSelectedSlot() {
  selectedSlot.value.binding = null
  activeSlots.delete(selectedSlot.value.id)
  lastPlayedAt.delete(selectedSlot.value.id)
}

async function stampNotebook() {
  const now = Date.now()
  if (!canStamp.value || now - lastStampAt < 700) return

  lastStampAt = now
  stampCooling.value = true
  await saveGameRecord(game, {
    action: `${game.stamp} · 已绑定${boundCount.value}个音色 · 演奏${triggerCount.value}次`,
    rounds: boundCount.value,
    result: 'paper-synth-stamped'
  })
  window.setTimeout(() => {
    stampCooling.value = false
  }, 700)
}

function boxStyle(slot) {
  const box = slot.binding?.box
  return {
    left: `${(box?.left || 0) * 100}%`,
    top: `${(box?.top || 0) * 100}%`,
    width: `${(box?.width || 0) * 100}%`,
    height: `${(box?.height || 0) * 100}%`,
    '--binding-color': slot.binding?.hex || '#f5f5f5'
  }
}

function stopCamera(updateText = true) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  cameraRunning.value = false
  fingerTip.value = null
  activeSlots.clear()
  if (updateText) cameraStatus.value = '未申请摄像头'
}

async function ensureAudioReady() {
  if (!pianoSynth) {
    pianoSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.008,
        decay: 0.18,
        sustain: 0.24,
        release: 0.42
      }
    }).toDestination()
  }

  if (!kickSynth) {
    kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 5.5,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.36,
        sustain: 0.01,
        release: 0.08
      }
    }).toDestination()
  }

  applyOutputVolume()

  try {
    await Tone.start()
    audioReady = true
  } catch {
    audioReady = false
  }
}

function playSlot(slot) {
  if (!audioReady) {
    ensureAudioReady()
  }
  applyOutputVolume()

  if (slot.note === 'kick') {
    kickSynth?.triggerAttackRelease('C1', '8n')
  } else {
    pianoSynth?.triggerAttackRelease(slot.note, '8n')
  }

  triggerCount.value += 1
  playStatus.value = `触发 ${slot.label}`
}

function applyOutputVolume() {
  const baseDb = volumeToDb(masterVolume.value)
  if (pianoSynth) pianoSynth.volume.value = baseDb
  if (kickSynth) kickSynth.volume.value = Math.min(3, baseDb + 2)
}

function volumeToDb(value) {
  return -30 + (Number(value) / 100) * 30
}

function pointInBox(point, box) {
  if (!point || !box) return false
  return point.x >= box.left
    && point.x <= box.left + box.width
    && point.y >= box.top
    && point.y <= box.top + box.height
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

function rgbToHsv(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  let h = 0

  if (delta) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  return {
    h: Math.round(h),
    s: max ? delta / max : 0,
    v: max
  }
}

function hueDistance(a, b) {
  const diff = Math.abs(a - b)
  return Math.min(diff, 360 - diff)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function clamp01(value) {
  return clamp(value, 0, 1)
}

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('pointermove', updateSamplingPreview)
  stopCamera(false)
  if (gestureEngine) {
    gestureEngine.close()
    gestureEngine = null
  }
  if (pianoSynth) {
    pianoSynth.dispose()
    pianoSynth = null
  }
  if (kickSynth) {
    kickSynth.dispose()
    kickSynth = null
  }
})

onMounted(() => {
  startGestureLoop()
})

watch(masterVolume, () => {
  applyOutputVolume()
})
</script>

<style scoped>
.paper-synth-page {
  min-height: 100%;
}

.paper-synth-stage {
  position: relative;
  min-height: 740px;
  height: max(740px, calc(100vh - 48px));
  overflow: hidden;
  border-radius: 44px;
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: var(--shadow);
  background: linear-gradient(135deg, rgba(255, 247, 231, .96), rgba(232, 245, 244, .86));
}

.paper-synth-bg,
.paper-synth-mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.paper-synth-bg {
  object-fit: cover;
  opacity: .52;
}

.paper-synth-mask {
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 255, 255, .88), transparent 28%),
    linear-gradient(90deg, rgba(255, 251, 241, .94), rgba(255, 251, 241, .54) 46%, rgba(233, 246, 245, .80));
}

.paper-synth-header,
.paper-synth-layout {
  position: relative;
  z-index: 1;
}

.paper-synth-header {
  padding: clamp(26px, 4vw, 48px) clamp(26px, 4vw, 44px) 18px;
}

.paper-synth-header .section-copy {
  max-width: 760px;
}

.paper-synth-layout {
  padding: 0 clamp(26px, 4vw, 44px) clamp(26px, 4vw, 38px);
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(340px, .82fr);
  gap: 20px;
  height: calc(100% - 184px);
  min-height: 500px;
}

.camera-panel,
.sound-panel {
  background: rgba(255, 250, 235, .70);
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: 0 18px 46px rgba(70, 55, 30, .12);
  border-radius: 28px;
}

@supports (-webkit-backdrop-filter: blur(1px)) {
  .camera-panel,
  .sound-panel {
    -webkit-backdrop-filter: blur(18px);
  }
}

@supports (-moz-appearance: none) and (backdrop-filter: blur(1px)) {
  .camera-panel,
  .sound-panel {
    backdrop-filter: blur(18px);
  }
}

.camera-panel,
.sound-panel {
  min-height: 0;
}

.camera-panel {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto auto;
  gap: 14px;
  padding: 18px;
}

.synth-camera-frame {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(35, 47, 63, .95), rgba(17, 26, 37, .92));
  border: 1px solid rgba(183, 142, 78, .20);
}

.synth-video {
  width: 100%;
  height: 100%;
  min-height: 360px;
  object-fit: cover;
  transform: scaleX(-1);
}

.camera-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 8px;
  text-align: center;
  background: linear-gradient(180deg, rgba(35, 47, 63, .42), rgba(17, 26, 37, .58));
}

.camera-placeholder small,
.camera-placeholder strong {
  display: block;
}

.camera-placeholder small {
  color: rgba(255, 244, 212, .78);
  font-weight: 900;
}

.camera-placeholder strong {
  color: #fff8e8;
  font-size: 24px;
}

.binding-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.binding-box {
  position: absolute;
  min-width: 42px;
  min-height: 34px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  border: 3px solid color-mix(in srgb, var(--binding-color), white 18%);
  background: color-mix(in srgb, var(--binding-color), transparent 70%);
  box-shadow: 0 14px 30px rgba(20, 31, 43, .18);
}

.binding-box.selected {
  border-color: #f6d47c;
  box-shadow: 0 0 0 4px rgba(246, 212, 124, .24), 0 14px 30px rgba(20, 31, 43, .20);
}

.binding-box span {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 250, 235, .78);
  color: var(--ink);
  font-size: 12px;
  font-weight: 950;
}

.finger-tip {
  position: absolute;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 238, 154, .94);
  border: 3px solid rgba(35, 54, 80, .82);
  box-shadow: 0 0 0 6px rgba(255, 238, 154, .24), 0 12px 26px rgba(20, 31, 43, .26);
}

.camera-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.volume-control {
  display: grid;
  grid-template-columns: auto minmax(160px, 1fr) 48px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, .54);
  border: 1px solid rgba(183, 142, 78, .16);
}

.volume-control span,
.volume-control b {
  color: #667370;
  font-size: 13px;
  font-weight: 900;
}

.volume-control input {
  width: 100%;
  accent-color: #b77945;
}

.volume-control b {
  text-align: right;
  color: var(--ink);
}

.stamp-button {
  opacity: 0;
  pointer-events: none;
  transition: opacity .24s ease, transform .24s ease;
}

.stamp-button.ready {
  opacity: 1;
  pointer-events: auto;
}

.camera-readout {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, .54);
  border: 1px solid rgba(183, 142, 78, .16);
}

.camera-readout span,
.camera-readout small {
  color: #667370;
  font-weight: 800;
}

.sound-panel {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 14px;
  padding: 18px;
}

.sound-list-section {
  min-height: 0;
}

.sound-list-section h2 {
  margin: 0;
  color: var(--ink);
  font-size: 26px;
}

.sound-list-section p {
  margin: 8px 0 14px;
  color: #667370;
  line-height: 1.6;
  font-size: 13px;
  font-weight: 800;
}

.sound-list {
  display: grid;
  gap: 10px;
  max-height: calc(100% - 78px);
  overflow: auto;
  padding-right: 2px;
}

.sound-card {
  width: 100%;
  min-height: 66px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(183, 142, 78, .18);
  border-radius: 18px;
  background: rgba(255, 255, 255, .58);
  text-align: left;
  cursor: pointer;
  transition: background-color .2s ease, border-color .2s ease, opacity .2s ease, transform .2s ease;
}

.sound-card:hover {
  transform: translateY(-1px);
}

.sound-card.inactive {
  opacity: .70;
}

.sound-card.selected {
  opacity: 1;
  background-color: rgba(221, 245, 235, .76);
  border-color: rgba(67, 158, 135, .34);
}

.sound-card.selected .sound-name b {
  color: #23735f;
}

.sound-swatch-ring,
.detail-swatch-ring {
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid rgba(183, 142, 78, .24);
  background: rgba(255, 255, 255, .58);
}

.sound-swatch-ring {
  width: 34px;
  height: 34px;
}

.sound-swatch-ring i {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .08);
}

.sound-name b,
.sound-name small,
.sound-card em {
  display: block;
}

.sound-name b {
  color: var(--ink);
  font-size: 19px;
  line-height: 1.1;
  transition: color .22s ease;
}

.sound-name small,
.sound-card em {
  color: #6f807e;
  font-size: 12px;
  font-weight: 850;
}

.sound-card em {
  font-style: normal;
  white-space: nowrap;
}

.current-sound {
  padding: 14px;
  border-radius: 22px;
  background: rgba(255, 255, 255, .56);
  border: 1px solid rgba(183, 142, 78, .18);
}

.current-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.current-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.current-title b {
  color: var(--ink);
  font-size: 24px;
}

.current-title small {
  color: #667370;
  font-weight: 850;
}

.mini-reset {
  min-height: 36px;
  border: 1px solid rgba(183, 142, 78, .22);
  border-radius: 14px;
  padding: 0 14px;
  background: rgba(255, 250, 235, .82);
  color: #805c29;
  font-weight: 900;
  cursor: pointer;
}

.sample-button {
  width: 100%;
  min-height: 54px;
  margin-top: 12px;
  border: 1px solid rgba(183, 142, 78, .24);
  border-radius: 16px;
  background: rgba(255, 250, 235, .82);
  color: var(--ink);
  font-weight: 950;
  font-size: 16px;
  cursor: pointer;
  transition: background-color .2s ease, border-color .2s ease, color .2s ease;
}

.sample-button:disabled {
  cursor: not-allowed;
  opacity: .58;
}

.sample-button.active {
  background: rgba(196, 235, 217, .92);
  border-color: rgba(67, 158, 135, .36);
  color: #23735f;
}

.color-detail {
  margin-top: 12px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 250, 235, .52);
  border: 1px solid rgba(183, 142, 78, .14);
}

.detail-swatch-ring {
  width: 52px;
  height: 52px;
}

.detail-swatch-ring i {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .08);
}

.color-detail b,
.color-detail small {
  display: block;
}

.color-detail b {
  color: var(--ink);
  font-size: 16px;
}

.color-detail small {
  margin-top: 4px;
  color: #667370;
  line-height: 1.5;
}

@media (max-width: 1120px) {
  .paper-synth-stage {
    height: auto;
  }

  .paper-synth-layout {
    height: auto;
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .paper-synth-stage {
    border-radius: 30px;
  }

  .paper-synth-layout,
  .paper-synth-header {
    padding-left: 18px;
    padding-right: 18px;
  }

  .camera-readout,
  .volume-control,
  .current-title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .volume-control {
    grid-template-columns: 1fr;
  }
}
</style>
