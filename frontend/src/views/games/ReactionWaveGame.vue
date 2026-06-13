<template>
  <div class="page-field">
    <section class="template-stage">
      <img :src="plaza" alt="" class="stage-bg asset-img" />
      <div class="stage-mist"></div>

      <div class="stage-copy content-layer">
        <p class="section-kicker">Current Game</p>
        <h1 class="section-title">{{ game.name }}</h1>
        <p class="section-copy">这是当前真实示例游戏。后续如果要接入正式输入逻辑，只在这个游戏自己的页面里改。</p>

        <div class="stage-actions">
          <button class="park-button" @click="startRound">开始一局</button>
          <button class="park-button soft" @click="resetRound">重来</button>
          <RouterLink class="park-button ghost" :to="game.detailRoute">查看游玩票</RouterLink>
        </div>

        <div class="structure-note">
          页面文件：{{ game.pageFile }}。记录字段：gameId / game / action / createdAt。
        </div>
      </div>

      <div class="stage-board content-layer" :class="{ active: playing, done }">
        <img :src="bird" alt="" class="board-bird asset-img" />
        <div class="signal-light" @click="finishRound"></div>
        <strong>{{ boardTitle }}</strong>
        <span>{{ boardHint }}</span>
        <button v-if="playing" class="park-button ghost" @click="finishRound">点亮回应</button>
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

const game = findGame('reaction-wave')
const playing = ref(false)
const done = ref(false)

const boardTitle = computed(() => {
  if (done.value) return '盖章完成'
  if (playing.value) return '小灯亮了'
  return '等你开始'
})

const boardHint = computed(() => {
  if (done.value) return '这一局已经写进本地手账。'
  if (playing.value) return '轻轻点一下，完成这次回应。'
  return '按下开始一局，游玩板就会亮。'
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
  min-height: 430px;
  padding: 34px;
  border-radius: 38px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 18px;
  text-align: center;
  background: rgba(255,250,235,.76);
  border: 1px solid rgba(183,142,78,.24);
  box-shadow: 0 24px 60px rgba(70,55,30,.14);
  overflow: hidden;
}

.board-bird {
  position: absolute;
  right: -8px;
  top: -22px;
  width: 122px;
}

.signal-light {
  width: 118px;
  height: 118px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff4b6, #d7a44a);
  box-shadow: 0 0 0 28px rgba(235,190,85,.18), 0 22px 36px rgba(101,79,38,.16);
  cursor: pointer;
}

.stage-board.active .signal-light {
  background: radial-gradient(circle, #d5f7ff, #5aa5bd);
  box-shadow: 0 0 0 28px rgba(118,205,225,.2), 0 22px 36px rgba(52,87,101,.16);
}

.stage-board.done .signal-light {
  background: radial-gradient(circle, #e2ffd0, #7dbb78);
}

.stage-board strong {
  color: var(--ink);
  font-size: 34px;
  letter-spacing: -.04em;
}

.stage-board span {
  color: #61706e;
}

.structure-note {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255,255,255,.55);
  border: 1px solid rgba(183,142,78,.18);
  color: #687879;
  line-height: 1.6;
  font-size: 13px;
}

@media(max-width: 900px) {
  .template-stage { grid-template-columns: 1fr; }
}
</style>
