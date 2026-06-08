
<template>
  <div class="page-field">
    <section v-if="isReactionGame" class="reaction-game">
      <img :src="plaza" alt="" class="reaction-bg asset-img" />
      <div class="reaction-filter"></div>
      <div class="park-orb orb-a"></div>
      <div class="park-orb orb-b"></div>
      <div class="park-orb orb-c"></div>

      <div class="reaction-header content-layer">
        <div class="title-block">
          <p class="section-kicker">Official Gesture Game</p>
          <h1 class="section-title">手势反应挑战</h1>
          <p class="section-copy">
            单手模式。主屏只显示骨骼；副屏使用隐私滤镜，只保留手部确认区域。静态手势由官方 Gesture Recognizer 判定，移动动作按用户自己的左右判断。
          </p>
        </div>

        <aside class="score-pass">
          <small>Score</small>
          <strong>{{ reactionState.score }}</strong>
          <span>{{ reactionState.completedRounds }} / {{ reactionState.total }} 题</span>
        </aside>
      </div>

      <div class="reaction-layout content-layer">
        <aside class="mission-board">
          <div class="mission-top">
            <span class="badge">单手模式</span>
            <span class="difficulty-name">{{ difficulty.name }}难度</span>
          </div>

          <h2>{{ prompt.label }}</h2>
          <p>{{ prompt.hint }}</p>

          <div class="gesture-guide-card" :class="prompt.type">
            <div class="guide-mascot">
              <div class="guide-bird">
                <span class="bird-eye left"></span>
                <span class="bird-eye right"></span>
                <span class="bird-beak"></span>
              </div>
              <span class="guide-name">蓝鸟导览员</span>
            </div>

            <div class="guide-bubble compact">
              <small>动作提示</small>
              <strong>{{ leftGuideTitle }}</strong>
              <span>{{ leftGuideHint }}</span>
            </div>
          </div>

          <div class="difficulty-panel">
            <b>难度选择</b>
            <div class="difficulty-switch">
              <button
                v-for="item in difficultyLevels"
                :key="item.id"
                type="button"
                :class="{ active: difficultyId === item.id }"
                @click="setDifficulty(item.id)"
              >
                <strong>{{ item.name }}</strong>
                <span>{{ item.rounds }}题</span>
              </button>
            </div>
            <p>{{ difficulty.label }}</p>
          </div>

          <div class="mode-note">
            <b>模式说明</b>
            <span>{{ modeText }}</span>
          </div>

          <div class="action-row">
            <button class="park-button" type="button" @click="requestCamera">
              {{ cameraRunning ? '重新申请摄像头' : '申请摄像头权限' }}
            </button>
            <button class="park-button soft" type="button" :disabled="!canStart" @click="startReactionRound">
              开始挑战
            </button>
            <button class="park-button ghost" type="button" @click="resetReactionRound">重置</button>
          </div>
        </aside>

        <main class="skeleton-theater">
          <div class="screen-top">
            <div>
              <small>{{ phaseLabel }}</small>
              <strong>{{ feedbackTitle }}</strong>
            </div>
            <span>{{ reactionState.lastFeedback }}</span>
          </div>

          <div class="main-skeleton-screen" :class="{ ready: skeletonReady, active: reactionState.phase === 'action', finished: reactionState.phase === 'finished' }">
            <canvas ref="mainCanvasRef" class="main-skeleton-canvas"></canvas>

            <div v-if="showCoachOverlay" class="coach-overlay">
              <div class="coach-chip">
                <div class="guide-bird small">
                  <span class="bird-eye left"></span>
                  <span class="bird-eye right"></span>
                  <span class="bird-beak"></span>
                </div>
                <span>蓝鸟导览员</span>
              </div>

              <div class="coach-speech compact">
                <small>开始前说明</small>
                <strong>先申请摄像头</strong>
                <span>主屏只保留骨骼，不显示人脸；副屏只确认手部区域。</span>
              </div>
            </div>

            <div v-if="reactionState.phase === 'seeking'" class="round-card seek-card">
              <small>等待手部入镜</small>
              <b>{{ handSeekText }}</b>
              <strong>把一只手伸到摄像头前</strong>
              <span>5 秒内识别到完整骨骼后自动开始，不用再回来点按钮。</span>
            </div>

            <div v-else-if="reactionState.phase === 'countdown'" class="round-card countdown-card">
              <small>第 {{ reactionState.currentIndex + 1 }} / {{ reactionState.total }} 题</small>
              <b>{{ countdownText }}</b>
              <strong>{{ currentTaskLabel }}</strong>
              <span>准备好动作，倒计时结束后开始判定</span>
            </div>

            <div v-else-if="reactionState.phase === 'success'" class="round-card success-card">
              <small>本题完成</small>
              <b>成功</b>
              <strong>下一题准备</strong>
              <span>稍等一下，马上切换动作牌</span>
            </div>

            <div v-else-if="reactionState.phase === 'finished'" class="round-card finished-card">
              <small>挑战完成</small>
              <b>{{ reactionState.score }}</b>
              <strong>{{ reactionState.completedRounds }} / {{ reactionState.total }} 题完成</strong>
              <span>成绩已经写入手账</span>
            </div>

            <div v-else-if="reactionState.phase === 'action'" class="action-strip">
              <span>第 {{ reactionState.currentIndex + 1 }} / {{ reactionState.total }} 题</span>
              <strong>{{ currentTaskLabel }}</strong>
              <em>保持动作稳定</em>
            </div>

            <div class="screen-label">
              <b>骨骼主屏</b>
              <span>不显示人脸和原始画面</span>
            </div>
          </div>

          <div class="screen-console">
            <div class="progress-lamps" :style="{ '--rounds': reactionState.total }">
              <i v-for="index in reactionState.total" :key="index" :class="{ done: index <= reactionState.completedRounds, current: index === currentRoundLabel && reactionState.phase === 'action' }"></i>
            </div>

            <div class="status-cards">
              <article :class="{ good: cameraRunning }">
                <b>摄像头</b>
                <span>{{ cameraStatus }}</span>
              </article>
              <article :class="{ good: skeletonReady }">
                <b>骨骼</b>
                <span>{{ skeletonText }}</span>
              </article>
              <article :class="{ good: reactionState.motionStrength > 0.14 || stableProgress > 0.5 }">
                <b>判定</b>
                <span>{{ judgeText }}</span>
              </article>
            </div>
          </div>
        </main>

        <aside class="privacy-panel">
          <div class="privacy-head">
            <b>隐私副屏</b>
            <span>强模糊，仅确认手部区域</span>
          </div>

          <div class="privacy-screen">
            <video ref="videoRef" class="hidden-video" autoplay playsinline muted></video>
            <canvas ref="privacyCanvasRef" class="privacy-canvas"></canvas>
          </div>

          <div class="recognition-readout">
            <b>官方识别</b>
            <span>{{ officialGestureText }}</span>
          </div>

          <div class="recognition-readout">
            <b>稳定帧</b>
            <span>{{ reactionState.stableFrames }} / {{ difficulty.stableFrames }}</span>
          </div>
        </aside>
      </div>
    </section>


    <section v-else-if="isBlockGame" class="block-game-stage">
      <img :src="plaza" alt="" class="block-bg asset-img" />
      <div class="block-filter"></div>
      <div class="park-orb orb-a"></div>
      <div class="park-orb orb-b"></div>
      <div class="park-orb orb-c"></div>

      <div class="block-header content-layer">
        <div class="title-block">
          <p class="section-kicker">Multimodal Block Game</p>
          <h1 class="section-title">星桥积木魔法屋</h1>
          <p class="section-copy">
            以手势为核心：抓取、移动、放下、抛弃积木。语音只做辅助口令，比如“放下”“换一个”“红色”。不做人脸表情判断。
          </p>
        </div>

        <aside class="score-pass">
          <small>Score</small>
          <strong>{{ blockState.score }}</strong>
          <span>{{ blockSummary.layers }} / {{ blockSummary.targetLayers }} 层</span>
        </aside>
      </div>

      <div class="block-layout content-layer">
        <aside class="block-mission-board">
          <div class="mission-top">
            <span class="badge">手势核心</span>
            <span class="difficulty-name">{{ blockDifficulty.name }}难度</span>
          </div>

          <div class="builder-guide-card">
            <img :src="blockMascot" alt="" class="block-mascot asset-img" />
            <div class="guide-bubble compact">
              <small>积木导览员</small>
              <strong>{{ blockPrompt.title }}</strong>
              <span>{{ blockPrompt.hint }}</span>
            </div>
          </div>

          <div class="difficulty-panel">
            <b>难度选择</b>
            <div class="difficulty-switch">
              <button
                v-for="item in blockDifficultyLevels"
                :key="item.id"
                type="button"
                :class="{ active: blockDifficultyId === item.id }"
                @click="setBlockDifficulty(item.id)"
              >
                <strong>{{ item.name }}</strong>
                <span>{{ item.targetLayers }}层</span>
              </button>
            </div>
            <p>{{ blockDifficulty.label }}</p>
          </div>

          <div class="mode-note">
            <b>自然手势</b>
            <span>张开手掌只是移动光标，划过积木不会抓取；手在积木上方由张开变成闭合才抓取；抓住后由闭合变成张开才放下；把拿着的积木拖到两侧回收篮并张开手可以换块。</span>
          </div>

          <div class="block-actions">
            <button class="park-button" type="button" @click="requestBlockCamera">
              {{ blockCameraRunning ? '重新申请摄像头' : '申请摄像头权限' }}
            </button>
            <button class="park-button soft" type="button" :disabled="!blockCanStart" @click="startBlockRound">
              开始闯关
            </button>
            <button class="park-button ghost" type="button" @click="resetBlockRound">重置</button>
            <button class="park-button ghost" type="button" @click="dropBlockByButton">放下积木</button>
            <button class="park-button ghost" type="button" @click="toggleBlockSpeech">{{ blockSpeechRunning ? '关闭语音' : '开启语音' }}</button>
          </div>
        </aside>

        <main class="block-theater">
          <div class="screen-top">
            <div>
              <small>{{ blockPhaseLabel }}</small>
              <strong>{{ blockFeedbackTitle }}</strong>
            </div>
            <span>{{ blockState.feedback }}</span>
          </div>

          <div class="block-main-screen" :class="{ ready: blockSkeletonReady, active: blockState.phase === 'playing', finished: blockState.phase === 'finished' }">
            <canvas ref="blockCanvasRef" class="block-stage-canvas"></canvas>

            <div v-if="blockState.phase === 'seeking'" class="round-card seek-card">
              <small>5 秒找手窗口</small>
              <b>{{ blockSeekText }}</b>
              <strong>把手伸到镜头前</strong>
              <span>识别到完整手部骨骼后自动开始搭建</span>
            </div>

            <div v-else-if="blockState.phase === 'idle'" class="block-start-card">
              <small>星桥积木</small>
              <strong>用手抓起积木</strong>
              <span>点击开始后再伸手，系统会自动进入闯关。</span>
            </div>

            <div v-else-if="blockState.phase === 'failed'" class="round-card failed-card">
              <small>还差一点</small>
              <b>再来</b>
              <strong>生命用完了</strong>
              <span>重新开始，先抓稳再放下。</span>
            </div>

            <div v-else-if="blockState.phase === 'finished'" class="round-card finished-card">
              <small>星桥完成</small>
              <b>{{ blockState.score }}</b>
              <strong>{{ blockSummary.layers }} / {{ blockSummary.targetLayers }} 层</strong>
              <span>成绩已经写入手账</span>
            </div>

            <div v-else class="block-action-strip">
              <span>{{ blockSummary.layers }} / {{ blockSummary.targetLayers }} 层</span>
              <strong>{{ blockPrompt.title }}</strong>
              <em>{{ blockGestureText }}</em>
            </div>

            <div class="screen-label">
              <b>积木主屏</b>
              <span>只显示游戏舞台，不显示原始人像</span>
            </div>
          </div>

          <div class="screen-console">
            <div class="progress-lamps" :style="{ '--rounds': blockSummary.targetLayers }">
              <i v-for="index in blockSummary.targetLayers" :key="index" :class="{ done: index <= blockSummary.layers, current: index === blockSummary.layers + 1 && blockState.phase === 'playing' }"></i>
            </div>

            <div class="status-cards">
              <article :class="{ good: blockCameraRunning }">
                <b>摄像头</b>
                <span>{{ blockCameraStatus }}</span>
              </article>
              <article :class="{ good: blockSkeletonReady }">
                <b>手势</b>
                <span>{{ blockGestureText }}</span>
              </article>
              <article :class="{ good: blockSpeechRunning }">
                <b>语音</b>
                <span>{{ blockSpeechStatus }}</span>
              </article>
            </div>
          </div>
        </main>

        <aside class="block-side-panel">
          <div class="privacy-head">
            <b>隐私副屏</b>
            <span>强模糊，仅确认手部区域</span>
          </div>

          <div class="privacy-screen">
            <video ref="blockVideoRef" class="hidden-video" autoplay playsinline muted></video>
            <canvas ref="blockPrivacyCanvasRef" class="privacy-canvas"></canvas>
          </div>

          <div class="recognition-readout">
            <b>当前手势</b>
            <span>{{ blockGestureText }}</span>
          </div>

          <div class="recognition-readout">
            <b>语音口令</b>
            <span>{{ blockVoiceText || '可说：换一个 / 红色 / 蓝色 / 重来；放下以张开手掌为主' }}</span>
          </div>
        </aside>
      </div>
    </section>

    <section v-else class="template-game-stage" :class="[`tone-${game.tone}`, { template: game.template }]">
      <img :src="plaza" alt="" class="template-bg asset-img" />
      <div class="template-filter"></div>

      <div class="template-copy content-layer">
        <p class="section-kicker">{{ game.play.kicker }}</p>
        <h1 class="section-title">{{ game.name }}</h1>
        <p class="section-copy">{{ game.play.intro }}</p>

        <div class="action-row">
          <button class="park-button" type="button" @click="startTemplateRound">{{ game.play.startLabel }}</button>
          <button class="park-button soft" type="button" @click="finishTemplateRound">{{ game.play.finishLabel }}</button>
          <button class="park-button ghost" type="button" @click="resetTemplateRound">{{ game.play.resetLabel }}</button>
        </div>

        <div class="mode-note">
          <b>模板逻辑文件</b>
          <span>{{ templateLogicFile }}</span>
        </div>
      </div>

      <div class="template-board content-layer" :class="{ active: templateState.phase === 'active', done: templateState.phase === 'done' }">
        <img :src="bird" alt="" class="board-bird asset-img" />
        <div class="template-light"></div>
        <strong>{{ templateBoardTitle }}</strong>
        <span>{{ templateState.feedback }}</span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { findGame } from '../data/games'
import { createGestureEngine, drawPrivacyPreview, drawPureSkeleton, scoreSkeletonQuality } from '../utils/gesture/mediapipeGestureEngine'
import { DIFFICULTY_LEVELS, advanceReactionPhase, createReactionState, evaluateReactionFrame, getCountdownText, getHandSeekText, getCurrentTask, getDifficulty, getModeText, getOfficialGestureText, getTaskPrompt, resetReactionState, startReactionState } from '../games/reactionWaveLogic'
import { saveGameRecord } from '../games/gameRecords'
import { createBellTemplateState, hitBellTemplate, resetBellTemplate, startBellTemplate } from '../games/bellTemplateLogic'
import { createBubbleTemplateState, popBubbleTemplate, resetBubbleTemplate, startBubbleTemplate } from '../games/bubbleTemplateLogic'
import { MAGIC_BLOCK_DIFFICULTIES, applyMagicBlockVoice, createMagicBlockState, drawMagicBlockStage, getMagicBlockDifficulty, getMagicBlockPrompt, getMagicBlockSeekText, getMagicBlockSummary, resetMagicBlockState, startMagicBlockState, updateMagicBlockFrame } from '../games/magicBlockBuilderLogic'
import plaza from '../assets/park-scenes/plaza.png'
import bird from '../assets/park-decor/bird-guide.png'
import blockMascot from '../assets/park-decor/magic-block-mascot.svg'

const route = useRoute()
const game = computed(() => findGame(route.params.id))
const isReactionGame = computed(() => game.value.id === 'reaction-wave')
const isBlockGame = computed(() => game.value.id === 'magic-block-builder')

const videoRef = ref(null)
const mainCanvasRef = ref(null)
const privacyCanvasRef = ref(null)

const difficultyLevels = DIFFICULTY_LEVELS
const difficultyId = ref('normal')
const difficulty = computed(() => getDifficulty(difficultyId.value))

const cameraRunning = ref(false)
const cameraStatus = ref('未申请')
const currentFrame = ref(null)
const skeletonQuality = ref({ ready: false, score: 0, size: 0 })
const reactionState = ref(createReactionState(difficulty.value))
const clock = ref(Date.now())

let gestureEngine = null
let stream = null
let rafId = 0
let processingFrame = false

const modeText = getModeText()

const skeletonReady = computed(() => cameraRunning.value && skeletonQuality.value.ready)
const canStart = computed(() => cameraRunning.value && !isRoundBusy.value)
const prompt = computed(() => getTaskPrompt(reactionState.value))
const currentTask = computed(() => getCurrentTask(reactionState.value))
const currentTaskLabel = computed(() => currentTask.value?.label || prompt.value.label)
const currentRoundLabel = computed(() => Math.min(reactionState.value.currentIndex + 1, reactionState.value.total))
const officialGestureText = computed(() => getOfficialGestureText(currentFrame.value))
const stableProgress = computed(() => Math.min(1, reactionState.value.stableFrames / difficulty.value.stableFrames))
const countdownText = computed(() => getCountdownText(reactionState.value, clock.value))
const handSeekText = computed(() => getHandSeekText(reactionState.value, clock.value))
const showCoachOverlay = computed(() => reactionState.value.phase === 'idle')
const isRoundBusy = computed(() => ['seeking', 'countdown', 'action', 'success'].includes(reactionState.value.phase))

const leftGuideTitle = computed(() => {
  if (reactionState.value.phase === 'idle') return '准备开始'
  if (reactionState.value.phase === 'seeking') return '伸手入镜'
  if (reactionState.value.phase === 'countdown') return `第 ${reactionState.value.currentIndex + 1} 题准备`
  if (reactionState.value.phase === 'action') return currentTaskLabel.value
  if (reactionState.value.phase === 'success') return '本题成功'
  if (reactionState.value.phase === 'finished') return '挑战完成'
  return prompt.value.label
})

const leftGuideHint = computed(() => {
  if (reactionState.value.phase === 'idle') return '申请摄像头后开始'
  if (reactionState.value.phase === 'seeking') return `${handSeekText.value} 秒内伸手`
  if (reactionState.value.phase === 'countdown') return `${countdownText.value} 后开始`
  if (reactionState.value.phase === 'action') return '看主屏小条完成动作'
  if (reactionState.value.phase === 'success') return '马上进入下一题'
  if (reactionState.value.phase === 'finished') return `${reactionState.value.score} 分`
  return '按右侧主屏提示完成动作'
})

const phaseLabel = computed(() => {
  if (reactionState.value.phase === 'finished') return 'FINISHED'
  if (reactionState.value.phase === 'success') return 'SUCCESS'
  if (reactionState.value.phase === 'seeking') return 'SEEKING'
  if (reactionState.value.phase === 'countdown') return 'READY'
  if (reactionState.value.phase === 'action') return 'ACTION'
  return 'WAITING'
})

const feedbackTitle = computed(() => {
  if (reactionState.value.phase === 'finished') return '本轮完成'
  if (reactionState.value.phase === 'success') return '动作成功'
  if (reactionState.value.phase === 'seeking') return '伸手入镜'
  if (reactionState.value.phase === 'countdown') return `第 ${reactionState.value.currentIndex + 1} 题准备`
  if (!cameraRunning.value) return '等待权限'
  if (!skeletonReady.value) return '骨骼校准中'
  if (reactionState.value.phase === 'action') return '正在判定'
  return '可以开始'
})

const skeletonText = computed(() => {
  if (!cameraRunning.value) return '等待摄像头'
  return `${skeletonReady.value ? '清晰' : '不够清晰'} · ${Math.round(skeletonQuality.value.score * 100)}%`
})

const judgeText = computed(() => {
  if (reactionState.value.phase === 'seeking') return `找手 ${handSeekText.value} 秒`
  if (reactionState.value.phase === 'countdown') return `倒计时 ${countdownText.value}`
  if (reactionState.value.phase === 'success') return '成功，下一题'
  if (reactionState.value.phase !== 'action') return '等待动作'
  const percent = Math.round(stableProgress.value * 100)
  if (getCurrentTask(reactionState.value)?.type === 'gesture') return `手势稳定 ${percent}%`
  return `动作幅度 ${Math.round(reactionState.value.motionStrength * 100)}%`
})

function setDifficulty(id) {
  if (isRoundBusy.value) return
  difficultyId.value = id
  reactionState.value = resetReactionState(difficulty.value, cameraRunning.value)
  drawCurrentFrame()
}

async function requestCamera() {
  try {
    resetReactionRound()
    cameraStatus.value = '正在申请视频权限'
    reactionState.value = {
      ...reactionState.value,
      lastFeedback: '浏览器会弹出权限申请，请允许使用摄像头。'
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持摄像头访问，或页面不是 localhost/https。')
    }

    if (!gestureEngine) {
      cameraStatus.value = '正在加载官方识别模型'
      gestureEngine = await createGestureEngine()
    }

    await nextTick()
    stopCamera(false)

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 960 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    })

    if (!videoRef.value) throw new Error('视频窗口还没有准备好。')
    videoRef.value.srcObject = stream
    await videoRef.value.play()

    cameraRunning.value = true
    cameraStatus.value = '已开启'
    reactionState.value = {
      ...reactionState.value,
      lastFeedback: '把一只手完整放进画面，等骨骼稳定以后再开始。'
    }

    startAnalyzeLoop()
  } catch (error) {
    cameraRunning.value = false
    cameraStatus.value = '申请失败'
    reactionState.value = {
      ...reactionState.value,
      lastFeedback: error?.message || '摄像头申请失败，请检查浏览器权限。'
    }
    drawCurrentFrame()
  }
}

function startAnalyzeLoop() {
  cancelAnimationFrame(rafId)

  const loop = () => {
    clock.value = Date.now()

    if (!cameraRunning.value || !videoRef.value || !gestureEngine) {
      rafId = requestAnimationFrame(loop)
      return
    }

    if (!processingFrame && videoRef.value.readyState >= 2) {
      processingFrame = true
      try {
        const frame = gestureEngine.recognize(videoRef.value, performance.now())
        currentFrame.value = frame
        skeletonQuality.value = scoreSkeletonQuality(frame)
        advanceAndEvaluate(frame)
        drawCurrentFrame()
      } catch (error) {
        reactionState.value = {
          ...reactionState.value,
          lastFeedback: error?.message || '官方手势识别暂时失败。'
        }
      } finally {
        processingFrame = false
      }
    }

    rafId = requestAnimationFrame(loop)
  }

  rafId = requestAnimationFrame(loop)
}

function advanceAndEvaluate(frame) {
  const advanced = advanceReactionPhase(reactionState.value, frame, difficulty.value, clock.value)
  reactionState.value = advanced

  if (reactionState.value.phase === 'action') {
    const evaluated = evaluateReactionFrame(reactionState.value, frame, difficulty.value, clock.value)
    reactionState.value = evaluated.state
  }

  if (reactionState.value.phase === 'finished') {
    finishReactionRecord()
  }
}

function drawCurrentFrame() {
  drawPureSkeleton(mainCanvasRef.value, currentFrame.value, { phase: reactionState.value.phase })
  drawPrivacyPreview(privacyCanvasRef.value, videoRef.value, currentFrame.value)
}

function startReactionRound() {
  const result = startReactionState(reactionState.value, currentFrame.value, difficulty.value, Date.now())
  reactionState.value = result.state
  if (!result.ok) {
    reactionState.value = {
      ...reactionState.value,
      lastFeedback: result.feedback
    }
  }
}

async function finishReactionRecord() {
  if (reactionState.value.recorded) return
  reactionState.value = {
    ...reactionState.value,
    recorded: true
  }

  const durationMs = Date.now() - reactionState.value.roundStartedAt
  await saveGameRecord(game.value, {
    action: `${game.value.stamp} · ${difficulty.value.name} · ${reactionState.value.completedRounds}/${reactionState.value.total} · ${reactionState.value.score}分`,
    score: reactionState.value.score,
    rounds: reactionState.value.completedRounds,
    durationMs,
    result: `reaction-wave-${difficulty.value.id}-complete`
  })
}

function resetReactionRound() {
  reactionState.value = resetReactionState(difficulty.value, cameraRunning.value)
}

function stopCamera(updateText = true) {
  cancelAnimationFrame(rafId)
  rafId = 0

  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }

  cameraRunning.value = false
  currentFrame.value = null
  skeletonQuality.value = { ready: false, score: 0, size: 0 }
  if (updateText) cameraStatus.value = '未申请'
  drawCurrentFrame()
}


const blockCanvasRef = ref(null)
const blockVideoRef = ref(null)
const blockPrivacyCanvasRef = ref(null)
const blockDifficultyLevels = MAGIC_BLOCK_DIFFICULTIES
const blockDifficultyId = ref('normal')
const blockDifficulty = computed(() => getMagicBlockDifficulty(blockDifficultyId.value))
const blockCameraRunning = ref(false)
const blockCameraStatus = ref('未申请')
const blockFrame = ref(null)
const blockQuality = ref({ ready: false, score: 0, size: 0 })
const blockState = ref(createMagicBlockState(blockDifficulty.value))
const blockVoiceText = ref('')
const blockSpeechRunning = ref(false)
const blockSpeechStatus = ref('未开启')

let blockGestureEngine = null
let blockStream = null
let blockRafId = 0
let blockProcessingFrame = false
let blockSpeechRecognizer = null

const blockSkeletonReady = computed(() => blockCameraRunning.value && blockQuality.value.ready)
const blockSummary = computed(() => getMagicBlockSummary(blockState.value))
const blockPrompt = computed(() => getMagicBlockPrompt(blockState.value))
const blockSeekText = computed(() => getMagicBlockSeekText(blockState.value, Date.now()))
const blockBusy = computed(() => ['seeking', 'playing'].includes(blockState.value.phase))
const blockCanStart = computed(() => blockCameraRunning.value && !blockBusy.value)

const blockPhaseLabel = computed(() => {
  if (blockState.value.phase === 'finished') return 'FINISHED'
  if (blockState.value.phase === 'failed') return 'FAILED'
  if (blockState.value.phase === 'seeking') return 'FIND HAND'
  if (blockState.value.phase === 'playing') return 'BUILDING'
  return 'WAITING'
})

const blockFeedbackTitle = computed(() => {
  if (blockState.value.phase === 'finished') return '星桥完成'
  if (blockState.value.phase === 'failed') return '重新挑战'
  if (blockState.value.phase === 'seeking') return '正在找手'
  if (blockState.value.phase === 'playing') return blockState.value.holding ? '抓取中' : '搭建中'
  return '等待开始'
})

const blockGestureText = computed(() => {
  const gesture = blockState.value.gesture
  if (!blockCameraRunning.value) return '等待摄像头'
  if (!gesture?.hasHand) return '未识别到手'
  if (blockState.value.holding) return '闭合拿着：张开放下'
  if (blockState.value.interaction === 'hover_open') return '张开经过：闭合才抓'
  if (blockState.value.interaction === 'closing_on_block') return '闭合确认抓取'
  if (blockState.value.interaction === 'opening_to_drop') return '张开确认放下'
  if (gesture.palmState === 'open') return '张开手：只移动'
  if (gesture.palmState === 'closed') return '闭合手'
  return gesture.gestureName || '手势已识别'
})

function setBlockDifficulty(id) {
  if (blockBusy.value) return
  blockDifficultyId.value = id
  blockState.value = resetMagicBlockState(blockDifficulty.value, blockCameraRunning.value)
  drawBlockCurrentFrame()
}

async function requestBlockCamera() {
  try {
    resetBlockRound()
    blockCameraStatus.value = '正在申请视频权限'

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持摄像头访问，或页面不是 localhost/https。')
    }

    if (!blockGestureEngine) {
      blockCameraStatus.value = '正在加载手势识别模型'
      blockGestureEngine = await createGestureEngine()
    }

    await nextTick()
    stopBlockCamera(false)

    blockStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 960 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    })

    if (!blockVideoRef.value) throw new Error('积木游戏视频窗口还没有准备好。')
    blockVideoRef.value.srcObject = blockStream
    await blockVideoRef.value.play()

    blockCameraRunning.value = true
    blockCameraStatus.value = '已开启'
    blockState.value = {
      ...blockState.value,
      feedback: '摄像头已开启。点击开始后，5 秒内把手伸到镜头前。'
    }

    startBlockAnalyzeLoop()
  } catch (error) {
    blockCameraRunning.value = false
    blockCameraStatus.value = '申请失败'
    blockState.value = {
      ...blockState.value,
      feedback: error?.message || '摄像头申请失败，请检查浏览器权限。'
    }
    drawBlockCurrentFrame()
  }
}

function startBlockAnalyzeLoop() {
  cancelAnimationFrame(blockRafId)

  const loop = () => {
    if (!blockCameraRunning.value || !blockVideoRef.value || !blockGestureEngine) {
      blockRafId = requestAnimationFrame(loop)
      return
    }

    if (!blockProcessingFrame && blockVideoRef.value.readyState >= 2) {
      blockProcessingFrame = true
      try {
        const frame = blockGestureEngine.recognize(blockVideoRef.value, performance.now())
        blockFrame.value = frame
        blockQuality.value = scoreSkeletonQuality(frame)
        blockState.value = updateMagicBlockFrame(blockState.value, frame, blockDifficulty.value, Date.now())
        drawBlockCurrentFrame()
        if (blockState.value.phase === 'finished') finishBlockRecord()
      } catch (error) {
        blockState.value = {
          ...blockState.value,
          feedback: error?.message || '积木手势识别暂时失败。'
        }
      } finally {
        blockProcessingFrame = false
      }
    }

    blockRafId = requestAnimationFrame(loop)
  }

  blockRafId = requestAnimationFrame(loop)
}

function drawBlockCurrentFrame() {
  drawMagicBlockStage(blockCanvasRef.value, blockState.value)
  drawPrivacyPreview(blockPrivacyCanvasRef.value, blockVideoRef.value, blockFrame.value)
}

function startBlockRound() {
  blockState.value = startMagicBlockState(blockState.value, blockDifficulty.value, Date.now())
}

function resetBlockRound() {
  blockState.value = resetMagicBlockState(blockDifficulty.value, blockCameraRunning.value)
  drawBlockCurrentFrame()
}

function dropBlockByButton() {
  blockState.value = applyMagicBlockVoice(blockState.value, '放下', blockDifficulty.value, Date.now())
  drawBlockCurrentFrame()
}

function toggleBlockSpeech() {
  if (blockSpeechRunning.value) {
    stopBlockSpeech()
    return
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    blockSpeechStatus.value = '当前浏览器不支持语音口令'
    return
  }

  blockSpeechRecognizer = new SpeechRecognition()
  blockSpeechRecognizer.lang = 'zh-CN'
  blockSpeechRecognizer.continuous = true
  blockSpeechRecognizer.interimResults = false

  blockSpeechRecognizer.onresult = (event) => {
    const last = event.results[event.results.length - 1]
    const text = last?.[0]?.transcript || ''
    if (!text) return
    blockVoiceText.value = text
    blockState.value = applyMagicBlockVoice(blockState.value, text, blockDifficulty.value, Date.now())
    drawBlockCurrentFrame()
  }

  blockSpeechRecognizer.onerror = () => {
    blockSpeechStatus.value = '语音暂时不可用'
    blockSpeechRunning.value = false
  }

  blockSpeechRecognizer.onend = () => {
    if (blockSpeechRunning.value) {
      try { blockSpeechRecognizer.start() } catch { blockSpeechRunning.value = false }
    }
  }

  try {
    blockSpeechRecognizer.start()
    blockSpeechRunning.value = true
    blockSpeechStatus.value = '正在听口令'
  } catch {
    blockSpeechStatus.value = '语音启动失败'
    blockSpeechRunning.value = false
  }
}

function stopBlockSpeech() {
  blockSpeechRunning.value = false
  blockSpeechStatus.value = '未开启'
  if (blockSpeechRecognizer) {
    try { blockSpeechRecognizer.stop() } catch {}
    blockSpeechRecognizer = null
  }
}

async function finishBlockRecord() {
  if (blockState.value.recorded) return
  blockState.value = {
    ...blockState.value,
    recorded: true
  }

  const durationMs = Date.now() - blockState.value.roundStartedAt
  await saveGameRecord(game.value, {
    action: `${game.value.stamp} · ${blockDifficulty.value.name} · ${blockState.value.layers.length}/${blockState.value.targetLayers}层 · ${blockState.value.score}分`,
    score: blockState.value.score,
    rounds: blockState.value.layers.length,
    durationMs,
    result: `magic-block-builder-${blockDifficulty.value.id}-complete`
  })
}

function stopBlockCamera(updateText = true) {
  cancelAnimationFrame(blockRafId)
  blockRafId = 0

  if (blockStream) {
    blockStream.getTracks().forEach((track) => track.stop())
    blockStream = null
  }

  blockCameraRunning.value = false
  blockFrame.value = null
  blockQuality.value = { ready: false, score: 0, size: 0 }
  if (updateText) blockCameraStatus.value = '未申请'
  drawBlockCurrentFrame()
}

const templateState = ref(createBellTemplateState())

const templateLogicFile = computed(() => {
  if (game.value.id === 'bell-template') return 'frontend/src/games/bellTemplateLogic.js'
  if (game.value.id === 'bubble-template') return 'frontend/src/games/bubbleTemplateLogic.js'
  return 'frontend/src/games/reactionWaveLogic.js'
})

const templateBoardTitle = computed(() => {
  if (templateState.value.phase === 'done') return game.value.play.doneTitle
  if (templateState.value.phase === 'active') return game.value.play.activeTitle
  return game.value.play.idleTitle
})

function resetTemplateStateForGame() {
  if (game.value.id === 'bubble-template') {
    templateState.value = createBubbleTemplateState()
  } else {
    templateState.value = createBellTemplateState()
  }
}

function startTemplateRound() {
  if (game.value.id === 'bubble-template') {
    templateState.value = startBubbleTemplate(templateState.value)
  } else {
    templateState.value = startBellTemplate(templateState.value)
  }
}

async function finishTemplateRound() {
  if (game.value.id === 'bubble-template') {
    templateState.value = popBubbleTemplate(templateState.value)
  } else {
    templateState.value = hitBellTemplate(templateState.value)
  }

  if (templateState.value.phase === 'done') {
    await saveGameRecord(game.value, {
      action: game.value.stamp,
      score: templateState.value.score,
      rounds: 1,
      result: `${game.value.id}-complete`
    })
  }
}

function resetTemplateRound() {
  if (game.value.id === 'bubble-template') {
    templateState.value = resetBubbleTemplate()
  } else {
    templateState.value = resetBellTemplate()
  }
}

watch(() => route.params.id, () => {
  resetReactionRound()
  resetBlockRound()
  resetTemplateStateForGame()
  if (route.params.id !== 'reaction-wave') stopCamera()
  if (route.params.id !== 'magic-block-builder') {
    stopBlockCamera(false)
    stopBlockSpeech()
  }
})

onBeforeUnmount(() => {
  stopCamera(false)
  stopBlockCamera(false)
  stopBlockSpeech()
  if (gestureEngine) {
    gestureEngine.close()
    gestureEngine = null
  }
  if (blockGestureEngine) {
    blockGestureEngine.close()
    blockGestureEngine = null
  }
})
</script>

<style scoped>
.reaction-game,
.template-game-stage {
  position: relative;
  min-height: calc(100vh - 165px);
  overflow: hidden;
  border-radius: 44px;
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: var(--shadow);
  padding: clamp(24px, 3.1vw, 48px);
}

.reaction-bg,
.template-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.reaction-filter,
.template-filter {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 250, 236, .95), rgba(255, 250, 236, .74) 46%, rgba(255, 250, 236, .48)),
    radial-gradient(circle at 78% 36%, rgba(255, 255, 255, .52), transparent 28%);
}

.park-orb {
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 229, 138, .78), rgba(255, 229, 138, 0));
  animation: floatOrb 5.2s ease-in-out infinite;
}

.orb-a { left: 48%; top: 10%; }
.orb-b { right: 7%; top: 28%; animation-delay: -1.5s; }
.orb-c { left: 13%; bottom: 7%; animation-delay: -2.5s; }

.reaction-header {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 178px;
  gap: 22px;
  align-items: end;
}

.score-pass {
  padding: 18px;
  border-radius: 28px;
  text-align: center;
  background: rgba(255, 255, 255, .68);
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: 0 18px 46px rgba(68, 53, 31, .1);
}

.score-pass small,
.score-pass span {
  display: block;
  color: #71807c;
  font-weight: 900;
}

.score-pass strong {
  display: block;
  margin: 8px 0;
  color: var(--ink);
  font-size: 52px;
  line-height: 1;
  letter-spacing: -.06em;
}

.reaction-layout {
  position: relative;
  margin-top: 24px;
  display: grid;
  grid-template-columns: minmax(255px, .56fr) minmax(600px, 1.34fr) minmax(250px, .56fr);
  gap: 20px;
  align-items: stretch;
}

.mission-board,
.skeleton-theater,
.privacy-panel,
.template-board {
  border-radius: 36px;
  background: rgba(255, 250, 235, .76);
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: 0 24px 60px rgba(70, 55, 30, .12);
  backdrop-filter: blur(18px);
}

.mission-board {
  padding: 22px;
  align-self: stretch;
}

.mission-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.difficulty-name {
  padding: 6px 10px;
  border-radius: 999px;
  color: #9a6b36;
  font-size: 12px;
  font-weight: 900;
  background: rgba(255,255,255,.62);
  border: 1px solid rgba(183, 142, 78, .16);
}

.mission-board h2 {
  margin: 14px 0 0;
  color: var(--ink);
  font-size: clamp(28px, 2.65vw, 44px);
  line-height: 1.02;
  letter-spacing: -.06em;
}

.mission-board p {
  margin: 12px 0 0;
  color: #62716f;
  line-height: 1.62;
  font-weight: 850;
  font-size: 14px;
}

.gesture-guide-card {
  margin: 16px 0;
  padding: 14px;
  min-height: 132px;
  border-radius: 24px;
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  background: linear-gradient(135deg, rgba(255, 243, 206, .94), rgba(235, 248, 249, .80));
  border: 1px solid rgba(183, 142, 78, .18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.65);
}

.guide-mascot {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.guide-bird {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: radial-gradient(circle at 35% 28%, rgba(255,255,255,.95), rgba(243, 219, 148, .92) 42%, rgba(141, 189, 212, .88) 100%);
  border: 3px solid rgba(88, 117, 155, .34);
  box-shadow: 0 10px 24px rgba(93, 84, 55, .14);
}

.guide-bird.small {
  width: 46px;
  height: 46px;
  border-width: 2px;
  box-shadow: 0 6px 16px rgba(93, 84, 55, .14);
}

.bird-eye {
  position: absolute;
  top: 29px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #30405f;
}

.guide-bird.small .bird-eye {
  top: 18px;
  width: 5px;
  height: 5px;
}

.bird-eye.left { left: 21px; }
.bird-eye.right { right: 21px; }
.guide-bird.small .bird-eye.left { left: 13px; }
.guide-bird.small .bird-eye.right { right: 13px; }

.bird-beak {
  position: absolute;
  left: 50%;
  top: 36px;
  width: 0;
  height: 0;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 11px solid #da9e58;
}

.guide-bird.small .bird-beak {
  top: 24px;
  border-left-width: 6px;
  border-right-width: 6px;
  border-top-width: 8px;
}

.guide-name {
  padding: 4px 10px;
  border-radius: 999px;
  color: #4e6688;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .04em;
  background: rgba(255,255,255,.7);
  border: 1px solid rgba(183, 142, 78, .16);
}

.guide-bubble {
  position: relative;
  padding: 12px 14px;
  border-radius: 20px;
  background: rgba(255,255,255,.72);
  border: 1px solid rgba(183, 142, 78, .16);
  box-shadow: 0 8px 18px rgba(98, 70, 38, .06);
}

.guide-bubble::before {
  content: "";
  position: absolute;
  left: -10px;
  top: 28px;
  width: 18px;
  height: 18px;
  background: rgba(255,255,255,.72);
  border-left: 1px solid rgba(183, 142, 78, .16);
  border-bottom: 1px solid rgba(183, 142, 78, .16);
  transform: rotate(45deg);
}

.guide-bubble small,
.guide-bubble strong,
.guide-bubble span {
  display: block;
}

.guide-bubble small {
  color: #b77945;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.guide-bubble strong {
  margin-top: 5px;
  color: var(--ink);
  font-size: 18px;
  line-height: 1.06;
  letter-spacing: -.02em;
}

.guide-bubble span {
  margin-top: 6px;
  color: #62716f;
  line-height: 1.42;
  font-weight: 850;
  font-size: 12px;
}

.guide-bubble.compact span {
  color: #74817f;
}

.difficulty-panel {
  margin-top: 14px;
  padding: 13px;
  border-radius: 22px;
  background: rgba(255,255,255,.58);
  border: 1px solid rgba(183, 142, 78, .16);
}

.difficulty-panel b {
  color: var(--ink);
}

.difficulty-panel p {
  margin: 9px 0 0;
  font-size: 12px;
  line-height: 1.5;
}

.difficulty-switch {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}

.difficulty-switch button {
  border: 0;
  border-radius: 16px;
  padding: 10px 6px;
  cursor: pointer;
  background: rgba(255, 247, 224, .9);
  color: #7a623a;
  box-shadow: inset 0 0 0 1px rgba(183, 142, 78, .14);
}

.difficulty-switch button.active {
  background: linear-gradient(135deg, #f0b66a, #f6d98b);
  color: #263650;
  box-shadow: 0 8px 16px rgba(160, 104, 38, .18);
}

.difficulty-switch strong,
.difficulty-switch span {
  display: block;
}

.difficulty-switch strong {
  font-size: 13px;
}

.difficulty-switch span {
  margin-top: 3px;
  font-size: 11px;
  font-weight: 900;
  opacity: .78;
}

.mode-note,
.recognition-readout {
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, .62);
  border: 1px solid rgba(183, 142, 78, .17);
}

.mode-note {
  margin-top: 14px;
}

.mode-note b,
.mode-note span,
.recognition-readout b,
.recognition-readout span {
  display: block;
}

.mode-note b,
.recognition-readout b {
  color: var(--ink);
}

.mode-note span,
.recognition-readout span {
  margin-top: 5px;
  color: #687879;
  line-height: 1.52;
  font-weight: 850;
  font-size: 13px;
}

.action-row {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.mission-board .park-button {
  padding: 11px 17px;
  font-size: 14px;
}

.park-button:disabled {
  opacity: .46;
  cursor: not-allowed;
}

.skeleton-theater {
  padding: 22px;
  display: grid;
  gap: 15px;
}

.screen-top {
  display: grid;
  grid-template-columns: minmax(0, .68fr) minmax(260px, .9fr);
  gap: 16px;
  align-items: center;
}

.screen-top small {
  color: #b77945;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .18em;
}

.screen-top strong {
  display: block;
  margin-top: 5px;
  color: var(--ink);
  font-size: clamp(26px, 3vw, 42px);
  letter-spacing: -.05em;
}

.screen-top span {
  color: #61706e;
  line-height: 1.6;
  font-weight: 850;
}

.main-skeleton-screen {
  position: relative;
  min-height: 535px;
  overflow: hidden;
  border-radius: 34px;
  border: 1px solid rgba(183, 142, 78, .25);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.28);
}

.main-skeleton-screen.ready {
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.35), 0 0 0 5px rgba(124,190,139,.16);
}

.main-skeleton-screen.active {
  animation: stageGlow 1.1s ease-in-out infinite;
}

.main-skeleton-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.coach-overlay {
  position: absolute;
  right: 18px;
  top: 18px;
  width: min(320px, calc(100% - 36px));
  display: grid;
  gap: 10px;
  z-index: 4;
  pointer-events: none;
}

.coach-chip {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 8px 9px;
  border-radius: 999px;
  background: rgba(255, 250, 235, .80);
  border: 1px solid rgba(183, 142, 78, .18);
  box-shadow: 0 8px 18px rgba(98, 70, 38, .08);
}

.coach-chip span {
  color: var(--ink);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: .03em;
}

.coach-speech {
  position: relative;
  margin-left: 28px;
  padding: 12px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, .78);
  border: 1px solid rgba(183, 142, 78, .16);
  box-shadow: 0 14px 30px rgba(98, 70, 38, .08);
  backdrop-filter: blur(6px);
}

.coach-speech.compact {
  max-width: 360px;
}

.coach-speech::before {
  content: "";
  position: absolute;
  right: 32px;
  top: -8px;
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, .78);
  border-top: 1px solid rgba(183, 142, 78, .16);
  border-left: 1px solid rgba(183, 142, 78, .16);
  transform: rotate(45deg);
}

.coach-speech small,
.coach-speech strong,
.coach-speech span {
  display: block;
}

.coach-speech small {
  color: #b77945;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.coach-speech strong {
  margin-top: 4px;
  color: var(--ink);
  font-size: 18px;
  line-height: 1.06;
  letter-spacing: -.02em;
}

.coach-speech span {
  margin-top: 6px;
  color: #62716f;
  line-height: 1.45;
  font-size: 12px;
  font-weight: 850;
}

.round-card {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 3;
  width: min(420px, calc(100% - 64px));
  transform: translate(-50%, -50%);
  border-radius: 30px;
  padding: 22px 26px;
  text-align: center;
  background: rgba(255, 250, 235, .88);
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: 0 22px 60px rgba(12, 18, 27, .24);
  backdrop-filter: blur(10px);
}

.round-card small,
.round-card b,
.round-card strong,
.round-card span {
  display: block;
}

.round-card small {
  color: #b77945;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.round-card b {
  margin-top: 8px;
  color: var(--ink);
  font-size: clamp(54px, 8vw, 86px);
  line-height: .95;
  letter-spacing: -.08em;
}

.round-card strong {
  margin-top: 10px;
  color: var(--ink);
  font-size: 24px;
  line-height: 1.1;
  letter-spacing: -.04em;
}

.round-card span {
  margin-top: 8px;
  color: #61706e;
  font-size: 14px;
  font-weight: 850;
  line-height: 1.45;
}

.seek-card {
  background: linear-gradient(135deg, rgba(224, 244, 247, .94), rgba(255, 249, 226, .90));
}

.countdown-card {
  background: linear-gradient(135deg, rgba(255, 249, 226, .94), rgba(224, 244, 247, .88));
}

.success-card {
  background: linear-gradient(135deg, rgba(234, 255, 221, .94), rgba(255, 249, 226, .88));
}

.finished-card {
  background: linear-gradient(135deg, rgba(255, 242, 193, .94), rgba(235, 248, 249, .88));
}

.action-strip {
  position: absolute;
  left: 18px;
  right: 18px;
  top: 18px;
  z-index: 3;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 11px 14px;
  border-radius: 999px;
  background: rgba(255, 250, 235, .82);
  border: 1px solid rgba(183, 142, 78, .18);
  box-shadow: 0 12px 28px rgba(12, 18, 27, .16);
  backdrop-filter: blur(8px);
}

.action-strip span,
.action-strip em {
  color: #7a6c55;
  font-size: 13px;
  font-style: normal;
  font-weight: 900;
}

.action-strip strong {
  min-width: 0;
  color: var(--ink);
  font-size: 18px;
  line-height: 1.15;
  letter-spacing: -.03em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.screen-label {
  position: absolute;
  left: 18px;
  bottom: 18px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 250, 235, .70);
  border: 1px solid rgba(183,142,78,.18);
}

.screen-label b,
.screen-label span {
  display: block;
}

.screen-label b {
  color: var(--ink);
}

.screen-label span {
  margin-top: 3px;
  color: #687879;
  font-size: 12px;
  font-weight: 850;
}

.screen-console {
  display: grid;
  grid-template-columns: minmax(0, .48fr) minmax(390px, 1fr);
  gap: 14px;
  align-items: stretch;
}

.progress-lamps {
  display: grid;
  grid-template-columns: repeat(var(--rounds), 1fr);
  gap: 7px;
  align-items: center;
}

.progress-lamps i {
  height: 18px;
  border-radius: 999px;
  background: rgba(150,160,148,.22);
  border: 1px solid rgba(183,142,78,.12);
}

.progress-lamps i.current {
  background: #f4d889;
  animation: lampPulse 1s ease-in-out infinite;
}

.progress-lamps i.done {
  background: linear-gradient(90deg, #e6b35c, #86c49a);
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
}

.status-cards article {
  padding: 13px;
  border-radius: 20px;
  background: rgba(255,255,255,.62);
  border: 1px solid rgba(183,142,78,.16);
}

.status-cards article.good {
  box-shadow: inset 0 0 0 2px rgba(124,190,139,.18);
}

.status-cards b,
.status-cards span {
  display: block;
}

.status-cards b {
  color: var(--ink);
}

.status-cards span {
  margin-top: 6px;
  color: #667370;
  font-size: 12px;
  font-weight: 850;
  line-height: 1.45;
}

.privacy-panel {
  padding: 18px;
  display: grid;
  gap: 14px;
  align-content: start;
  align-self: stretch;
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

.privacy-screen {
  position: relative;
  min-height: 245px;
  overflow: hidden;
  border-radius: 26px;
  background: #162131;
  border: 1px solid rgba(183,142,78,.22);
}

.hidden-video,
.privacy-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hidden-video {
  opacity: 0;
  pointer-events: none;
}


.block-game-stage {
  position: relative;
  min-height: calc(100vh - 165px);
  overflow: hidden;
  border-radius: 44px;
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: var(--shadow);
  padding: clamp(24px, 3.1vw, 48px);
}

.block-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.block-filter {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 250, 236, .95), rgba(255, 250, 236, .72) 44%, rgba(255, 250, 236, .50)),
    radial-gradient(circle at 78% 34%, rgba(255, 255, 255, .50), transparent 30%);
}

.block-header {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 178px;
  gap: 22px;
  align-items: end;
}

.block-layout {
  position: relative;
  margin-top: 24px;
  display: grid;
  grid-template-columns: minmax(260px, .58fr) minmax(620px, 1.38fr) minmax(250px, .56fr);
  gap: 20px;
  align-items: stretch;
}

.block-mission-board,
.block-theater,
.block-side-panel {
  border-radius: 36px;
  background: rgba(255, 250, 235, .76);
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: 0 24px 60px rgba(70, 55, 30, .12);
  backdrop-filter: blur(18px);
}

.block-mission-board {
  padding: 22px;
  align-self: stretch;
}

.builder-guide-card {
  margin: 16px 0;
  padding: 14px;
  min-height: 142px;
  border-radius: 26px;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  background: linear-gradient(135deg, rgba(255, 243, 206, .94), rgba(235, 248, 249, .80));
  border: 1px solid rgba(183, 142, 78, .18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.65);
}

.block-mascot {
  width: 86px;
  height: 86px;
  object-fit: contain;
  filter: drop-shadow(0 10px 16px rgba(81, 65, 35, .14));
}

.block-actions {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.block-actions .park-button {
  padding: 11px 16px;
  font-size: 14px;
}

.block-theater {
  padding: 22px;
  display: grid;
  gap: 15px;
}

.block-main-screen {
  position: relative;
  min-height: 535px;
  overflow: hidden;
  border-radius: 34px;
  border: 1px solid rgba(183, 142, 78, .25);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.28);
}

.block-main-screen.ready {
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.35), 0 0 0 5px rgba(124,190,139,.16);
}

.block-main-screen.active {
  animation: stageGlow 1.1s ease-in-out infinite;
}

.block-stage-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.block-side-panel {
  padding: 18px;
  display: grid;
  gap: 14px;
  align-content: start;
  align-self: stretch;
}

.block-start-card {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 3;
  width: min(420px, calc(100% - 64px));
  transform: translate(-50%, -50%);
  border-radius: 30px;
  padding: 22px 26px;
  text-align: center;
  background: rgba(255, 250, 235, .88);
  border: 1px solid rgba(183, 142, 78, .22);
  box-shadow: 0 22px 60px rgba(12, 18, 27, .24);
  backdrop-filter: blur(10px);
}

.block-start-card small,
.block-start-card strong,
.block-start-card span {
  display: block;
}

.block-start-card small {
  color: #b77945;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.block-start-card strong {
  margin-top: 8px;
  color: var(--ink);
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.04;
  letter-spacing: -.06em;
}

.block-start-card span {
  margin-top: 10px;
  color: #61706e;
  font-size: 14px;
  font-weight: 850;
  line-height: 1.45;
}

.block-action-strip {
  position: absolute;
  left: 18px;
  right: 18px;
  top: 18px;
  z-index: 3;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 11px 14px;
  border-radius: 999px;
  background: rgba(255, 250, 235, .82);
  border: 1px solid rgba(183, 142, 78, .18);
  box-shadow: 0 12px 28px rgba(12, 18, 27, .16);
  backdrop-filter: blur(8px);
}

.block-action-strip span,
.block-action-strip em {
  color: #7a6c55;
  font-size: 13px;
  font-style: normal;
  font-weight: 900;
}

.block-action-strip strong {
  min-width: 0;
  color: var(--ink);
  font-size: 18px;
  line-height: 1.15;
  letter-spacing: -.03em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.failed-card {
  background: linear-gradient(135deg, rgba(255, 230, 220, .94), rgba(255, 249, 226, .88));
}

.template-game-stage {
  display: grid;
  grid-template-columns: minmax(0, .9fr) minmax(380px, .72fr);
  gap: 24px;
}

.template-filter {
  background:
    linear-gradient(90deg, rgba(255,250,236,.94), rgba(255,250,236,.66) 48%, rgba(255,250,236,.42)),
    radial-gradient(circle at 78% 40%, rgba(255,255,255,.54), transparent 28%);
}

.template-copy {
  position: relative;
  align-self: center;
}

.template-board {
  position: relative;
  align-self: center;
  min-height: 430px;
  padding: 28px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 18px;
  text-align: center;
  overflow: hidden;
}

.board-bird {
  position: absolute;
  right: -8px;
  top: -22px;
  width: 122px;
}

.template-light {
  width: 118px;
  height: 118px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff4b6, #d7a44a);
  box-shadow: 0 0 0 28px rgba(235,190,85,.18), 0 22px 36px rgba(101,79,38,.16);
}

.template-board.active .template-light {
  background: radial-gradient(circle, #d5f7ff, #5aa5bd);
}

.template-board.done .template-light {
  background: radial-gradient(circle, #e2ffd0, #7dbb78);
}

.template-board strong {
  color: var(--ink);
  font-size: 34px;
  letter-spacing: -.04em;
}

.template-board span {
  color: #61706e;
  line-height: 1.7;
  font-weight: 850;
}

@keyframes floatOrb {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .58; }
  50% { transform: translate3d(0, -20px, 0) scale(1.08); opacity: .92; }
}

@keyframes lampPulse {
  0%, 100% { transform: scale(1); opacity: .72; }
  50% { transform: scale(1.18); opacity: 1; }
}

@keyframes stageGlow {
  0%, 100% { box-shadow: inset 0 0 0 1px rgba(255,255,255,.35), 0 0 0 4px rgba(226,179,92,.12); }
  50% { box-shadow: inset 0 0 0 1px rgba(255,255,255,.55), 0 0 0 9px rgba(226,179,92,.22); }
}

@media(max-width: 1280px) {
  .reaction-layout,
  .block-layout,
  .template-game-stage {
    grid-template-columns: 1fr;
  }

  .privacy-panel {
    grid-template-columns: minmax(240px, .6fr) minmax(240px, 1fr) minmax(180px, .6fr);
    align-items: center;
  }
}

@media(max-width: 880px) {
  .reaction-header,
  .block-header,
  .screen-top,
  .screen-console,
  .status-cards,
  .privacy-panel,
  .block-side-panel,
  .gesture-guide-card,
  .builder-guide-card,
  .action-strip {
    grid-template-columns: 1fr;
  }

  .coach-overlay {
    width: calc(100% - 30px);
    right: 15px;
    top: 15px;
  }

  .coach-speech {
    margin-left: 0;
  }

  .guide-bubble::before {
    left: 26px;
    top: -8px;
    border-left: 1px solid rgba(183, 142, 78, .16);
    border-bottom: 0;
    border-top: 1px solid rgba(183, 142, 78, .16);
    transform: rotate(45deg);
  }
}
</style>

