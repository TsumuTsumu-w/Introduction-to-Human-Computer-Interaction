<template>
  <div class="page-field">
    <section class="detail-ticket" :class="[`tone-${game.tone}`, { template: game.template }]">
      <img :src="decor" alt="" class="decor-sheet asset-img" />
      <div class="detail-main content-layer">
        <span class="badge">{{ game.tag }}</span>
        <h1>{{ game.name }}</h1>
        <p>{{ game.coverLine }}</p>
        <div class="detail-actions">
          <RouterLink class="park-button" :to="game.route">进入对应游玩场</RouterLink>
          <RouterLink class="park-button soft" to="/rules">看规则牌</RouterLink>
        </div>
      </div>

      <aside class="detail-pass content-layer">
        <b>统一接入规范</b>
        <span>{{ game.theme }}</span>
        <ul>
          <li><strong>入口：</strong>游戏庭自动生成</li>
          <li><strong>规则：</strong>规则牌自动生成</li>
          <li><strong>游玩场：</strong>{{ game.route }}</li>
          <li><strong>手账：</strong>{{ game.stamp }}</li>
          <li><strong>后端：</strong>{{ game.backendId }}</li>
        </ul>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { findGame } from '../data/games'
import decor from '../assets/park-decor/decor-sheet.png'

const route = useRoute()
const game = computed(() => findGame(route.params.id))
</script>

<style scoped>
.detail-ticket {
  position: relative;
  min-height: 570px;
  overflow: hidden;
  border-radius: 42px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(330px, .68fr);
  gap: 22px;
  padding: clamp(30px, 5vw, 62px);
  background:
    radial-gradient(circle at 16% 8%, rgba(255,255,255,.86), transparent 32%),
    linear-gradient(135deg, rgba(255,250,235,.94), rgba(229,246,248,.78));
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
}

.detail-ticket.tone-mint {
  background:
    radial-gradient(circle at 16% 8%, rgba(255,255,255,.86), transparent 32%),
    linear-gradient(135deg, rgba(235,249,238,.94), rgba(255,244,214,.80));
}

.detail-ticket.tone-sky {
  background:
    radial-gradient(circle at 16% 8%, rgba(255,255,255,.86), transparent 32%),
    linear-gradient(135deg, rgba(226,245,252,.94), rgba(255,240,222,.80));
}

.decor-sheet {
  position: absolute;
  right: -180px;
  top: -140px;
  width: 640px;
  opacity: .16;
}

.detail-main {
  align-self: center;
}

.detail-main h1 {
  margin: 16px 0 0;
  font-size: clamp(42px, 5vw, 78px);
  line-height: .93;
  letter-spacing: -.08em;
  color: var(--ink);
}

.detail-main p {
  margin-top: 18px;
  max-width: 650px;
  color: #64716f;
  line-height: 1.85;
  font-size: 18px;
}

.detail-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 28px;
}

.detail-pass {
  align-self: center;
  min-height: 430px;
  padding: 28px;
  border-radius: 30px;
  background: rgba(255,255,255,.68);
  border: 1px solid rgba(188, 149, 83, .24);
  box-shadow: 0 18px 46px rgba(68,53,31,.1);
}

.detail-pass b {
  color: var(--ink);
  font-size: 30px;
}

.detail-pass span {
  display: block;
  margin-top: 10px;
  color: #b77945;
  font-weight: 950;
}

.detail-pass ul {
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.detail-pass li {
  padding: 13px 15px;
  border-radius: 18px;
  background: rgba(255,246,218,.78);
  color: #667370;
  font-weight: 800;
  line-height: 1.6;
}

.detail-pass strong {
  color: #805c29;
}

@media(max-width: 900px) {
  .detail-ticket { grid-template-columns: 1fr; }
}
</style>
