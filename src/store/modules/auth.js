import { defineStore } from 'pinia'
import { adminLogin, adminLogout, fetchCurrentAdmin } from '../../api/auth'
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../../utils/auth'

const persistedAuth = getStoredAuth()
const persistedAdmin = persistedAuth.admin || null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: persistedAuth.token,
    admin: persistedAdmin,
    initialized: false,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    adminName: (state) => state.admin?.nickname || state.admin?.phone || '',
    roleName: (state) => state.admin?.role || '',
    adminInfo: (state) => state.admin || null,
  },
  actions: {
    setAuth(payload) {
      this.token = payload?.token || ''
      this.admin = payload?.admin || null

      setStoredAuth({
        token: this.token,
        admin: this.admin,
      })
    },
    async login(formData) {
      const result = await adminLogin({
        phone: String(formData?.account || '').trim(),
        password: String(formData?.password || '').trim(),
      })

      this.setAuth({
        token: result?.token || '',
        admin: result?.admin || null,
      })
      this.initialized = true
      return result
    },
    async restoreSession() {
      if (!this.token) {
        this.initialized = true
        return null
      }

      try {
        const result = await fetchCurrentAdmin()
        this.setAuth({
          token: this.token,
          admin: result?.admin || result || null,
        })
        this.initialized = true
        return this.admin
      } catch (error) {
        this.clearAuth()
        this.initialized = true
        throw error
      }
    },
    async ensureAuthReady() {
      if (this.initialized) {
        return this.isLoggedIn
      }

      if (!this.token) {
        this.initialized = true
        return false
      }

      try {
        await this.restoreSession()
        return true
      } catch (error) {
        return false
      }
    },
    async logout() {
      try {
        if (this.token) {
          await adminLogout()
        }
      } catch (error) {
        return null
      } finally {
        this.clearAuth()
        this.initialized = true
      }
    },
    clearAuth() {
      this.token = ''
      this.admin = null
      clearStoredAuth()
    },
  },
})
