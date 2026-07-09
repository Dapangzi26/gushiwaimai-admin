<!-- 这个页面是“总后台系统设置页”，展示当前管理员信息、联调环境配置与待接单语音提醒设置。 -->
<template>
  <div class="page-shell">
    <h1 class="page-shell__title">系统设置</h1>

    <el-card class="page-shell__card">
      <template #header>待接单语音提醒</template>
      <el-alert
        type="info"
        show-icon
        :closable="false"
        class="settings-alert"
        title="使用说明"
        description="订单支付后超过 5 分钟商家仍未接单时，总后台会播放告警音并语音播报。浏览器要求先点击「开启语音」或下方测试按钮，才能正常出声。"
      />

      <div class="settings-voice-status">
        <el-tag :type="audioUnlocked ? 'success' : 'warning'" size="large">
          {{ audioUnlocked ? '语音已解锁，可正常播报' : '语音未解锁，请点击测试或顶栏开启' }}
        </el-tag>
      </div>

      <el-form label-width="140px" class="settings-voice-form">
        <el-form-item label="语音播报">
          <el-switch v-model="voiceSettings.speechEnabled" @change="handleSettingsChange" />
        </el-form-item>
        <el-form-item label="告警音">
          <el-switch v-model="voiceSettings.soundEnabled" @change="handleSettingsChange" />
        </el-form-item>
        <el-form-item label="浏览器通知">
          <el-switch v-model="voiceSettings.browserNotificationEnabled" @change="handleSettingsChange" />
        </el-form-item>
        <el-form-item label="语音重复次数">
          <el-input-number
            v-model="voiceSettings.speechRepeatCount"
            :min="1"
            :max="5"
            @change="handleSettingsChange"
          />
        </el-form-item>
        <el-form-item label="告警音重复组数">
          <el-input-number
            v-model="voiceSettings.alarmRepeatCount"
            :min="1"
            :max="6"
            @change="handleSettingsChange"
          />
        </el-form-item>
        <el-form-item label="语速">
          <el-slider
            v-model="voiceSettings.speechRate"
            :min="0.7"
            :max="1.3"
            :step="0.05"
            show-input
            @change="handleSettingsChange"
          />
        </el-form-item>
        <el-form-item label="音量">
          <el-slider
            v-model="voiceSettings.speechVolume"
            :min="0.3"
            :max="1"
            :step="0.05"
            show-input
            @change="handleSettingsChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="testingVoice" @click="handleTestVoice">
            测试语音播报
          </el-button>
          <el-button :loading="unlockingAudio" @click="handleUnlockAudio">
            开启语音
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="page-shell__card">
      <template #header>当前管理员</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="昵称">{{ admin?.nickname || '--' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ admin?.phone || '--' }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ admin?.role || 'admin' }}</el-descriptions-item>
        <el-descriptions-item label="账号ID">{{ admin?.id ?? '--' }}</el-descriptions-item>
      </el-descriptions>
      <div class="settings-actions">
        <el-button type="danger" plain @click="handleLogout">退出登录</el-button>
      </div>
    </el-card>

    <el-card class="page-shell__card">
      <template #header>联调环境</template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="API 基址">{{ apiBaseUrl }}</el-descriptions-item>
        <el-descriptions-item label="调度大屏地址">{{ dispatchMapUrl }}</el-descriptions-item>
        <el-descriptions-item label="前端端口">5190（Vite 开发服务）</el-descriptions-item>
      </el-descriptions>
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        class="settings-alert"
        title="环境变量说明"
        description="修改 .env.development 中的 VITE_API_BASE_URL / VITE_DISPATCH_MAP_URL 后需重启 dev 服务。生产部署请在构建时注入对应变量。"
      />
    </el-card>
  </div>
</template>

<script setup>
// 这个文件是“总后台系统设置页”逻辑，展示登录态、语音提醒与环境配置。
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../store/modules/auth'
import {
  getReminderSettings,
  subscribeAudioStatus,
  testVoiceReminder,
  unlockAudioPlayback,
  updateReminderSettings,
} from '../../utils/admin-reminder-center'

const router = useRouter()
const authStore = useAuthStore()

const admin = computed(() => authStore.adminInfo)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '未配置'
const dispatchMapUrl = import.meta.env.VITE_DISPATCH_MAP_URL || '未配置（调度页使用 fallback）'

const audioUnlocked = ref(false)
const testingVoice = ref(false)
const unlockingAudio = ref(false)
const voiceSettings = reactive({ ...getReminderSettings() })
let unsubscribeAudioStatus = null

function handleSettingsChange() {
  updateReminderSettings({ ...voiceSettings })
}

async function handleUnlockAudio() {
  unlockingAudio.value = true
  try {
    await unlockAudioPlayback()
    ElMessage.success('语音提醒已开启')
  } catch (error) {
    ElMessage.error(error?.message || '开启语音失败')
  } finally {
    unlockingAudio.value = false
  }
}

async function handleTestVoice() {
  testingVoice.value = true
  try {
    await unlockAudioPlayback()
    await testVoiceReminder()
    ElMessage.success('测试播报完成，请确认是否听到告警音和语音')
  } catch (error) {
    ElMessage.error(error?.message || '测试播报失败')
  } finally {
    testingVoice.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  router.replace('/login')
}

onMounted(() => {
  unsubscribeAudioStatus = subscribeAudioStatus((status) => {
    audioUnlocked.value = status.unlocked
  })
})

onUnmounted(() => {
  unsubscribeAudioStatus?.()
  unsubscribeAudioStatus = null
})
</script>

<style scoped>
.settings-actions {
  margin-top: 16px;
}

.settings-alert {
  margin-bottom: 16px;
}

.settings-voice-status {
  margin-bottom: 20px;
}

.settings-voice-form {
  max-width: 640px;
}
</style>
