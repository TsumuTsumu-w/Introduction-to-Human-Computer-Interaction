<template>
  <div class="page-field">
    <section class="park-map">
      <img :src="gameLane" alt="" class="map-bg asset-img" />
      <div class="map-mist"></div>
      <div class="map-copy content-layer">
        <p class="section-kicker">Tiny Route</p>
        <h1 class="section-title">园区小路</h1>
        <p class="section-copy">游玩场不是固定站点，而是从某个游戏进入的专属页面。这里展示的是壳子层面的路线。</p>

        <div class="map-route">
          <RouterLink v-for="stop in parkRouteStops" :key="stop.label" :to="stop.to" :class="{ dynamic: stop.dynamic }">
            <b>{{ stop.label }}</b>
            <span>{{ stop.hint }}</span>
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { parkRouteStops } from '../data/games'
import gameLane from '../assets/park-scenes/game-lane.png'
</script>

<style scoped>
.park-map {
  position: relative;
  min-height: 640px;
  overflow: hidden;
  border-radius: 42px;
  border: 1px solid rgba(183,142,78,.22);
  box-shadow: var(--shadow);
}

.map-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.map-mist {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,250,236,.88), rgba(255,250,236,.58));
}

.map-copy {
  padding: clamp(34px, 5vw, 62px);
}

.map-route {
  position: relative;
  margin-top: 50px;
  display: grid;
  grid-template-columns: repeat(5, minmax(130px, 1fr));
  gap: 18px;
}

.map-route a {
  min-height: 150px;
  border-radius: 30px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
  background: rgba(255,255,255,.72);
  border: 1px solid var(--line);
  color: var(--ink);
  box-shadow: 0 20px 46px rgba(67,54,31,.1);
}

.map-route a.dynamic {
  background: rgba(255,246,218,.76);
}

.map-route b {
  font-size: 23px;
  font-weight: 950;
}

.map-route span {
  color: #697a78;
  font-size: 13px;
  font-weight: 800;
}

@media(max-width: 980px) {
  .map-route { grid-template-columns: 1fr; }
}
</style>
