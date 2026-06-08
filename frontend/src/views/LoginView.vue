<template>
  <main class="park-login-page" aria-label="GestureFlow Park 验票入园">
    <div class="scene-frame" aria-hidden="true">
      <img class="scene-image" :src="parkScene" alt="GestureFlow Park 游乐园入口" />
    </div>

    <header class="brand-overlay" aria-label="GestureFlow Park">
      <img class="brand-logo-image" :src="brandLogo" alt="GestureFlow Park" />
    </header>

    <form class="ticket-plane" aria-label="售票处验票表单" @submit.prevent="submit">
      <label class="sr-only" for="ticket-number">票号</label>
      <div class="field-shell ticket-number-shell">
        <input id="ticket-number" v-model.trim="form.username" class="ticket-input ticket-number" autocomplete="username" spellcheck="false" />
      </div>

      <label class="sr-only" for="ticket-passphrase">通行口令</label>
      <div class="field-shell ticket-passphrase-shell">
        <input id="ticket-passphrase" v-model="form.password" class="ticket-input ticket-passphrase" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" spellcheck="false" />
        <button type="button" class="embedded-eye-hotspot" :aria-label="showPassword ? '隐藏通行口令' : '查看通行口令'" @click="showPassword = !showPassword"></button>
      </div>

      <button type="submit" class="ticket-hotspot enter-park" aria-label="验票入园" :disabled="loading"></button>
      <button type="button" class="ticket-hotspot default-pass" aria-label="使用默认票" @click="fillDefault"></button>
      <button type="button" class="ticket-hotspot register-pass" aria-label="预留注册入口" @click="reserveRegister"></button>

      <p v-if="error" class="ticket-message error-message">{{ error }}</p>
      <p v-else-if="loading" class="ticket-message loading-message">正在验票...</p>
    </form>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import parkScene from '../assets/login-park/scene/park-entrance-approved.png'
import brandLogo from '../assets/brand/gestureflow-park-logo.png'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

const form = reactive({
  username: '',
  password: ''
})

function fillDefault() {
  form.username = 'admin'
  form.password = 'admin123456'
  error.value = ''
}

function reserveRegister() {
  error.value = '注册入口已预留，当前版本先使用默认票进入。'
}

async function submit() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    await auth.login({ username: form.username, password: form.password })
    router.push('/dashboard')
  } catch (event) {
    error.value = event?.message || '票号或口令不对，请重新确认。'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.park-login-page {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #dff5ff;
  color: #25334f;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
}

.park-login-page *,
.park-login-page *::before,
.park-login-page *::after {
  box-sizing: border-box;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.scene-frame,
.ticket-plane {
  position: absolute;
  left: 50%;
  top: 50%;
  width: max(100vw, calc(100vh * 1728 / 910));
  height: max(100vh, calc(100vw * 910 / 1728));
  transform: translate(-50%, -50%);
  overflow: hidden;
}

.scene-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  user-select: none;
  pointer-events: none;
}

.ticket-plane { z-index: 2; }

.brand-overlay {
  position: absolute;
  left: 2.55%;
  top: 2.05%;
  z-index: 3;
  width: clamp(245px, 21vw, 410px);
  pointer-events: none;
  user-select: none;
}

.brand-logo-image {
  display: block;
  width: 100%;
  height: auto;
  filter:
    drop-shadow(0 8px 12px rgba(32, 70, 93, 0.18))
    drop-shadow(0 1px 0 rgba(255, 255, 255, 0.76));
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.field-shell {
  position: absolute;
  left: 72.7%;
  width: 17.55%;
  height: 5.2%;
  display: flex;
  align-items: center;
  transform-origin: left center;
  transform: rotate(-0.45deg) skewX(-2.4deg);
}

.ticket-number-shell { top: 55.4%; }
.ticket-passphrase-shell { top: 64.75%; }

.ticket-input {
  width: 100%;
  height: 100%;
  padding: 0 4.4% 0 4.4%;
  border: 0;
  outline: none;
  background: transparent;
  box-shadow: none;
  color: #24385c;
  font-size: clamp(15px, 1.05vw, 21px);
  font-weight: 850;
  letter-spacing: 0.01em;
  line-height: 1;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.36);
  caret-color: #8b692f;
}

.ticket-input::placeholder { color: transparent; }
.ticket-input:focus { outline: none; }
.ticket-passphrase { padding-right: 16.8%; }

.embedded-eye-hotspot {
  position: absolute;
  right: 0.85%;
  top: 12%;
  width: 16.6%;
  height: 76%;
  border: 0;
  border-radius: 999px;
  background: transparent;
  outline: none;
}

.ticket-hotspot {
  position: absolute;
  border: 0;
  outline: none;
  background: transparent;
  color: transparent;
}

.enter-park {
  left: 72.9%;
  top: 71.25%;
  width: 16.8%;
  height: 5.4%;
  border-radius: 16px;
  transform: rotate(-0.25deg);
}

.default-pass {
  left: 73.5%;
  top: 80.4%;
  width: 6.8%;
  height: 3.55%;
  border-radius: 14px;
  transform: rotate(-0.2deg);
}

.register-pass {
  left: 81.60%;
  top: 80.4%;
  width: 6.8%;
  height: 3.58%;
  border-radius: 14px;
  transform: rotate(-0.2deg);
}

.enter-park:disabled { cursor: wait; }

.ticket-hotspot:focus-visible,
.embedded-eye-hotspot:focus-visible {
  box-shadow: 0 0 0 3px rgba(245, 207, 116, 0.22);
}

.ticket-message {
  position: absolute;
  left: 72.35%;
  top: 84.55%;
  width: 18.2%;
  margin: 0;
  padding: 7px 10px;
  border-radius: 10px;
  font-size: clamp(11px, 0.72vw, 13px);
  font-weight: 800;
  line-height: 1.32;
  transform: rotate(-0.2deg);
  box-shadow: 0 8px 18px rgba(98, 70, 38, 0.08);
}

.error-message {
  color: #963f2a;
  background: rgba(255, 239, 230, 0.84);
}

.loading-message {
  color: #6b4b1c;
  background: rgba(255, 244, 208, 0.84);
}

@media (max-aspect-ratio: 16 / 9) {
  .field-shell {
    left: 72.82%;
    width: 17.45%;
  }

  .enter-park { left: 73.0%; }
  .default-pass { left: 77.2%; }
  .register-pass { left: 84.1%; }
}
</style>
