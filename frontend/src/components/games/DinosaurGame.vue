<template>
  <canvas
    ref="canvasRef"
    class="dinosaur-canvas"
    :width="world.width"
    :height="world.height"
    :style="{ filter: `invert(${isDaytime ? 0 : 100}%)` }"
    aria-label="Dinosaur runner canvas"
  ></canvas>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import pavementBulge from '../../assets/dino/pavementBulge.png'
import pavementConcave from '../../assets/dino/pavementConcave.png'
import dinosaurBothFootstep from '../../assets/dino/dinosaurBothFootstep.png'
import dinosaurLeftFootstep from '../../assets/dino/dinosaurLeftFootstep.png'
import dinosaurRightFootstep from '../../assets/dino/dinosaurRightFootstep.png'
import dinosaurCreepLeftFootstep from '../../assets/dino/dinosaurCreepLeftFootstep.png'
import dinosaurCreepRightFootstep from '../../assets/dino/dinosaurCreepRightFootstep.png'
import dinosaurDie from '../../assets/dino/dinosaurDie.png'
import cloud from '../../assets/dino/cloud.png'
import bigCactus from '../../assets/dino/bigCactus.png'
import middleCactus from '../../assets/dino/middleCactus.png'
import doubleCactus from '../../assets/dino/doubleCactus.png'
import tripleCactus from '../../assets/dino/tripleCactus.png'
import quadraCactus from '../../assets/dino/quadraCactus.png'
import pterosaurUp from '../../assets/dino/pterosaurUp.png'
import pterosaurDown from '../../assets/dino/pterosaurDown.png'

const props = defineProps({
  keyboardEnabled: {
    type: Boolean,
    default: true
  },
  autoFocus: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['ready', 'started', 'game-over', 'score', 'state-change'])

const imageResource = {
  pavementBulge,
  pavementConcave,
  cloud,
  dinosaurBothFootstep,
  dinosaurLeftFootstep,
  dinosaurRightFootstep,
  dinosaurCreepLeftFootstep,
  dinosaurCreepRightFootstep,
  dinosaurDie,
  bigCactus,
  middleCactus,
  doubleCactus,
  tripleCactus,
  quadraCactus,
  pterosaurUp,
  pterosaurDown
}

const canvasRef = ref(null)
const clock = ref(6)
const isDaytime = computed(() => clock.value >= 6 && clock.value < 18)
const INITIAL_LEVEL = 1
const MAX_LEVEL = 3
const TARGET_FRAME_MS = 1000 / 60
const MAX_FRAME_MS = 48

const world = {
  level: INITIAL_LEVEL,
  gravity: 21,
  interval: TARGET_FRAME_MS,
  width: 600,
  height: 160,
  horizonHeight: 16,
  timer: null,
  animation: 0,
  obstacleMinGap: 300,
  obstacleDistance: 0,
  obstacleList: [],
  pavementList: [],
  cloudList: [],
  score: 0,
  speed: 6,
  next(deltaMs = TARGET_FRAME_MS) {
    if (dinosaur.state !== 'alive') return

    const frameScale = deltaMs / TARGET_FRAME_MS
    const moveDistance = world.speed * world.level * frameScale

    clock.value = (clock.value + 0.0024 * world.level * frameScale) % 24
    world.score += world.speed * world.level * 0.08 * frameScale
    emit('score', Math.floor(world.score))
    dinosaur.next(deltaMs)

    world.pavementList.forEach((pavement) => {
      pavement.x -= moveDistance
    })
    const pavementList = world.pavementList.filter((item) => item.x + item.width > 0)
    const lastPavement = pavementList[pavementList.length - 1]
    let x = lastPavement.x + lastPavement.width
    while (x <= world.width) {
      const pavement = new Pavement(x)
      x += pavement.width
      pavementList.push(pavement)
    }
    world.pavementList = pavementList

    world.cloudList.forEach((item) => {
      item.x -= moveDistance
    })
    const cloudList = world.cloudList.filter((item) => item.x + item.width > 0)
    if (Math.random() < 0.01 * frameScale) cloudList.push(new Cloud(world.width))
    world.cloudList = cloudList

    world.obstacleList.forEach((obstacle) => {
      obstacle.x -= moveDistance
      if (obstacle.type === 'pterosaur') {
        obstacle.wingCounter += frameScale
        if (obstacle.wingCounter >= 10) {
          obstacle.wingCounter = 0
          obstacle.wing = obstacle.wing === 'up' ? 'down' : 'up'
        }
      }
    })
    world.obstacleList = world.obstacleList.filter((item) => item.x + item.width > 0)
    world.obstacleDistance -= moveDistance
    if (world.obstacleDistance <= 0 && Math.random() < 0.02 * frameScale) {
      world.obstacleList.push(new Obstacle(world.width))
      world.obstacleDistance = world.obstacleMinGap
    }

    detectCollision()
  }
}

const dinosaur = {
  state: 'ready',
  y: 0,
  x: 28,
  jumpSpeed: 400,
  verticalSpeed: 0,
  width: 42,
  height: 45,
  creepWidth: 57,
  creepHeight: 28,
  footstep: 'both',
  creep: false,
  footstepCounter: 0,
  next(deltaMs = TARGET_FRAME_MS) {
    if (dinosaur.state === 'alive') {
      dinosaur.footstepCounter += deltaMs / TARGET_FRAME_MS
      if (dinosaur.footstepCounter >= 6) {
        dinosaur.footstepCounter = 0
        dinosaur.footstep = dinosaur.footstep === 'left' ? 'right' : 'left'
      }
    }

    const t = deltaMs / 1000
    const gravity = world.gravity / (TARGET_FRAME_MS / 1000)
    const verticalSpeed = dinosaur.verticalSpeed
    const y = dinosaur.y + verticalSpeed * t - 0.5 * gravity * t * t
    if (y <= 0) {
      dinosaur.y = 0
      dinosaur.verticalSpeed = 0
    } else {
      dinosaur.y = y
      dinosaur.verticalSpeed -= gravity * t
    }
  }
}

let ctx = null
let resourcesReady = false
let lastEmittedState = ''
let lastFrameAt = 0

class Pavement {
  constructor(x) {
    this.x = x
    const randomness = Math.random()
    if (randomness < 0.025) {
      this.type = 'bulge'
      this.width = 14
      this.height = 5
    } else if (randomness < 0.05) {
      this.type = 'concave'
      this.width = 11
      this.height = 3
    } else if (randomness < 0.2) {
      this.type = 'stone'
      this.width = 2 + Math.ceil(Math.random() * 3)
      this.height = 2 + Math.round(Math.random() * 3)
    } else {
      this.type = 'flat'
      this.width = 5 + Math.round(Math.random() * 3)
    }
  }
}

class Obstacle {
  static types = [
    { type: 'bigCactus', width: 25, height: 48, collisionPadding: { x: 5, y: 3 } },
    { type: 'middleCactus', width: 17, height: 35, collisionPadding: { x: 5, y: 3 } },
    { type: 'doubleCactus', width: 34, height: 35, collisionPadding: { x: 5, y: 3 } },
    { type: 'tripleCactus', width: 51, height: 35, collisionPadding: { x: 7, y: 3 } },
    { type: 'quadraCactus', width: 75, height: 49, collisionPadding: { x: 10, y: 5 } },
    { type: 'pterosaur', width: 44, height: 38, collisionPadding: { x: 7, y: 4 } }
  ]

  constructor(x) {
    this.x = x
    const type = Obstacle.types[Math.floor(Math.random() * Obstacle.types.length)]
    this.type = type.type
    this.width = type.width
    this.height = type.height
    this.y = 0
    this.collisionPadding = type.collisionPadding || { x: 0, y: 0 }
    if (this.type === 'pterosaur') {
      this.wingCounter = 0
      this.wing = 'up'
      this.y = Math.round(Math.random() * (world.height - world.horizonHeight))
    }
  }
}

class Cloud {
  constructor(x) {
    this.x = x
    this.width = 48
    this.height = 15
    const skyHeight = world.height - world.horizonHeight - this.height
    this.y = Math.random() * skyHeight
  }
}

function initGame() {
  dinosaur.state = 'ready'
  dinosaur.y = 0
  dinosaur.verticalSpeed = 0
  dinosaur.footstep = 'both'
  dinosaur.creep = false
  dinosaur.footstepCounter = 0
  world.obstacleDistance = 0
  world.obstacleList = []
  world.pavementList = []
  world.cloudList = []
  world.level = INITIAL_LEVEL
  world.score = 0
  clock.value = 6
  createPavement()
  createCloud()
  restartLevelTimer()
  if (!ctx) ctx = canvasRef.value.getContext('2d')
  startRenderLoop()
  emitState()
}

function restartLevelTimer() {
  if (world.timer) clearInterval(world.timer)
  world.timer = window.setInterval(() => {
    const level = world.level + 0.1
    world.level = level > MAX_LEVEL ? MAX_LEVEL : level
  }, 10 * 1000)
}

function startRenderLoop() {
  if (world.animation) window.cancelAnimationFrame(world.animation)
  lastFrameAt = 0

  const render = (timestamp) => {
    if (!lastFrameAt) lastFrameAt = timestamp
    const deltaMs = Math.min(MAX_FRAME_MS, Math.max(0, timestamp - lastFrameAt))
    lastFrameAt = timestamp

    world.next(deltaMs || TARGET_FRAME_MS)
    ctx.clearRect(0, 0, world.width, world.height)
    drawHorizon()
    drawCloud()
    drawObstacle()
    drawDinosaur()
    drawScore()
    emitState()
    world.animation = window.requestAnimationFrame(render)
  }

  world.animation = window.requestAnimationFrame(render)
}

function createPavement() {
  const pavementList = []
  let x = 0
  while (x <= world.width) {
    const pavement = new Pavement(x)
    x += pavement.width
    pavementList.push(pavement)
  }
  world.pavementList = pavementList
}

function createCloud() {
  const cloudList = []
  const cloudCount = Math.round(Math.random() * 6)
  for (let i = 0; i < cloudCount; i += 1) {
    cloudList.push(new Cloud(Math.random() * world.width))
  }
  world.cloudList = cloudList
}

function detectCollision() {
  const dinosaurWidth = dinosaur.creep ? dinosaur.creepWidth : dinosaur.width
  const dinosaurHeight = dinosaur.creep ? dinosaur.creepHeight : dinosaur.height

  for (const obstacle of world.obstacleList) {
    const padding = obstacle.collisionPadding || { x: 0, y: 0 }
    const x1 = obstacle.x + padding.x
    const y1 = world.height - world.horizonHeight - obstacle.y - obstacle.height + padding.y
    const x2 = obstacle.x + obstacle.width - padding.x
    const y2 = world.height - world.horizonHeight - obstacle.y - padding.y
    const x3 = dinosaur.x
    const y3 = world.height - world.horizonHeight - dinosaur.y - dinosaurHeight
    const x4 = x3 + dinosaurWidth
    const y4 = y3 + dinosaurHeight

    if (!(x2 <= x3 || x4 <= x1 || y2 <= y3 || y4 <= y1)) {
      dinosaur.state = 'die'
      dinosaur.creep = false
      emit('game-over', getSnapshot())
      break
    }
  }
}

function drawHorizon() {
  world.pavementList.forEach((pavement) => {
    if (['flat', 'stone'].includes(pavement.type)) {
      ctx.beginPath()
      ctx.moveTo(pavement.x, world.height - world.horizonHeight - 0.5)
      ctx.lineTo(pavement.x + pavement.width, world.height - world.horizonHeight - 0.5)
      ctx.strokeStyle = 'rgb(83, 83, 83)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.closePath()
    }

    if (pavement.type === 'stone') {
      ctx.beginPath()
      ctx.moveTo(pavement.x, world.height - world.horizonHeight - 0.5 + pavement.height)
      ctx.lineTo(pavement.x + pavement.width, world.height - world.horizonHeight - 0.5 + pavement.height)
      ctx.strokeStyle = 'rgb(83, 83, 83)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.closePath()
    }

    if (pavement.type === 'bulge') {
      ctx.drawImage(imageResource.pavementBulge, pavement.x, world.height - world.horizonHeight - pavement.height)
    }

    if (pavement.type === 'concave') {
      ctx.drawImage(imageResource.pavementConcave, pavement.x, world.height - world.horizonHeight - 1)
    }
  })
}

function drawCloud() {
  world.cloudList.forEach((item) => {
    ctx.drawImage(imageResource.cloud, item.x, item.y)
  })
}

function drawDinosaur() {
  let dinosaurImage
  let y = world.height - world.horizonHeight - dinosaur.y

  if (dinosaur.state === 'ready') {
    dinosaurImage = imageResource.dinosaurBothFootstep
    y -= dinosaur.height
  } else if (dinosaur.state === 'alive') {
    if (dinosaur.creep) {
      dinosaurImage = dinosaur.footstep === 'left' ? imageResource.dinosaurCreepLeftFootstep : imageResource.dinosaurCreepRightFootstep
      y -= dinosaur.creepHeight
    } else {
      dinosaurImage = dinosaur.footstep === 'left' ? imageResource.dinosaurLeftFootstep : imageResource.dinosaurRightFootstep
      y -= dinosaur.height
    }
  } else {
    dinosaurImage = imageResource.dinosaurDie
    y -= dinosaur.height
  }

  ctx.drawImage(dinosaurImage, dinosaur.x, y)
}

function drawObstacle() {
  world.obstacleList.forEach((obstacle) => {
    if (['bigCactus', 'middleCactus', 'doubleCactus', 'tripleCactus', 'quadraCactus'].includes(obstacle.type)) {
      ctx.drawImage(imageResource[obstacle.type], obstacle.x, world.height - world.horizonHeight - obstacle.height)
    }

    if (obstacle.type === 'pterosaur') {
      const wingImage = obstacle.wing === 'up' ? imageResource.pterosaurUp : imageResource.pterosaurDown
      ctx.drawImage(wingImage, obstacle.x, world.height - world.horizonHeight - obstacle.y - obstacle.height)
    }
  })
}

function drawScore() {
  ctx.save()
  ctx.font = '700 12px monospace'
  ctx.fillStyle = 'rgb(83, 83, 83)'
  ctx.textAlign = 'right'
  ctx.fillText(String(Math.floor(world.score)).padStart(5, '0'), world.width - 12, 18)
  ctx.restore()
}

function loadImageResource() {
  const promises = []
  for (const key in imageResource) {
    promises.push(new Promise((resolve) => {
      const img = document.createElement('img')
      img.src = imageResource[key]
      img.onload = () => {
        imageResource[key] = img
        resolve()
      }
      img.onerror = resolve
    }))
  }
  return Promise.all(promises)
}

function start() {
  if (dinosaur.state === 'alive') return
  if (dinosaur.state === 'die') initGame()
  dinosaur.state = 'alive'
  emit('started', getSnapshot())
  emitState()
}

function restart() {
  initGame()
  start()
}

function jump() {
  if (dinosaur.state !== 'alive') {
    start()
  }
  if (dinosaur.y === 0) {
    dinosaur.creep = false
    dinosaur.verticalSpeed = dinosaur.jumpSpeed
  }
}

function setDucking(value) {
  if (dinosaur.state !== 'alive') return
  dinosaur.creep = Boolean(value) && dinosaur.y === 0
}

function handleKeydown(event) {
  if (!props.keyboardEnabled) return
  if (['ArrowUp', 'Space', 'KeyW'].includes(event.code)) {
    event.preventDefault()
    jump()
  } else if (['ArrowDown', 'KeyS'].includes(event.code)) {
    event.preventDefault()
    if (dinosaur.state !== 'alive') start()
    setDucking(true)
  }
}

function handleKeyup(event) {
  if (!props.keyboardEnabled) return
  if (['ArrowDown', 'KeyS'].includes(event.code)) {
    event.preventDefault()
    setDucking(false)
  }
}

function emitState() {
  if (lastEmittedState === dinosaur.state) return
  lastEmittedState = dinosaur.state
  emit('state-change', getSnapshot())
}

function getSnapshot() {
  return {
    state: dinosaur.state,
    score: Math.floor(world.score),
    level: world.level,
    ducking: dinosaur.creep,
    airborne: dinosaur.y > 0
  }
}

function cleanup() {
  if (world.animation) {
    window.cancelAnimationFrame(world.animation)
    world.animation = 0
  }
  if (world.timer) {
    clearInterval(world.timer)
    world.timer = null
  }
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
}

onMounted(async () => {
  await loadImageResource()
  resourcesReady = true
  initGame()
  if (props.keyboardEnabled) {
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keyup', handleKeyup)
  }
  if (props.autoFocus) canvasRef.value?.focus()
  emit('ready', getSnapshot())
})

onBeforeUnmount(() => {
  cleanup()
})

defineExpose({
  start,
  restart,
  jump,
  setDucking,
  getSnapshot,
  isReady: () => resourcesReady
})
</script>

<style scoped>
.dinosaur-canvas {
  display: block;
  width: 100%;
  max-width: 900px;
  aspect-ratio: 15 / 4;
  margin: 0 auto;
  border: 1px solid rgba(83, 83, 83, .38);
  border-radius: 12px;
  background-color: white;
  image-rendering: pixelated;
  transition: filter .5s ease;
}
</style>
