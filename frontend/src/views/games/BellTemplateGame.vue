<template>
  <div class="page-field">
    <section class="template-stage">
      <img :src="plaza" alt="" class="stage-bg asset-img" />
      <div class="stage-mist"></div>

      <div class="stage-copy content-layer">
        <p class="section-kicker">Special Mini Game</p>
        <h1 class="section-title">{{ game.name }}</h1>
        <p class="section-copy">轻量铃铛挑战：点击开始后敲响小铃铛，完成一次简短互动并写入手账。</p>

        <div class="stage-actions">
          <button class="park-button" @click="startRound">开始敲钟</button>
          <button class="park-button soft" @click="resetRound">重来</button>
          <RouterLink class="park-button ghost" :to="game.detailRoute">查看游玩票</RouterLink>
        </div>
      </div>

      <div class="stage-board content-layer" :class="{ active: playing, done }">
        <img :src="bird" alt="" class="board-bird asset-img" />
        <div class="signal-light" @click="finishRound"></div>
        <strong>{{ boardTitle }}</strong>
        <span>{{ boardHint }}</span>
        <button v-if="playing" class="park-button ghost" @click="finishRound">敲一下</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { findGame } from '../../data/games'
import { api } from '../../services/http'
import plaza from '../../assets/park-scenes/plaza.png'
import bird from '../../assets/park-decor/bird-guide.png'

const game = findGame('bell-template')
const playing = ref(false)
const done = ref(false)

const boardTitle = computed(() => {
  if (done.value) return '铃铛已敲响'
  if (playing.value) return '小铃铛亮了'
  return '等你开始'
})

const boardHint = computed(() => {
  if (done.value) return '这次铃铛挑战已经写入手账。'
  if (playing.value) return '点击小铃铛完成挑战。'
  return '按下开始，准备敲响小铃铛。'
})

function readRecords() {
  return JSON.parse(localStorage.getItem('gestureflow-park-records') || '[]')
}

function writeLocalRecord(record) {
  const records = readRecords()
  records.unshift(record)
  localStorage.setItem('gestureflow-park-records', JSON.stringify(records.slice(0, 20)))
}

function startRound() {
  playing.value = true
  done.value = false
}

async function finishRound() {
  if (!playing.value || done.value) return
  done.value = true
  playing.value = false

  const record = {
    id: `${game.id}-${Date.now()}`,
    gameId: game.id,
    game: game.name,
    action: game.stamp,
    createdAt: new Date().toLocaleString()
  }

  writeLocalRecord(record)

  try {
    await api.saveRecord(record)
  } catch {
    // 本地手账已经保存；后端临时不可用时不打断当前页面。
  }
}

function resetRound() {
  playing.value = false
  done.value = false
}
</script><style scoped>
.template-stage {
  position: relative;
  min-height: 650px;
  overflow: hidden;
  border-radius: 44px;
  border: 1px solid rgba(183,142,78,.22);
  box-shadow: var(--shadow);
  display: grid;
  grid-template-columns: minmax(0, .92fr) minmax(360px, .82fr);
  gap: 24px;
  padding: clamp(30px, 5vw, 64px);
}

.stage-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stage-mist {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255,250,236,.92), rgba(255,250,236,.58) 46%, rgba(255,250,236,.34)),
    radial-gradient(circle at 78% 40%, rgba(255,255,255,.54), transparent 28%);
}

.stage-copy {
  align-self: center;
}

.stage-actions {
  margin-top: 26px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stage-board {
  position: relative;
  align-self: center;
  min-height: 360px;
  padding: 28px;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 14px;
  text-align: center;
  border-radius: 34px;
  background: rgba(255,255,255,.78);
  border: 1px solid rgba(183,142,78,.22);
  box-shadow: 0 20px 52px rgba(60,50,28,.12);
}

.board-bird {
  position: absolute;
  width: 118px;
  right: 16px;
  top: -72px;
}

.signal-light {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 24%, rgba(255,255,255,.96), transparent 28%),
    linear-gradient(135deg, #ffe6a3, #e6a65d);
  border: 4px solid rgba(255,255,255,.82);
  box-shadow: 0 18px 40px rgba(178,119,58,.26);
  cursor: pointer;
}

.stage-board.active .signal-light {
  animation: bellPulse 1s ease-in-out infinite;
}

.stage-board.done .signal-light {
  background: linear-gradient(135deg, #bfe8c9, #6dbb8c);
}

.stage-board strong {
  color: var(--ink);
  font-size: 30px;
  letter-spacing: -.04em;
}

.stage-board span {
  color: #687879;
  line-height: 1.7;
}

@keyframes bellPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

@media(max-width: 980px) {
  .template-stage { grid-template-columns: 1fr; }
}
</style>

