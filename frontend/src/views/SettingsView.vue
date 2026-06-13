<template>
  <div class="page-field">
    <section class="ticket-card setting-house">
      <img :src="decor" alt="" class="decor asset-img" />
      <div class="content-layer">
        <p class="section-kicker">Small House</p>
        <h1 class="section-title">设置屋</h1>
        <p class="section-copy">这里保持简单。需要换账号时，直接离开园区回到售票处。</p>
        <RouterLink class="park-button" to="/login">回到售票处</RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
import decor from '../assets/park-decor/decor-sheet.png'
</script>

<style scoped>
.setting-house {
  min-height: 520px;
  padding: clamp(34px, 5vw, 64px);
  overflow: hidden;
}

.decor {
  position: absolute;
  right: -180px;
  top: -140px;
  width: 680px;
  opacity: .18;
}

.park-button {
  margin-top: 24px;
}
</style>
