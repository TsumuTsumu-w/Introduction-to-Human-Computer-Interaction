<template>
  <header class="park-top">
    <div class="top-brand-block">
      <span class="top-kicker">GestureFlow Park</span>
      <strong>{{ title }}</strong>
      <span class="group-mark">人机交互导论 37 组 · 汤佑森 · 李政翰 · 祁浩哲</span>
    </div>

    <div class="top-trail" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>

    <div class="top-actions">
      <RouterLink class="top-pill" to="/play/reaction-wave">开始一局</RouterLink>
      <button class="top-pill leave" @click="logout">离开园区</button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const title = computed(() => route.meta?.title || '游戏庭')

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.park-top {
  min-height: 86px;
  margin-bottom: 22px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(255,255,255,.82), rgba(255,247,225,.68));
  border: 1px solid rgba(181, 141, 76, .18);
  box-shadow: 0 18px 42px rgba(67, 54, 31, .08);
  backdrop-filter: blur(18px);
}

.top-brand-block {
  min-width: 280px;
}

.top-kicker {
  display: block;
  color: #b47a3b;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.park-top strong {
  display: block;
  margin-top: 3px;
  font-size: 23px;
  color: var(--ink);
}

.group-mark {
  width: fit-content;
  max-width: min(520px, 62vw);
  margin-top: 8px;
  padding: 5px 11px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  color: #7b6040;
  background: rgba(255,255,255,.62);
  border: 1px solid rgba(183,142,78,.20);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .02em;
  white-space: nowrap;
}

.top-trail {
  flex: 1;
  max-width: 360px;
  height: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-trail span {
  height: 7px;
  border-radius: 999px;
  background: rgba(129, 182, 195, .28);
  flex: 1;
}

.top-trail span:nth-child(2) {
  background: rgba(230, 187, 91, .36);
}

.top-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.top-pill {
  height: 42px;
  padding: 0 15px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(255,255,255,.70);
  border: 1px solid var(--line);
  color: var(--ink);
  font-weight: 950;
  cursor: pointer;
}

.top-pill.leave {
  background: #25354f;
  color: #fff6dd;
}

@media (max-width: 720px) {
  .top-trail { display: none; }
  .park-top { align-items: flex-start; flex-direction: column; }
  .group-mark { max-width: 100%; white-space: normal; }
}
</style>

