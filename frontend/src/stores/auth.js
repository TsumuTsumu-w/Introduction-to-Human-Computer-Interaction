import { defineStore } from 'pinia'
import { api } from '../services/http'

const STORAGE_KEY = 'gestureflow-park-user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  }),
  getters: {
    isAuthed: (state) => Boolean(state.user)
  },
  actions: {
    async login(payload) {
      const result = await api.login(payload)
      this.user = result.user
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user))
      return result
    },
    logout() {
      this.user = null
      localStorage.removeItem(STORAGE_KEY)
    }
  }
})
