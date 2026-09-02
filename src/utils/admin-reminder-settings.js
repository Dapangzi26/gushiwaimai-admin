/**
 * 总后台语音提醒设置读写。storage 键不准改。
 * 调用方仍从 admin-reminder-center.js 拿 getReminderSettings / updateReminderSettings。
 */
const SETTINGS_KEY = 'gushi_admin_reminder_settings_v1'

export const DEFAULT_SETTINGS = {
  speechEnabled: true,
  soundEnabled: true,
  browserNotificationEnabled: true,
  speechRate: 0.95,
  speechVolume: 1,
  speechRepeatCount: 2,
  alarmRepeatCount: 3,
}

export function loadSettings() {
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

export function saveSettings(nextSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings))
}

export function getReminderSettings() {
  return loadSettings()
}

export function writeReminderSettings(partial = {}) {
  const next = { ...loadSettings(), ...partial }
  saveSettings(next)
  return next
}
