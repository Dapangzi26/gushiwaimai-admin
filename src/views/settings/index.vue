<!-- 这个页面是“总后台系统设置页”，展示当前管理员信息、联调环境配置与待接单语音提醒设置。 -->
<template>
  <div class="page-shell settings-page">
    <h1 class="page-shell__title">系统设置</h1>

    <el-card class="page-shell__card settings-card">
      <el-tabs v-model="activeTab" class="settings-tabs">
        <el-tab-pane label="语音提醒" name="voice">
          <p class="settings-hint">
            订单支付后超过 5 分钟商家仍未接单时播放告警音与语音播报。浏览器需先点击「开启语音」或「测试语音播报」授权后才能正常出声。
          </p>

          <div class="settings-voice-layout">
            <section class="settings-panel">
              <h2 class="settings-panel__title">播报方式</h2>

              <div class="settings-status">
                <el-tag :type="audioUnlocked ? 'success' : 'warning'" size="large">
                  {{ audioUnlocked ? '语音已解锁，可正常播报' : '语音未解锁，请先开启' }}
                </el-tag>
              </div>

              <div class="settings-switch-list">
                <div class="settings-switch-item">
                  <div>
                    <div class="settings-switch-item__label">语音播报</div>
                    <div class="settings-switch-item__desc">播报待接单订单号与等待时长</div>
                  </div>
                  <el-switch v-model="voiceSettings.speechEnabled" @change="handleSettingsChange" />
                </div>
                <div class="settings-switch-item">
                  <div>
                    <div class="settings-switch-item__label">告警音</div>
                    <div class="settings-switch-item__desc">配合语音前的提示音</div>
                  </div>
                  <el-switch v-model="voiceSettings.soundEnabled" @change="handleSettingsChange" />
                </div>
                <div class="settings-switch-item">
                  <div>
                    <div class="settings-switch-item__label">浏览器通知</div>
                    <div class="settings-switch-item__desc">页面在后台时弹出系统通知</div>
                  </div>
                  <el-switch
                    v-model="voiceSettings.browserNotificationEnabled"
                    @change="handleSettingsChange"
                  />
                </div>
              </div>

              <div class="settings-actions-row">
                <el-button type="primary" :loading="testingVoice" @click="handleTestVoice">
                  测试语音播报
                </el-button>
                <el-button :loading="unlockingAudio" @click="handleUnlockAudio">
                  开启语音
                </el-button>
              </div>
            </section>

            <section class="settings-panel">
              <h2 class="settings-panel__title">播报参数</h2>

              <el-form label-width="120px" label-position="left" class="settings-tuning-form">
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
              </el-form>
            </section>
          </div>
        </el-tab-pane>

        <el-tab-pane label="账号信息" name="account">
          <div class="settings-account-card">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="昵称">{{ admin?.nickname || '--' }}</el-descriptions-item>
              <el-descriptions-item label="手机号">{{ admin?.phone || '--' }}</el-descriptions-item>
              <el-descriptions-item label="角色">{{ getRoleLabel(admin?.role) }}</el-descriptions-item>
              <el-descriptions-item label="账号 ID">{{ admin?.id ?? '--' }}</el-descriptions-item>
            </el-descriptions>
            <div class="settings-actions-row settings-account-actions">
              <el-button type="danger" plain @click="handleLogout">退出登录</el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="环境配置" name="env">
          <div class="settings-env-list">
            <div class="settings-env-item">
              <span class="settings-env-item__label">API 基址</span>
              <span class="settings-env-item__value">{{ apiBaseUrl }}</span>
            </div>
            <div class="settings-env-item">
              <span class="settings-env-item__label">代理目标</span>
              <span class="settings-env-item__value">{{ apiProxyTarget }}</span>
            </div>
            <div class="settings-env-item">
              <span class="settings-env-item__label">静态资源</span>
              <span class="settings-env-item__value">{{ backendOrigin }}</span>
            </div>
            <div class="settings-env-item">
              <span class="settings-env-item__label">调度大屏</span>
              <span class="settings-env-item__value">{{ dispatchMapUrl }}</span>
            </div>
            <div class="settings-env-item">
              <span class="settings-env-item__label">前端端口</span>
              <span class="settings-env-item__value">5190（Vite 开发服务）</span>
            </div>
          </div>
          <p class="settings-env-note">
            修改 <code>.env.development</code> 中的 <code>VITE_DEV_API_PROXY</code>、
            <code>VITE_BACKEND_ORIGIN</code>、<code>VITE_DISPATCH_MAP_URL</code> 后需重启 dev 服务。
          </p>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
// 这个文件是“总后台系统设置页”逻辑，展示登录态、语音提醒与环境配置。
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../store/modules/auth'
import { getRoleLabel } from '../../utils/detail-display'
import {
  getReminderSettings,
  subscribeAudioStatus,
  testVoiceReminder,
  unlockAudioPlayback,
  updateReminderSettings,
} from '../../utils/admin-reminder-center'
import './settings.css'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('voice')
const admin = computed(() => authStore.adminInfo)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '未配置'
const apiProxyTarget = import.meta.env.VITE_DEV_API_PROXY || '未配置（开发代理）'
const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || '未配置'
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
