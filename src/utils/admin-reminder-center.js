/**
 * 总后台语音/视觉提醒中心
 * 接收后端 admin_merchant_accept_pending_alert 事件，做去重、告警音、语音播报和浏览器通知。
 *
 * 浏览器策略说明：
 * - 首次必须由用户点击（登录按钮、顶栏「开启语音」等）解锁 AudioContext 和语音合成
 * - 解锁状态保存在 sessionStorage，同标签页刷新后需重新点一次
 *
 * 本文件是门面：7 个具名 export 原名仍从这里拿。dedupe 留本文件，禁止拆散后重连双报。
 * jumpPath 只写进 alert 对象，全仓无读取，禁止改成按它跳。
 */
import { getReminderSettings, loadSettings, writeReminderSettings } from './admin-reminder-settings.js'
import {
  ensureAudioContext,
  getAudioStatus,
  playAlertSound,
  playLocalAudio,
  writeAudioUnlockedFlag,
} from './admin-reminder-audio.js'
import { speakText, testVoiceReminder } from './admin-reminder-speech.js'

export { getReminderSettings } from './admin-reminder-settings.js'
export { getAudioStatus } from './admin-reminder-audio.js'
export { testVoiceReminder } from './admin-reminder-speech.js'

const RECENT_DEDUPE_MS = 60000

let recentDedupeMap = new Map()
const audioStatusListeners = new Set()

function notifyAudioStatusChange() {
  const status = getAudioStatus()
  audioStatusListeners.forEach((listener) => {
    try {
      listener(status)
    } catch (error) {
      console.warn('[admin-reminder] status listener failed:', error)
    }
  })
}

export function subscribeAudioStatus(listener) {
  if (typeof listener !== 'function') {
    return () => {}
  }

  audioStatusListeners.add(listener)
  listener(getAudioStatus())
  return () => audioStatusListeners.delete(listener)
}

function cleanupDedupeMap() {
  const now = Date.now()
  recentDedupeMap.forEach((expireAt, key) => {
    if (expireAt <= now) {
      recentDedupeMap.delete(key)
    }
  })
}

function shouldSkipByDedupe(dedupeKey) {
  if (!dedupeKey) {
    return false
  }
  cleanupDedupeMap()
  const expireAt = recentDedupeMap.get(dedupeKey)
  return expireAt && expireAt > Date.now()
}

function markDedupe(dedupeKey) {
  if (!dedupeKey) {
    return
  }
  recentDedupeMap.set(dedupeKey, Date.now() + RECENT_DEDUPE_MS)
}

function normalizeAlert(payload = {}) {
  const data = payload.data || {}
  const orderNo = String(data.order_no || payload.order_no || '').trim()
  const merchantName = String(data.merchant_name || payload.merchant_name || '商家').trim() || '商家'
  const merchantPhone = String(data.merchant_phone || payload.merchant_phone || '').trim()
  const waitMinutes = Number(data.wait_minutes || payload.wait_minutes) || 5
  const cancelAfterMinutes = Number(data.cancel_after_minutes || payload.cancel_after_minutes) || 15

  return {
    eventType: payload.eventType || payload.type || 'admin_merchant_accept_pending_alert',
    title: payload.title || '待接单预警',
    message: payload.message || `${merchantName} 的订单 ${orderNo || '--'} 已支付 ${waitMinutes} 分钟仍未接单，请尽快联系商家`,
    speechText: payload.speechText || `注意，${merchantName}有订单即将超时未接单，请尽快联系商家处理`,
    dedupeKey: payload.dedupeKey || `admin_merchant_accept_pending:${data.order_id || data.id || orderNo}`,
    orderId: data.order_id || data.id || null,
    orderNo,
    merchantName,
    merchantPhone,
    waitMinutes,
    cancelAfterMinutes,
    jumpPath: payload.jumpPath || '/orders',
    timestamp: payload.timestamp || new Date().toISOString(),
  }
}

function showBrowserNotification(alert, settings = loadSettings()) {
  if (!settings.browserNotificationEnabled || typeof window === 'undefined' || !('Notification' in window)) {
    return
  }

  const show = () => {
    try {
      new Notification(alert.title, {
        body: alert.message,
        tag: alert.dedupeKey,
      })
    } catch (error) {
      console.warn('[admin-reminder] notification failed:', error)
    }
  }

  if (Notification.permission === 'granted') {
    show()
    return
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        show()
      }
    })
  }
}

export function updateReminderSettings(partial = {}) {
  const next = writeReminderSettings(partial)
  notifyAudioStatusChange()
  return next
}

/**
 * 在用户点击后调用，解锁告警音和语音播报能力。
 */
export async function unlockAudioPlayback() {
  const ctx = ensureAudioContext()
  if (ctx?.state === 'suspended') {
    await ctx.resume()
  }

  await playAlertSound({ ...loadSettings(), alarmRepeatCount: 1 })
  const localPlayed = await playLocalAudio(loadSettings())
  if (!localPlayed) {
    await speakText('待接单语音提醒已开启', loadSettings())
  }
  writeAudioUnlockedFlag(true)
  notifyAudioStatusChange()
  return getAudioStatus()
}

export function createAdminReminderCenter(options = {}) {
  const onAlert = typeof options.onAlert === 'function' ? options.onAlert : null

  async function handleReminderPayload(payload) {
    const settings = loadSettings()
    const alert = normalizeAlert(payload)
    if (shouldSkipByDedupe(alert.dedupeKey)) {
      return null
    }
    markDedupe(alert.dedupeKey)

    await playAlertSound(settings)
    const localPlayed = await playLocalAudio(settings)
    const spoke = localPlayed ? true : await speakText(alert.speechText, settings)
    if (!spoke && settings.speechEnabled) {
      await playAlertSound({ ...settings, alarmRepeatCount: Math.max(settings.alarmRepeatCount, 4) })
    }

    showBrowserNotification(alert, settings)
    onAlert?.(alert)
    return alert
  }

  return {
    handleReminderPayload,
    getSettings: getReminderSettings,
    updateSettings: updateReminderSettings,
    unlockAudioPlayback,
    testVoiceReminder,
    getAudioStatus,
  }
}
