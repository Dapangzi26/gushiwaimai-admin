<script setup>
// 总后台主布局：侧边栏 + 顶栏 + 内容区，并挂载全局待接单预警 Socket 与语音解锁引导。
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import SidebarMenu from './components/SidebarMenu.vue'
import AppHeader from './components/AppHeader.vue'
import { connectAdminSocket, disconnectAdminSocket } from '../utils/socket'
import { createAdminReminderCenter, getAudioStatus, subscribeAudioStatus, unlockAudioPlayback } from '../utils/admin-reminder-center'
import { normalizeSearchKeyword } from '../utils/orderNo.js'

const router = useRouter()
let reminderCenter = null
let unsubscribeAudioStatus = null
const audioUnlocked = ref(getAudioStatus().unlocked)
const unlockingAudio = ref(false)

function handlePendingRefreshEvent() {
  window.dispatchEvent(new CustomEvent('gushi-admin-pending-refresh'))
}

async function handleUnlockAudio() {
  if (unlockingAudio.value) {
    return
  }

  unlockingAudio.value = true
  try {
    await unlockAudioPlayback()
    audioUnlocked.value = true
    ElMessage.success('待接单语音提醒已开启')
  } catch (error) {
    ElMessage.error(error?.message || '开启语音失败，请检查浏览器是否允许播放声音')
  } finally {
    unlockingAudio.value = false
  }
}

onMounted(() => {
  reminderCenter = createAdminReminderCenter({
    onAlert: (alert) => {
      ElNotification({
        title: alert.title,
        message: `${alert.message}（${alert.cancelAfterMinutes} 分钟内未处理将自动取消）`,
        type: 'warning',
        duration: 0,
        onClick: () => {
          router.push({
            path: '/orders',
            query: {
              exception_type: 'timeout_unaccepted',
              timeout_minutes: String(alert.waitMinutes || 5),
              keyword: normalizeSearchKeyword(alert.orderNo) || '',
              page: '1',
              limit: '10',
            },
          })
        },
      })
      handlePendingRefreshEvent()
    },
  })

  connectAdminSocket((payload) => {
    reminderCenter?.handleReminderPayload(payload)
  })

  unsubscribeAudioStatus = subscribeAudioStatus((status) => {
    audioUnlocked.value = status.unlocked
  })

  if (!audioUnlocked.value) {
    ElMessage.warning('请先点击顶栏「开启语音」，否则待接单预警可能听不到声音')
  }
})

onUnmounted(() => {
  disconnectAdminSocket()
  unsubscribeAudioStatus?.()
  unsubscribeAudioStatus = null
  reminderCenter = null
})
</script>

<template>
  <div class="app-layout">
    <aside class="app-layout__aside">
      <SidebarMenu />
    </aside>

    <div class="app-layout__body">
      <header class="app-layout__header">
        <AppHeader
          :audio-unlocked="audioUnlocked"
          :unlocking-audio="unlockingAudio"
          @unlock-audio="handleUnlockAudio"
        />
      </header>

      <main class="app-layout__main">
        <el-alert
          v-if="!audioUnlocked"
          class="app-layout__voice-alert"
          type="warning"
          show-icon
          :closable="false"
          title="待接单语音提醒尚未开启"
          description="浏览器要求先点击一次才能播放告警音和语音。请点击顶栏右侧「开启语音」按钮，听到测试播报即表示已生效。"
        >
          <template #default>
            <el-button type="warning" size="small" :loading="unlockingAudio" @click="handleUnlockAudio">
              立即开启语音
            </el-button>
          </template>
        </el-alert>
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout__voice-alert {
  margin-bottom: 16px;
}
</style>
