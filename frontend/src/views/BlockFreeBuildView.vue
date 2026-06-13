
<template>
  <main class="voxel-page" :class="{ immersive: blockState.immersive }" aria-label="三维体素自由建造园">
    <div ref="stageHostRef" class="three-host"></div>
    <video ref="videoRef" class="hidden-video" autoplay playsinline muted></video>

    <section class="center-crosshair" :class="{ danger: blockState.gesture?.mode === 'pinchDelete', place: !!blockState.world?.target?.place }" aria-label="屏幕中心准星">
      <span class="crosshair-ring"></span>
      <span class="crosshair-line horizontal"></span>
      <span class="crosshair-line vertical"></span>
      <div class="crosshair-label">
        <b>{{ crosshairTitle }}</b>
        <small>{{ crosshairHint }}</small>
      </div>
    </section>

    <header v-if="!blockState.immersive" class="topbar">
      <section class="brand-card">
        <img :src="blockMascot" alt="" />
        <div>
          <small>GestureFlow Park</small>
          <strong>三维体素自由建造园</strong>
          <span>真实 1×1×1 方块 · 评分识别 · 模式锁定 · 准星建造</span>
        </div>
      </section>
      <nav class="top-actions">
        <button type="button" @click="setView('reset')">重置视角</button>
        <button type="button" @click="setView('near')">近处建造</button>
        <button type="button" @click="setView('top')">垂直俯视</button>
        <button type="button" @click="toggleImmersive">隐藏界面</button>
        <button type="button" @click="goGarden">返回游戏庭</button>
        <button type="button" class="dark" @click="goDashboard">离开园区</button>
      </nav>
    </header>

    <aside v-if="!blockState.immersive" class="left-panel">
      <section class="panel hero">
        <span class="pill">自由创造</span>
        <h1>{{ blockPrompt.title }}</h1>
        <p>{{ blockPrompt.hint }}</p>
        <div class="rule-card"><b>核心规则</b><span>强排斥评分式识别 + 用户视角方向修正：先给每根手指评分，再用强排斥规则区分张开手、握拳、捏合、一指、两指、三指、四指：食指明显伸出时禁止握拳，四指加拇指展开优先判张开手。</span></div>
        <div class="gesture-grid">
          <span><b>张开手</b>停止/准备</span><span><b>一指</b>用户视角水平移动</span><span><b>两指</b>用户视角横向旋转</span><span><b>三指</b>上下调俯仰</span><span><b>四指</b>快速升降高度</span><span><b>握拳</b>放置</span><span><b>捏合</b>删除</span>
        </div>
      </section>
      <section class="panel"><b>控制手感</b><div class="difficulty-switch"><button v-for="item in blockDifficultyLevels" :key="item.id" type="button" :class="{ active: blockDifficultyId === item.id }" @click="setBlockDifficulty(item.id)"><strong>{{ item.name }}</strong><small>{{ item.id === 'calm' ? '更稳定' : '更灵敏' }}</small></button></div><p>{{ blockDifficulty.label }}</p></section>
      <section class="panel"><b>当前状态</b><p>只保存方块坐标和材质；左右按用户视角，三指/四指使用进入模式时的手部位置为中点，新增/删除时才更新 mesh。</p></section>
      <section class="button-grid"><button class="main-btn" type="button" @click="requestBlockCamera">{{ blockCameraRunning ? '重新申请摄像头' : '申请摄像头' }}</button><button class="main-btn soft" type="button" :disabled="!blockCanStart" @click="startBlockRound">开始创造</button><button class="main-btn ghost" type="button" @click="clearBlockStage">清空世界</button><button class="main-btn ghost" type="button" @click="changeBlockPiece">换方块</button></section>
    </aside>

    <aside class="right-panel" :class="{ mini: blockState.immersive }">
      <section class="privacy-card"><div class="privacy-head"><b>隐私副屏</b><span>强模糊，只确认手部区域</span></div><canvas ref="privacyCanvasRef" class="privacy-canvas"></canvas></section>
      <template v-if="!blockState.immersive"><article class="status-card" :class="{ good: blockCameraRunning }"><b>摄像头</b><span>{{ blockCameraStatus }}</span></article><article class="status-card"><b>创造状态</b><span>{{ blockState.feedback }}</span></article></template>
      <button v-if="blockState.immersive" class="exit-immersive" type="button" @click="toggleImmersive">退出沉浸</button>
    </aside>

    <footer v-if="!blockState.immersive" class="bottom-dock">
      <div class="dock-stat"><small>方块数</small><strong>{{ blockSummary.blocks }}</strong></div><div class="dock-stat"><small>最高</small><strong>{{ blockSummary.maxHeight }}层</strong></div><div class="dock-stat wide"><small>当前方块</small><strong>{{ blockSummary.currentPiece }}</strong><span>1×1×1</span></div><div class="dock-stat"><small>俯视角</small><strong>{{ Math.round(blockSummary.cameraPitch) }}°</strong></div><div class="dock-stat"><small>高度</small><strong>{{ blockSummary.cameraHeight.toFixed(1) }}</strong></div><div class="dock-message"><b>{{ blockFeedbackTitle }}</b><span>{{ blockState.feedback }}</span></div>
    </footer>
    <button v-if="blockState.immersive" class="immersive-exit-floating" type="button" @click="toggleImmersive">退出沉浸</button>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createGestureEngine, drawPrivacyPreview, scoreSkeletonQuality } from '../utils/gesture/mediapipeGestureEngine'
import { createVoxelThreeScene } from '../games/voxelFreeBuild/voxelThreeScene'
import { MAGIC_BLOCK_DIFFICULTIES, clearMagicBlockStage, createMagicBlockState, cycleMagicBlockShape, getMagicBlockDifficulty, getMagicBlockPrompt, getMagicBlockSummary, resetMagicBlockState, setMagicBlockViewMode, startMagicBlockState, toggleMagicBlockImmersive, updateMagicBlockFrame } from '../games/magicBlockBuilderLogic'
import blockMascot from '../assets/park-decor/magic-block-mascot.svg'

const router = useRouter()
const stageHostRef = ref(null)
const videoRef = ref(null)
const privacyCanvasRef = ref(null)

const blockDifficultyLevels = MAGIC_BLOCK_DIFFICULTIES
const blockDifficultyId = ref('responsive')
const blockDifficulty = computed(() => getMagicBlockDifficulty(blockDifficultyId.value))
const blockState = ref(createMagicBlockState(blockDifficulty.value))
const blockFrame = ref(null)
const blockQuality = ref({ ready: false, score: 0, size: 0 })
const blockCameraRunning = ref(false)
const blockCameraStatus = ref('未申请')

let blockGestureEngine = null
let stream = null
let rafId = 0
let processing = false
let threeScene = null

const blockSummary = computed(() => getMagicBlockSummary(blockState.value))
const blockPrompt = computed(() => getMagicBlockPrompt(blockState.value))
const blockBusy = computed(() => ['seeking', 'playing'].includes(blockState.value.phase))
const blockCanStart = computed(() => blockCameraRunning.value && !blockBusy.value)
const blockFeedbackTitle = computed(() => blockState.value.phase === 'seeking' ? '寻找手部' : (blockState.value.gesture?.hasHand ? '自由建造' : '等待手势'))

const crosshairTitle = computed(() => {
  const target = blockState.value.world?.target
  const mode = blockState.value.gesture?.mode
  if (mode === 'pinchDelete' && target?.hitBlock) return '可删除'
  if (target?.place && target?.hitBlock) return target.attachFaceText === '顶部' ? '顶部叠放' : '侧面放置'
  if (target?.place) return '地面放置'
  if (target?.hitBlock) return '命中方块'
  return '准星'
})
const crosshairHint = computed(() => {
  const target = blockState.value.world?.target
  const mode = blockState.value.gesture?.mode
  if (mode === 'indexMove') return blockState.value.gesture?.moveVector?.label || '一指移动'
  if (mode === 'twoFingerYaw') return '两指横向旋转'
  if (mode === 'threeFingerPitch') return '三指调俯仰'
  if (mode === 'fourFingerHeight') return '四指升降高度'
  if (mode === 'pinchDelete') return target?.hitBlock ? '捏合确认删除' : '未命中方块'
  if (mode === 'fistPlace') return target?.place ? '握拳确认放置' : '当前不可放置'
  if (target?.attachFaceText) return target.attachFaceText
  return '屏幕中心射线目标'
})

onMounted(async () => { await nextTick(); threeScene = createVoxelThreeScene(stageHostRef.value); startRenderLoop() })

function startRenderLoop() {
  cancelAnimationFrame(rafId)
  const loop = () => {
    const now = Date.now()
    if (blockCameraRunning.value && videoRef.value?.readyState >= 2 && blockGestureEngine && !processing) {
      processing = true
      try { const frame = blockGestureEngine.recognize(videoRef.value, performance.now()); blockFrame.value = frame; blockQuality.value = scoreSkeletonQuality(frame); blockState.value = updateMagicBlockFrame(blockState.value, frame, blockDifficulty.value, now) }
      catch (error) { blockState.value = { ...blockState.value, feedback: error?.message || '识别暂时中断。' } }
      finally { processing = false }
    } else {
      blockState.value = updateMagicBlockFrame(blockState.value, null, blockDifficulty.value, now)
    }
    threeScene?.render(blockState.value.world)
    drawPrivacyPreview(privacyCanvasRef.value, videoRef.value, blockFrame.value)
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
}

async function requestBlockCamera() {
  try {
    blockCameraStatus.value = '正在申请视频权限'
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器不支持摄像头访问，或页面不是 localhost/https。')
    if (!blockGestureEngine) { blockCameraStatus.value = '正在加载手势识别模型'; blockGestureEngine = await createGestureEngine() }
    await nextTick(); stopCamera(false)
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false })
    videoRef.value.srcObject = stream; await videoRef.value.play()
    blockCameraRunning.value = true; blockCameraStatus.value = '已开启'
    blockState.value = { ...blockState.value, cameraReady: true, phase: 'ready', feedback: '摄像头已开启。点击开始创造。' }
  } catch (error) { blockCameraStatus.value = '申请失败'; blockCameraRunning.value = false; blockState.value = { ...blockState.value, feedback: error?.message || '摄像头申请失败。' } }
}
function startBlockRound() { blockState.value = startMagicBlockState(blockState.value, Date.now()) }
function setBlockDifficulty(id) { if (blockBusy.value) return; blockDifficultyId.value = id; blockState.value = resetMagicBlockState(blockDifficulty.value, blockCameraRunning.value) }
function setView(id) { blockState.value = setMagicBlockViewMode(blockState.value, id) }
function changeBlockPiece() { blockState.value = cycleMagicBlockShape(blockState.value, blockDifficulty.value, Date.now()) }
function clearBlockStage() { blockState.value = clearMagicBlockStage(blockState.value, blockDifficulty.value, Date.now()) }
function toggleImmersive() { blockState.value = toggleMagicBlockImmersive(blockState.value) }
function stopCamera(updateText = true) { if (stream) { stream.getTracks().forEach((track) => track.stop()); stream = null } blockCameraRunning.value = false; blockFrame.value = null; blockQuality.value = { ready: false, score: 0, size: 0 }; if (updateText) blockCameraStatus.value = '未申请' }
function goGarden() { router.push('/games') }
function goDashboard() { router.push('/dashboard') }
onBeforeUnmount(() => { cancelAnimationFrame(rafId); stopCamera(false); threeScene?.dispose(); if (blockGestureEngine) { blockGestureEngine.close(); blockGestureEngine = null } })
</script>

<style scoped>
.voxel-page{position:fixed;inset:0;z-index:80;overflow:hidden;color:#263650;background:#b9dcf6;font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif}.voxel-page *,.voxel-page *::before,.voxel-page *::after{box-sizing:border-box}button{font:inherit}.three-host,.hidden-video{position:absolute;inset:0}.three-host :deep(canvas),.voxel-webgl-canvas{width:100%!important;height:100%!important;display:block}.hidden-video{opacity:0;pointer-events:none}.topbar,.left-panel,.right-panel,.bottom-dock{position:absolute;z-index:5}.topbar{left:26px;right:26px;top:22px;display:flex;align-items:center;justify-content:space-between;gap:18px;pointer-events:none}.brand-card,.top-actions,.panel,.privacy-card,.status-card,.bottom-dock,.dock-stat,.dock-message{backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);background:rgba(255,250,235,.80);border:1px solid rgba(183,142,78,.20);box-shadow:0 18px 46px rgba(70,55,30,.12)}.brand-card{width:min(610px,48vw);min-height:74px;border-radius:28px;padding:10px 18px;display:flex;align-items:center;gap:14px;pointer-events:auto}.brand-card img{width:54px;height:54px}.brand-card small,.brand-card strong,.brand-card span{display:block}.brand-card small{color:#b77945;font-size:11px;font-weight:950;letter-spacing:.18em;text-transform:uppercase}.brand-card strong{font-size:22px;font-weight:950;line-height:1.08}.brand-card span{color:#667370;font-size:12px;font-weight:850}.top-actions{display:flex;gap:8px;padding:8px;border-radius:999px;pointer-events:auto}.top-actions button,.exit-immersive,.immersive-exit-floating{border:0;border-radius:999px;padding:10px 15px;font-size:12px;font-weight:950;color:#263650;background:rgba(255,255,255,.86);cursor:pointer}.top-actions button.dark{color:#fff8e8;background:#263650}.left-panel{left:24px;top:122px;width:min(292px,19vw);max-height:calc(100vh - 210px);display:grid;gap:10px;overflow-y:auto;scrollbar-width:thin}.panel{border-radius:26px;padding:16px}.pill{display:inline-flex;padding:6px 11px;border-radius:999px;background:rgba(255,245,211,.88);color:#a86e33;font-size:12px;font-weight:950}.panel h1{margin:12px 0 8px;font-size:27px;line-height:1.05}.panel p,.rule-card span{margin:0;color:#5f6f70;font-size:13px;line-height:1.55;font-weight:820}.rule-card{margin-top:12px;padding:13px;border-radius:18px;background:rgba(235,248,236,.72);border:1px solid rgba(142,183,125,.20)}.rule-card b,.rule-card span{display:block}.rule-card b{margin-bottom:4px}.gesture-grid{margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.gesture-grid span{padding:9px 7px;border-radius:14px;text-align:center;background:rgba(255,255,255,.65);font-size:11px;font-weight:850}.gesture-grid b{display:block;font-size:12px;font-weight:950}.difficulty-switch{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin:10px 0}.difficulty-switch button{min-height:58px;border:0;border-radius:17px;color:#7a623a;background:rgba(255,247,224,.86);cursor:pointer}.difficulty-switch button.active{color:#263650;background:linear-gradient(135deg,#f0b66a,#f6d98b)}.difficulty-switch strong,.difficulty-switch small{display:block;font-weight:950}.button-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.main-btn{border:0;border-radius:999px;min-height:44px;padding:10px 12px;color:#fff8e8;background:linear-gradient(135deg,#efb05f,#e99972);font-size:13px;font-weight:950;cursor:pointer;box-shadow:0 12px 24px rgba(178,109,48,.18)}.main-btn.soft,.main-btn.ghost{color:#263650;background:rgba(255,255,255,.78);box-shadow:inset 0 0 0 1px rgba(183,142,78,.16)}.main-btn:disabled{opacity:.45;cursor:not-allowed}.right-panel{right:24px;top:126px;width:min(274px,18vw);display:grid;gap:11px}.right-panel.mini{top:24px;right:24px;width:240px}.privacy-card,.status-card{border-radius:24px;padding:14px}.privacy-head b,.privacy-head span,.status-card b,.status-card span{display:block}.privacy-head b,.status-card b{font-size:18px;font-weight:950}.privacy-head span,.status-card span{margin-top:4px;color:#657473;font-size:12px;font-weight:850;line-height:1.42}.privacy-canvas{margin-top:12px;width:100%;height:126px;border-radius:22px;background:#17243a}.status-card.good{box-shadow:inset 0 0 0 2px rgba(124,190,139,.22),0 18px 46px rgba(70,55,30,.12)}.exit-immersive{justify-self:end;color:#fff8e8;background:#263650}.immersive-exit-floating{position:absolute;right:24px;top:196px;z-index:8;color:#fff8e8;background:#263650}.bottom-dock{left:50%;bottom:18px;transform:translateX(-50%);width:min(860px,calc(100vw - 580px));min-width:640px;border-radius:30px;padding:10px;display:grid;grid-template-columns:92px 92px 170px 92px 92px 1fr;gap:9px;align-items:stretch}.dock-stat,.dock-message{border-radius:20px;padding:10px 12px;background:rgba(255,255,255,.82);box-shadow:none;text-align:center}.dock-stat small,.dock-stat strong,.dock-stat span,.dock-message b,.dock-message span{display:block}.dock-stat small{color:#8a8f86;font-size:11px;font-weight:900}.dock-stat strong{margin-top:2px;font-size:23px;font-weight:950}.dock-stat.wide strong{font-size:17px}.dock-stat span{color:#b77945;font-size:11px;font-weight:900}.dock-message{text-align:left}.dock-message b{font-size:16px;font-weight:950}.dock-message span{margin-top:4px;color:#657473;font-size:12px;line-height:1.35;font-weight:820}.center-crosshair{position:absolute;left:50%;top:50%;z-index:7;transform:translate(-50%,-50%);width:150px;height:150px;pointer-events:none;display:grid;place-items:center}.crosshair-ring{position:absolute;width:42px;height:42px;border-radius:999px;border:2px solid rgba(255,255,255,.82);box-shadow:0 0 0 1px rgba(37,52,75,.38),0 8px 26px rgba(31,44,58,.18)}.crosshair-line{position:absolute;background:rgba(38,54,80,.72);box-shadow:0 0 0 1px rgba(255,255,255,.44)}.crosshair-line.horizontal{width:34px;height:2px}.crosshair-line.vertical{width:2px;height:34px}.crosshair-label{position:absolute;top:96px;min-width:112px;max-width:176px;padding:7px 12px;border-radius:999px;text-align:center;background:rgba(255,250,235,.86);border:1px solid rgba(80,74,49,.18);box-shadow:0 12px 28px rgba(45,36,21,.16);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.crosshair-label b,.crosshair-label small{display:block;white-space:nowrap}.crosshair-label b{font-size:13px;font-weight:950;color:#263650}.crosshair-label small{margin-top:2px;font-size:10px;font-weight:900;color:#69716b}.center-crosshair.place .crosshair-ring{border-color:rgba(106,224,138,.90);box-shadow:0 0 0 1px rgba(37,98,59,.42),0 0 24px rgba(93,220,132,.22)}.center-crosshair.danger .crosshair-ring{border-color:rgba(255,105,88,.92);box-shadow:0 0 0 1px rgba(116,43,34,.42),0 0 24px rgba(255,89,72,.24)}.voxel-page.immersive .three-host{cursor:none}@media (max-width:1180px){.left-panel{width:270px}.right-panel{width:250px}.bottom-dock{min-width:560px;width:calc(100vw - 540px);grid-template-columns:80px 80px 138px 80px 80px 1fr}}
</style>


