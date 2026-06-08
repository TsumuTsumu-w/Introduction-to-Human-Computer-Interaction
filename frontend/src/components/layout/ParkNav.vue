<template>
  <aside class="park-nav">
    <RouterLink class="park-brand" to="/dashboard" aria-label="GestureFlow Park">
      <img :src="brandIcon" alt="" />
      <div>
        <strong>GestureFlow</strong>
        <span>Play Garden</span>
      </div>
    </RouterLink>

    <nav class="signpost-list" aria-label="园区导航">
      <RouterLink v-for="item in navItems" :key="item.to" class="signpost" :to="item.to">
        <span class="sign-symbol">{{ item.symbol }}</span>
        <span>
          <b>{{ item.label }}</b>
          <small>{{ item.hint }}</small>
        </span>
      </RouterLink>
    </nav>

    <div class="nav-note">
      <img :src="bird" alt="" />
      <b>蓝鸟导览员</b>
      <span>今天只开放一局小游戏。选好以后，就从游玩场开始。</span>
    </div>
  </aside>
</template>

<script setup>
import brandIcon from '../../assets/brand/gestureflow-park-icon.png'
import bird from '../../assets/park-decor/bird-guide.png'

const navItems = [
  { label: '游戏庭', hint: '今天开放的一局', to: '/dashboard', symbol: '✦' },
  { label: '规则牌', hint: '三步看懂玩法', to: '/rules', symbol: '☞' },
  { label: '手账', hint: '盖章记录', to: '/records', symbol: '≋' },
  { label: '园区小路', hint: '看看路线', to: '/map', symbol: '◇' },
  { label: '工具箱', hint: '轻量设置', to: '/toolbox', symbol: '⚙' }
]
</script>

<style scoped>
.park-nav {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.park-brand {
  min-height: 84px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 28px;
  background:
    radial-gradient(circle at 16% 10%, rgba(255,255,255,.92), transparent 36%),
    linear-gradient(135deg, rgba(255,250,233,.92), rgba(221,244,250,.82));
  border: 1px solid rgba(218, 178, 93, .42);
  box-shadow: 0 22px 50px rgba(62, 79, 70, .12);
}

.park-brand img {
  width: 58px;
  height: 58px;
  object-fit: contain;
  flex: 0 0 auto;
}

.park-brand strong {
  display: block;
  color: #24405f;
  font-size: 19px;
  letter-spacing: -.03em;
}

.park-brand span {
  display: block;
  margin-top: 2px;
  color: #b47a3b;
  font-size: 12px;
  font-weight: 950;
}

.signpost-list {
  display: grid;
  gap: 10px;
}

.signpost {
  min-height: 62px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 22px;
  color: #4e5961;
  background: rgba(255, 250, 235, .52);
  border: 1px solid rgba(183, 142, 78, .16);
  transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
}

.signpost:hover,
.signpost.router-link-active {
  transform: translateX(3px);
  background: rgba(255,255,255,.82);
  color: #24354f;
  box-shadow: 0 16px 32px rgba(70, 55, 30, .1);
}

.sign-symbol {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255,235,174,.94), rgba(202,229,220,.74));
  color: #9a6b36;
  font-weight: 950;
}

.signpost b,
.nav-note b {
  display: block;
}

.signpost small {
  display: block;
  margin-top: 3px;
  color: #81908f;
  font-size: 11px;
}

.nav-note {
  margin-top: auto;
  padding: 14px;
  border-radius: 24px;
  background: rgba(255,255,255,.70);
  border: 1px solid rgba(183,142,78,.2);
  box-shadow: 0 14px 32px rgba(60,50,28,.08);
}

.nav-note img {
  width: 78px;
  margin: -34px auto 4px;
}

.nav-note span {
  display: block;
  margin-top: 7px;
  color: #74817f;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .park-nav {
    position: relative;
    height: auto;
    padding: 14px 18px 0;
  }

  .signpost-list {
    grid-template-columns: repeat(5, minmax(110px, 1fr));
    overflow-x: auto;
  }

  .nav-note {
    display: none;
  }
}
</style>
