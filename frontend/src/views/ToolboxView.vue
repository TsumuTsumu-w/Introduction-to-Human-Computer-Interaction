<template>
  <div class="page-field">
    <section class="toolhouse">
      <img :src="handbook" alt="" class="tool-bg asset-img" />
      <div class="tool-mist"></div>
      <div class="tool-copy content-layer">
        <p class="section-kicker">Tool House</p>
        <h1 class="section-title">工具箱</h1>
        <p class="section-copy">检查本地服务状态，管理手账记录，确认园区基础功能。</p>
      </div>
    </section>

    <section class="tool-grid">
      <article class="paper-card tool-tile">
        <b>本地服务</b>
        <span>{{ runtime.message }}</span>
        <button class="park-button soft" @click="loadRuntime">重新检查</button>
      </article>
      <article class="paper-card tool-tile">
        <b>清空手账</b>
        <span>清空本机保存的游玩记录，重新开始体验。</span>
        <button class="park-button ghost" @click="clearRecords">清空</button>
      </article>
      <article class="paper-card tool-tile mascot-tile">
        <img :src="bird" alt="" class="asset-img" />
        <b>导览员</b>
        <span>蓝鸟会在园区里提醒你当前所在位置。</span>
      </article>
    </section>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { api } from '../services/http'
import handbook from '../assets/park-scenes/handbook-corner.png'
import bird from '../assets/park-decor/bird-guide.png'

const runtime = reactive({
  ready: false,
  message: '尚未检查。'
})

async function loadRuntime() {
  try {
    const result = await api.runtime()
    runtime.ready = Boolean(result.ready)
    runtime.message = result.message || '本地服务已准备好。'
  } catch (error) {
    runtime.ready = false
    runtime.message = error.message || '本地服务暂时不可用。'
  }
}

function clearRecords() {
  localStorage.removeItem('gestureflow-park-records')
  runtime.message = '手账已经清空。'
}

onMounted(loadRuntime)
</script>

<style scoped>
.toolhouse {
  position: relative;
  min-height: 340px;
  overflow: hidden;
  border-radius: 40px;
  border: 1px solid rgba(183,142,78,.22);
  box-shadow: var(--shadow);
}

.tool-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tool-mist {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255,250,236,.94), rgba(255,250,236,.56));
}

.tool-copy {
  padding: clamp(34px, 5vw, 62px);
  width: min(760px, 72%);
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.tool-tile {
  min-height: 250px;
  padding: 28px;
  overflow: hidden;
}

.tool-tile b {
  display: block;
  color: var(--ink);
  font-size: 26px;
  letter-spacing: -.04em;
}

.tool-tile span {
  display: block;
  margin-top: 12px;
  color: #667370;
  line-height: 1.75;
}

.tool-tile .park-button {
  margin-top: 20px;
}

.mascot-tile img {
  position: absolute;
  right: 16px;
  bottom: -26px;
  width: 150px;
}

@media(max-width: 960px) {
  .tool-grid { grid-template-columns: 1fr; }
}
</style>
