<template>
  <section class="park-hero">
    <img :src="plaza" alt="" class="hero-bg asset-img" />
    <div class="hero-mist"></div>

    <div class="hero-copy content-layer">
      <p class="section-kicker">Play Garden</p>
      <h1 class="section-title">今天只开放一局</h1>
      <p class="section-copy">跟着小灯完成一次轻松反应练习。页面外面只负责带路，真正的游玩从这一局开始。</p>

      <div class="hero-actions">
        <RouterLink class="park-button" to="/play/reaction-wave">开始手势反应挑战</RouterLink>
        <RouterLink class="park-button soft" to="/rules">先看规则牌</RouterLink>
      </div>
    </div>

    <div class="hero-side content-layer">
      <img :src="bird" alt="" class="guide-bird asset-img" />
      <b>蓝鸟导览员提醒</b>
      <span>完成一局后，手账会多一个小章。</span>
    </div>
  </section>
</template>

<script setup>
import plaza from '../../assets/park-scenes/plaza.png'
import bird from '../../assets/park-decor/bird-guide.png'
</script>

<style scoped>
.park-hero {
  position: relative;
  min-height: 520px;
  overflow: hidden;
  border-radius: 42px;
  border: 1px solid rgba(183,142,78,.22);
  box-shadow: 0 26px 80px rgba(69,54,30,.14);
}

.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-mist {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255,250,235,.91), rgba(255,250,235,.66) 42%, rgba(255,250,235,.28)),
    radial-gradient(circle at 78% 22%, rgba(255,255,255,.62), transparent 24%);
}

.hero-copy {
  position: relative;
  width: min(760px, 68%);
  padding: clamp(34px, 5vw, 70px);
}

.hero-actions {
  margin-top: 26px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-side {
  position: absolute;
  right: 36px;
  bottom: 30px;
  width: 260px;
  padding: 18px;
  border-radius: 26px;
  background: rgba(255,250,235,.80);
  border: 1px solid rgba(181,141,76,.22);
  box-shadow: 0 18px 44px rgba(60,50,28,.12);
}

.guide-bird {
  position: absolute;
  width: 106px;
  right: 12px;
  top: -86px;
}

.hero-side b {
  display: block;
  color: var(--ink);
  font-size: 20px;
}

.hero-side span {
  display: block;
  margin-top: 7px;
  color: #657472;
  line-height: 1.6;
}

@media(max-width: 840px) {
  .hero-copy { width: 100%; }
  .hero-side { position: relative; right: auto; bottom: auto; margin: 0 28px 28px; }
}
</style>
