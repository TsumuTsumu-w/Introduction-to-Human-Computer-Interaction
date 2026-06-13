<template>
  <div class="page-field">
    <ParkHero />

    <section class="dashboard-games">
      <article v-for="game in games" :key="game.id" class="dashboard-game" :class="`tone-${game.tone}`">
        <span class="badge">{{ game.tag }}</span>
        <h2>{{ game.name }}</h2>
        <p>{{ game.summary }}</p>
        <div class="spec-row">
          <span>入口</span>
          <span>规则</span>
          <span>游玩</span>
          <span>手账</span>
        </div>
        <div class="dashboard-actions">
          <RouterLink class="park-button" :to="game.route">进入游戏</RouterLink>
          <RouterLink class="park-button soft" :to="game.detailRoute">游玩票</RouterLink>
        </div>
      </article>
    </section>

    <section class="home-after">
      <article class="paper-card stamp-corner">
        <img :src="rabbit" alt="" class="stamp-rabbit asset-img" />
        <div class="content-layer">
          <p class="section-kicker">Stamp Desk</p>
          <h2>手账盖章处</h2>
          <p>完成小游戏后，可以在这里查看本机保留的游玩记录。</p>
          <RouterLink class="park-button soft" to="/records">看看手账</RouterLink>
        </div>
      </article>

      <article class="wood-card train-corner">
        <img :src="train" alt="" class="train-small asset-img" />
        <div class="content-layer">
          <b>园区游玩路线</b>
          <span>从游戏庭选择小游戏，查看规则后进入对应游玩页面。</span>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import ParkHero from '../components/park/ParkHero.vue'
import { games } from '../data/games'
import rabbit from '../assets/park-decor/rabbit-ticket.png'
import train from '../assets/park-decor/mini-train.png'
</script>

<style scoped>
.dashboard-games {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.dashboard-game {
  min-height: 330px;
  padding: clamp(22px, 3vw, 34px);
  border-radius: 34px;
  background:
    radial-gradient(circle at 18% 10%, rgba(255,255,255,.86), transparent 34%),
    linear-gradient(135deg, rgba(255,240,198,.94), rgba(226,244,246,.78));
  border: 1px solid rgba(183,142,78,.24);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.dashboard-game.tone-mint {
  background:
    radial-gradient(circle at 18% 10%, rgba(255,255,255,.84), transparent 34%),
    linear-gradient(135deg, rgba(230,248,236,.94), rgba(255,246,218,.78));
}

.dashboard-game.tone-sky {
  background:
    radial-gradient(circle at 18% 10%, rgba(255,255,255,.84), transparent 34%),
    linear-gradient(135deg, rgba(225,245,253,.94), rgba(255,239,213,.78));
}

.dashboard-game h2 {
  margin: 18px 0 0;
  color: var(--ink);
  font-size: clamp(30px, 3.6vw, 48px);
  line-height: .98;
  letter-spacing: -.07em;
}

.dashboard-game p {
  margin: 14px 0 0;
  color: #61706e;
  line-height: 1.78;
}

.spec-row {
  margin-top: 18px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.spec-row span {
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(255,255,255,.58);
  border: 1px solid rgba(183,142,78,.17);
  color: #9a6b36;
  font-size: 12px;
  font-weight: 900;
}

.dashboard-actions {
  margin-top: 22px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.home-after {
  display: grid;
  grid-template-columns: minmax(0, .95fr) minmax(320px, .75fr);
  gap: 22px;
}

.stamp-corner,
.train-corner {
  min-height: 260px;
  padding: 28px;
  overflow: hidden;
}

.stamp-corner h2 {
  margin: 0;
  color: var(--ink);
  font-size: 34px;
  letter-spacing: -.05em;
}

.stamp-corner p {
  max-width: 560px;
  color: #667370;
  line-height: 1.8;
}

.stamp-rabbit {
  position: absolute;
  right: 18px;
  bottom: -28px;
  width: 210px;
  opacity: .9;
}

.train-small {
  position: absolute;
  right: -40px;
  bottom: -6px;
  width: 270px;
  opacity: .9;
}

.train-corner b {
  display: block;
  color: var(--ink);
  font-size: 28px;
  letter-spacing: -.04em;
}

.train-corner span {
  display: block;
  margin-top: 14px;
  max-width: 360px;
  color: #72552d;
  line-height: 1.75;
}

@media(max-width: 1180px) {
  .dashboard-games,
  .home-after {
    grid-template-columns: 1fr;
  }
}
</style>

