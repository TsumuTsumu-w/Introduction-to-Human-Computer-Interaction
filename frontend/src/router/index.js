import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import ParkShell from '../layouts/ParkShell.vue'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import GameGardenView from '../views/GameGardenView.vue'
import GameDetailView from '../views/GameDetailView.vue'
import PlayStageView from '../views/PlayStageView.vue'
import BlockFreeBuildView from '../views/BlockFreeBuildView.vue'
import EmotionCipherGateGame from '../views/games/EmotionCipherGateGame.vue'
import VoiceGestureRadioGame from '../views/games/VoiceGestureRadioGame.vue'
import RulesView from '../views/RulesView.vue'
import RecordsView from '../views/RecordsView.vue'
import ToolboxView from '../views/ToolboxView.vue'
import ParkMapView from '../views/ParkMapView.vue'
import SettingsView from '../views/SettingsView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  {
    path: '/',
    component: ParkShell,
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: DashboardView, meta: { title: '游戏庭' } },
      { path: 'games', name: 'games', component: GameGardenView, meta: { title: '游戏庭' } },
      { path: 'games/:id', name: 'game-detail', component: GameDetailView, meta: { title: '游玩票' } },
      { path: 'play/magic-block-builder', name: 'block-freebuild', component: BlockFreeBuildView, meta: { title: '星桥积木魔法屋' } },
      { path: 'play/emotion-cipher-gate', name: 'emotion-cipher-gate', component: EmotionCipherGateGame, meta: { title: '星语密门' } },
      { path: 'play/voice-gesture-radio', name: 'voice-gesture-radio', component: VoiceGestureRadioGame, meta: { title: '手势星图导航' } },
      { path: 'play/:id', name: 'play-stage', component: PlayStageView, meta: { title: '游玩场' } },
      { path: 'rules', name: 'rules', component: RulesView, meta: { title: '规则牌' } },
      { path: 'records', name: 'records', component: RecordsView, meta: { title: '手账' } },
      { path: 'toolbox', name: 'toolbox', component: ToolboxView, meta: { title: '工具箱' } },
      { path: 'map', name: 'map', component: ParkMapView, meta: { title: '园区小路' } },
      { path: 'settings', name: 'settings', component: SettingsView, meta: { title: '设置屋' } },
      { path: 'modules', redirect: '/games' },
      { path: 'interaction', redirect: '/games' },
      { path: 'logs', redirect: '/records' },
      { path: 'experience-map', redirect: '/map' },
      { path: 'design-system', redirect: '/settings' },
      { path: 'prototype-room', redirect: '/toolbox' }
    ]
  },
  { path: '/:pathMatch(.*)*', component: NotFoundView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthed) return '/login'
  if (to.path === '/login' && auth.isAuthed) return '/dashboard'
  return true
})

export default router
