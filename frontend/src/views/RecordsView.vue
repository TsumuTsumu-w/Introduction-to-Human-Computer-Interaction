<template>
  <div class="page-field">
    <section class="records-desk">
      <img :src="handbook" alt="" class="records-bg asset-img" />
      <div class="records-mist"></div>
      <div class="records-copy content-layer">
        <p class="section-kicker">Stamp Notebook</p>
        <h1 class="section-title">手账</h1>
        <p class="section-copy">查看已经完成的小游戏记录，回顾每一次园区体验。</p>
      </div>
    </section>

    <section class="paper-card notebook">
      <img :src="decor" alt="" class="decor asset-img" />

      <div v-if="records.length" class="stamp-list content-layer">
        <article v-for="record in records" :key="record.id" class="stamp-row">
          <span>{{ shortName(record.gameId) }}</span>
          <div>
            <b>{{ record.game }}</b>
            <small>{{ record.action }} · {{ record.createdAt }}</small>
          </div>
        </article>
      </div>

      <div v-else class="empty-note content-layer">
        <img :src="rabbit" alt="" class="empty-rabbit asset-img" />
        <h2>手账还没有记录</h2>
        <p>先进入任意一个小游戏，完成后这里会出现对应游玩记录。</p>
        <RouterLink class="park-button" to="/games">去游戏庭</RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { gameShortName } from '../data/games'
import handbook from '../assets/park-scenes/handbook-corner.png'
import rabbit from '../assets/park-decor/rabbit-ticket.png'
import decor from '../assets/park-decor/decor-sheet.png'

const records = ref([])

function shortName(gameId) {
  return gameShortName(gameId).slice(0, 2)
}

onMounted(() => {
  records.value = JSON.parse(localStorage.getItem('gestureflow-park-records') || '[]')
})
</script>

<style scoped>
.records-desk {
  position: relative;
  min-height: 340px;
  overflow: hidden;
  border-radius: 40px;
  border: 1px solid rgba(183,142,78,.22);
  box-shadow: var(--shadow);
}

.records-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.records-mist {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255,250,236,.94), rgba(255,250,236,.58), rgba(255,250,236,.30));
}

.records-copy {
  padding: clamp(34px, 5vw, 62px);
}

.notebook {
  min-height: 420px;
  padding: clamp(30px, 5vw, 52px);
  overflow: hidden;
}

.decor {
  position: absolute;
  right: -170px;
  top: -160px;
  width: 620px;
  opacity: .18;
}

.empty-note {
  text-align: center;
}

.empty-rabbit {
  width: 180px;
  margin: -26px auto 4px;
}

.empty-note h2 {
  margin: 0;
  color: var(--ink);
  font-size: 36px;
  letter-spacing: -.05em;
}

.empty-note p {
  color: #667370;
}

.stamp-list {
  display: grid;
  gap: 14px;
}

.stamp-row {
  min-height: 92px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px;
  border-radius: 24px;
  background: rgba(255,255,255,.64);
  border: 1px solid rgba(183,142,78,.18);
}

.stamp-row span {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255,238,187,.78);
  color: #b77945;
  font-weight: 950;
  border: 1px solid rgba(183,142,78,.24);
}

.stamp-row b {
  display: block;
  color: var(--ink);
  font-size: 20px;
}

.stamp-row small {
  display: block;
  margin-top: 5px;
  color: #697a78;
}
</style>
