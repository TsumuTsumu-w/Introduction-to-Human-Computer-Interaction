<template>
  <div class="page-field">
    <section class="rules-scene">
      <img :src="handbook" alt="" class="rules-bg asset-img" />
      <div class="rules-mist"></div>
      <div class="rules-copy content-layer">
        <p class="section-kicker">Rule Board</p>
        <h1 class="section-title">规则牌</h1>
        <p class="section-copy">先看清每个小游戏的操作方式，再进入对应游玩页面体验。</p>
      </div>
    </section>

    <section class="rule-list">
      <article v-for="game in games" :key="game.id" class="paper-card rule-board" :class="`tone-${game.tone}`">
        <div class="content-layer">
          <span class="badge">{{ game.theme }}</span>
          <h2>{{ game.name }}</h2>
          <ol>
            <li v-for="step in game.steps" :key="step">{{ step }}</li>
          </ol>
          <RouterLink class="park-button" :to="game.route">进入对应游玩场</RouterLink>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { games } from '../data/games'
import handbook from '../assets/park-scenes/handbook-corner.png'
</script>

<style scoped>
.rules-scene {
  position: relative;
  min-height: 340px;
  overflow: hidden;
  border-radius: 40px;
  border: 1px solid rgba(183,142,78,.22);
  box-shadow: var(--shadow);
}

.rules-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rules-mist {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255,250,236,.92), rgba(255,250,236,.52));
}

.rules-copy {
  padding: clamp(34px, 5vw, 62px);
  width: min(760px, 74%);
}

.rule-list {
  display: grid;
  gap: 18px;
}

.rule-board {
  min-height: 300px;
  padding: clamp(28px, 4vw, 48px);
  overflow: hidden;
}

.rule-board.tone-mint {
  background:
    radial-gradient(circle at 12% 8%, rgba(255,255,255,.84), transparent 34%),
    linear-gradient(135deg, rgba(239,250,236,.94), rgba(255,246,225,.86));
}

.rule-board.tone-sky {
  background:
    radial-gradient(circle at 12% 8%, rgba(255,255,255,.84), transparent 34%),
    linear-gradient(135deg, rgba(228,247,253,.94), rgba(255,244,225,.86));
}

.rule-board h2 {
  margin: 16px 0 0;
  color: var(--ink);
  font-size: clamp(34px, 4vw, 56px);
  letter-spacing: -.07em;
}

.rule-board ol {
  margin: 24px 0;
  padding: 0;
  display: grid;
  gap: 12px;
  list-style: none;
  max-width: 680px;
}

.rule-board li {
  padding: 14px 18px;
  border-radius: 20px;
  background: rgba(255,246,218,.76);
  color: #63716e;
  font-size: 17px;
  font-weight: 850;
}
</style>
