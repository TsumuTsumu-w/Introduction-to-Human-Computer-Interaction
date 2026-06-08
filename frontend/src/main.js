import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/reset.css'
import './styles/park-theme.css'
import './styles/park-responsive.css'

createApp(App).use(createPinia()).use(router).mount('#app')
