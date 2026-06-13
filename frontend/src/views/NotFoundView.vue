<template>
  <main class="park-shell" :style="{ '--park-bg': `url(${plaza})` }">
    <section class="not-found ticket-card">
      <img :src="rabbit" alt="" />
      <h1>这条小路还没开放</h1>
      <p>先回到游戏庭，今天只玩一局。</p>
      <RouterLink class="park-button" to="/dashboard">回游戏庭</RouterLink>
    </section>
  </main>
</template>

<script setup>
import plaza from '../assets/park-scenes/plaza.png'
import rabbit from '../assets/park-decor/rabbit-ticket.png'
</script>

<style scoped>
.not-found {
  position: relative;
  z-index: 1;
  width: min(560px, calc(100vw - 40px));
  margin: 12vh auto;
  padding: 42px;
  text-align: center;
}

.not-found img {
  width: 140px;
  margin: 0 auto 18px;
}

.not-found h1 {
  margin: 0;
  color: var(--ink);
  font-size: 38px;
}

.not-found p {
  color: #667370;
}
</style>
