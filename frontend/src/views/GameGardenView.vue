<template>
  <div class="page-field">
    <section class="garden-scene">
      <img :src="gameLane" alt="" class="garden-bg asset-img" />
      <div class="garden-layer"></div>
      <div class="garden-copy content-layer">
        <p class="section-kicker">Game Garden</p>
        <h1 class="section-title">游戏庭</h1>
        <p class="section-copy">选择一个小游戏进入游玩。每张游戏票都对应独立规则和专属游玩页面。</p>
      </div>
    </section>

    <section class="game-list">
      <article v-for="game in games" :key="game.id" class="game-ticket" :class="[`tone-${game.tone}`, { template: game.template }]">
        <div class="ticket-top">
          <span class="badge">{{ game.tag }}</span>
          <small>{{ game.theme }}</small>
        </div>
        <h2>{{ game.name }}</h2>
        <p>{{ game.summary }}</p>
        <div class="ticket-focus">
          <b>体验重点</b>
          <span>{{ game.coverLine || game.summary }}</span>
        </div>
        <div class="ticket-actions">
          <RouterLink class="park-button" :to="game.route">进入游戏</RouterLink>
          <RouterLink class="park-button soft" :to="game.detailRoute">游玩票</RouterLink>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { games } from '../data/games'
import gameLane from '../assets/park-scenes/game-lane.png'
</script>

<style scoped>
.garden-scene {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  border-radius: 40px;
  border: 1px solid rgba(183,142,78,.22);
  box-shadow: var(--shadow);
}

.garden-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.garden-layer {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255,250,236,.90), rgba(255,250,236,.54) 52%, rgba(255,250,236,.18));
}

.garden-copy {
  padding: clamp(34px, 5vw, 62px);
  width: min(820px, 76%);
}

.game-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  align-items: stretch;
}

.game-ticket {
  min-height: 360px;
  padding: clamp(22px, 3vw, 34px);
  border-radius: 34px;
  background:
    radial-gradient(circle at 18% 10%, rgba(255,255,255,.86), transparent 34%),
    linear-gradient(135deg, rgba(255,240,198,.94), rgba(226,244,246,.78));
  border: 1px solid rgba(183,142,78,.24);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.game-ticket.tone-mint {
  background:
    radial-gradient(circle at 18% 10%, rgba(255,255,255,.84), transparent 34%),
    linear-gradient(135deg, rgba(230,248,236,.94), rgba(255,246,218,.78));
}

.game-ticket.tone-sky {
  background:
    radial-gradient(circle at 18% 10%, rgba(255,255,255,.84), transparent 34%),
    linear-gradient(135deg, rgba(225,245,253,.94), rgba(255,239,213,.78));
}

.ticket-top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ticket-top small {
  color: #b77945;
  font-weight: 950;
}

.game-ticket h2 {
  margin: 18px 0 0;
  color: var(--ink);
  font-size: clamp(30px, 3.6vw, 48px);
  line-height: .98;
  letter-spacing: -.07em;
}

.game-ticket p {
  margin: 14px 0 0;
  color: #61706e;
  line-height: 1.78;
}

.ticket-focus {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255,255,255,.55);
  border: 1px solid rgba(183,142,78,.18);
}

.ticket-focus b,
.ticket-focus span {
  display: block;
}

.ticket-focus b {
  color: #9a6b36;
  font-size: 12px;
}

.ticket-focus span {
  margin-top: 4px;
  color: #687879;
  font-size: 12px;
  line-height: 1.55;
}

.ticket-actions {
  margin-top: 22px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media(max-width: 1180px) {
  .game-list {
    grid-template-columns: 1fr;
  }
}
</style>
