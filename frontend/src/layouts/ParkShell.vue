<template>
  <div class="park-shell" :style="{ '--park-bg': `url(${activeScene})` }">
    <div class="park-layout">
      <ParkNav />
      <main class="park-main">
        <ParkTop />
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ParkNav from '../components/layout/ParkNav.vue'
import ParkTop from '../components/layout/ParkTop.vue'
import plazaScene from '../assets/park-scenes/plaza.png'
import gameLaneScene from '../assets/park-scenes/game-lane.png'
import handbookScene from '../assets/park-scenes/handbook-corner.png'

const route = useRoute()

const activeScene = computed(() => {
  if (['rules', 'records', 'toolbox', 'settings'].includes(route.name)) return handbookScene
  if (['games', 'game-detail', 'play-stage'].includes(route.name)) return gameLaneScene
  return plazaScene
})
</script>
