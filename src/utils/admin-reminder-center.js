/**
 * 总后台语音/视觉提醒中心
 * 接收后端 admin_merchant_accept_pending_alert 事件，做去重、告警音、语音播报和浏览器通知。
 *
 * 浏览器策略说明：
 * - 首次必须由用户点击（登录按钮、顶栏「开启语音」等）解锁 AudioContext 和语音合成
 * - 解锁状态保存在 sessionStorage，同标签页刷新后需重新点一次
 */
const SETTINGS_KEY = 'gushi_admin_reminder_settings_v1'
const AUDIO_UNLOCK_KEY = 'gushi_admin_audio_unlocked_v1'
const RECENT_DEDUPE_MS = 60000

const DEFAULT_SETTINGS = {
  speechEnabled: true,
  soundEnabled: true,
  browserNotificationEnabled: true,
  speechRate: 0.95,
  speechVolume: 1,
  speechRepeatCount: 2,
  alarmRepeatCount: 3,
}

let audioContext = null
let recentDedupeMap = new Map()
let cachedChineseVoice = null
let voicesReadyPromise = null
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

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return { ...DEFAULT_SETTINGS }
    }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch (error) {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(nextSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings))
}

function readAudioUnlockedFlag() {
  try {
    return sessionStorage.getItem(AUDIO_UNLOCK_KEY) === '1'
  } catch (error) {
    return false
  }
}

function writeAudioUnlockedFlag(unlocked) {
  try {
    if (unlocked) {
      sessionStorage.setItem(AUDIO_UNLOCK_KEY, '1')
    } else {
      sessionStorage.removeItem(AUDIO_UNLOCK_KEY)
    }
  } catch (error) {
    // ignore
  }
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

function ensureAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) {
    return null
  }
  if (!audioContext) {
    audioContext = new Ctx()
  }
  return audioContext
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function playTone(ctx, frequency, durationMs, gainValue = 0.28) {
  return new Promise((resolve) => {
    try {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.type = 'square'
      oscillator.frequency.value = frequency
      gainNode.gain.value = gainValue
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.start()
      setTimeout(() => {
        try {
          oscillator.stop()
        } catch (error) {
          // ignore
        }
        resolve()
      }, durationMs)
    } catch (error) {
      resolve()
    }
  })
}

async function playAlertSound(settings = loadSettings()) {
  if (!settings.soundEnabled) {
    return false
  }

  const ctx = ensureAudioContext()
  if (!ctx) {
    return false
  }

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch (error) {
      console.warn('[admin-reminder] audio resume failed:', error)
      return false
    }
  }

  const repeatCount = Math.max(Number(settings.alarmRepeatCount) || 3, 1)
  for (let index = 0; index < repeatCount; index += 1) {
    await playTone(ctx, 880, 220, 0.3)
    await sleep(120)
    await playTone(ctx, 660, 220, 0.26)
    if (index < repeatCount - 1) {
      await sleep(180)
    }
  }

  return true
}

function ensureVoicesReady() {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve([])
  }

  if (voicesReadyPromise) {
    return voicesReadyPromise
  }

  voicesReadyPromise = new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length) {
      resolve(voices)
      return
    }

    const handleVoicesChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      resolve(window.speechSynthesis.getVoices())
    }

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      resolve(window.speechSynthesis.getVoices())
    }, 1200)
  })

  return voicesReadyPromise
}

function pickChineseVoice(voices = []) {
  if (cachedChineseVoice) {
    return cachedChineseVoice
  }

  const preferred = voices.find((voice) => /zh-CN|cmn|Chinese/i.test(`${voice.lang} ${voice.name}`))
  cachedChineseVoice = preferred || voices.find((voice) => voice.lang?.startsWith('zh')) || voices[0] || null
  return cachedChineseVoice
}

function speakOnce(text, settings, voices) {
  return new Promise((resolve) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      utterance.rate = settings.speechRate
      utterance.volume = settings.speechVolume
      const voice = pickChineseVoice(voices)
      if (voice) {
        utterance.voice = voice
      }
      utterance.onend = () => resolve(true)
      utterance.onerror = () => resolve(false)
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      resolve(false)
    }
  })
}

async function speakText(text, settings = loadSettings()) {
  if (!settings.speechEnabled || !text || typeof window === 'undefined' || !window.speechSynthesis) {
    return false
  }

  const ctx = ensureAudioContext()
  if (ctx?.state === 'suspended') {
    try {
      await ctx.resume()
    } catch (error) {
      // ignore
    }
  }

  const voices = await ensureVoicesReady()
  const repeatCount = Math.max(Number(settings.speechRepeatCount) || 2, 1)
  let spoke = false

  for (let index = 0; index < repeatCount; index += 1) {
    window.speechSynthesis.cancel()
    await sleep(80)
    const ok = await speakOnce(text, settings, voices)
    spoke = spoke || ok
    if (index < repeatCount - 1) {
      await sleep(500)
    }
  }

  return spoke
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

export function getReminderSettings() {
  return loadSettings()
}

export function updateReminderSettings(partial = {}) {
  const next = { ...loadSettings(), ...partial }
  saveSettings(next)
  notifyAudioStatusChange()
  return next
}

export function getAudioStatus() {
  const settings = loadSettings()
  const ctx = ensureAudioContext()
  return {
    unlocked: readAudioUnlockedFlag(),
    speechSupported: typeof window !== 'undefined' && !!window.speechSynthesis,
    audioContextState: ctx?.state || 'unsupported',
    speechEnabled: settings.speechEnabled,
    soundEnabled: settings.soundEnabled,
    browserNotificationEnabled: settings.browserNotificationEnabled,
  }
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
  await speakText('待接单语音提醒已开启', loadSettings())
  writeAudioUnlockedFlag(true)
  notifyAudioStatusChange()
  return getAudioStatus()
}

export async function testVoiceReminder() {
  const settings = loadSettings()
  await playAlertSound(settings)
  const spoke = await speakText('这是一条待接单预警测试播报，请确认您能听到语音', settings)
  if (!spoke) {
    throw new Error('语音播报失败，请检查浏览器是否允许声音，或点击顶栏「开启语音」后重试')
  }
  return true
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
    const spoke = await speakText(alert.speechText, settings)
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
