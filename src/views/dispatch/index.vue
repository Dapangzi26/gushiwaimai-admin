<script setup>
import { onMounted, ref } from 'vue'
import { getStoredAuth } from '../../utils/auth'

const loading = ref(true)
const errorMessage = ref('')
const DISPATCH_MAP_URL = import.meta.env.VITE_DISPATCH_MAP_URL

function buildDispatchUrl(token) {
  const baseUrl = DISPATCH_MAP_URL || new URL('/dispatch_map.html', window.location.origin).toString()
  const url = new URL(baseUrl, window.location.origin)
  url.searchParams.set('token', token)
  return url.toString()
}

function redirectToDispatchMap() {
  const { token } = getStoredAuth()

  if (!token) {
    loading.value = false
    errorMessage.value = '未获取到总后台真实登录态，请重新登录后再进入调度页'
    return
  }

  window.location.replace(buildDispatchUrl(token))
}

onMounted(() => {
  redirectToDispatchMap()
})
</script>

<template>
  <div class="page-shell" v-loading="loading">
    <h1 class="page-shell__title">调度总览</h1>
    <el-card class="page-shell__card">
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        :closable="false"
      />
      <div v-else class="page-placeholder">正在进入调度大屏...</div>
    </el-card>
  </div>
</template>
