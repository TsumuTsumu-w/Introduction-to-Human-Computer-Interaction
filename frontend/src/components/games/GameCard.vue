<template>
  <article class="featured-game-card">
    <div class="game-art">
      <img :src="rabbit" alt="" class="rabbit asset-img" />
      <img :src="train" alt="" class="train asset-img" />
      <span class="light one"></span>
      <span class="light two"></span>
      <span class="light three"></span>
    </div>

    <div class="game-copy">
      <span class="badge">{{ game.tag }}</span>
      <p>{{ game.theme }}</p>
      <h2>{{ game.name }}</h2>
      <span>{{ game.summary }}</span>

      <div class="game-actions">
        <RouterLink class="park-button" :to="game.route">进入游戏</RouterLink>
        <RouterLink class="park-button soft" :to="`/games/${game.id}`">游玩票</RouterLink>
      </div>
    </div>
  </article>
</template>

<script setup>
import rabbit from '../../assets/park-decor/rabbit-ticket.png'
import train from '../../assets/park-decor/mini-train.png'

defineProps({
  game: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.featured-game-card {
  position: relative;
  min-height: 420px;
  overflow: hidden;
  border-radius: 38px;
  display: grid;
  grid-template-columns: minmax(320px, .9fr) minmax(0, 1.1fr);
  background:
    radial-gradient(circle at 22% 24%, rgba(255,255,255,.92), transparent 30%),
    linear-gradient(135deg, rgba(255,236,188,.94), rgba(226,244,246,.78));
  border: 1px solid rgba(183, 142, 78, .24);
  box-shadow: 0 24px 70px rgba(70,55,30,.14);
  backdrop-filter: blur(18px);
}

.game-art {
  position: relative;
  min-height: 380px;
  background:
    radial-gradient(circle at 46% 34%, rgba(255,255,255,.72), transparent 22%),
    linear-gradient(180deg, rgba(255,240,196,.44), rgba(222,181,102,.2));
  overflow: hidden;
}

.rabbit {
  position: absolute;
  left: 13%;
  bottom: -6%;
  width: min(58%, 270px);
}

.train {
  position: absolute;
  right: -22%;
  bottom: 4%;
  width: 68%;
  transform: rotate(-2deg);
  opacity: .9;
}

.light {
  position: absolute;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff2a4, #e5ac48);
  box-shadow: 0 0 0 18px rgba(235,190,85,.18);
}

.light.one { left: 60%; top: 18%; }
.light.two { left: 72%; top: 33%; transform: scale(.66); }
.light.three { left: 56%; top: 48%; transform: scale(.44); }

.game-copy {
  padding: clamp(28px, 4vw, 54px);
  align-self: center;
}

.game-copy p {
  margin: 18px 0 8px;
  color: #b77945;
  font-weight: 950;
}

.game-copy h2 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(38px, 5vw, 72px);
  line-height: .96;
  letter-spacing: -.07em;
}

.game-copy > span:last-of-type {
  display: block;
  margin-top: 16px;
  max-width: 640px;
  color: #62716f;
  line-height: 1.85;
  font-size: 17px;
}

.game-actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 880px) {
  .featured-game-card {
    grid-template-columns: 1fr;
  }
}
</style>
