<script setup>
// 这个文件是“总后台调度总览跳转页”。
// 先向后端申请 5 分钟有效的调度专用短期凭证，再跳转地图调度端，避免把长期 admin JWT 放进 URL。
import { onMounted, ref } from 'vue'
import { fetchDispatchTicket } from '../../api/auth'

const loading = ref(true)
const errorMessage = ref('')
const DISPATCH_MAP_URL = import.meta.env.VITE_DISPATCH_MAP_URL

function buildDispatchUrl(token) {
  const baseUrl = DISPATCH_MAP_URL || new URL('/dispatch_map.html', window.location.origin).toString()
  const url = new URL(baseUrl, window.location.origin)
  url.searchParams.set('token', token)
  return url.toString()
}

async function redirectToDispatchMap() {
  try {
    const result = await fetchDispatchTicket()
    const ticket = result?.ticket || result?.data?.ticket

    if (!ticket) {
      loading.value = false
      errorMessage.value = '未获取到调度专用凭证，请重新登录后再进入调度页'
      return
    }

    const targetUrl = buildDispatchUrl(ticket)
    if (!DISPATCH_MAP_URL && !import.meta.env.PROD) {
      console.warn('[dispatch] VITE_DISPATCH_MAP_URL 未配置，将尝试:', targetUrl)
    }

    window.location.replace(targetUrl)
  } catch (error) {
    loading.value = false
    errorMessage.value = error?.response?.data?.message || error?.message || '进入调度大屏失败，请稍后重试'
  }
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
      <el-alert
        v-else-if="!DISPATCH_MAP_URL"
        type="warning"
        show-icon
        :closable="false"
        title="调度大屏地址未配置"
        description="请在 .env 中设置 VITE_DISPATCH_MAP_URL 指向地图调度端 dispatch_map.html 的完整 URL，否则可能白屏。"
      />
      <div v-if="!errorMessage" class="page-placeholder">正在签发调度凭证并进入调度大屏...</div>
    </el-card>
  </div>
</template>
