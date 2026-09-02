/**
 * 总后台提醒告警音 / AudioContext / 本地 mp3。
 * LOCAL_AUDIO_PATH 与 AUDIO_UNLOCK_KEY 不准改。
 * 调用方仍从 admin-reminder-center.js 拿 getAudioStatus / unlockAudioPlayback。
 */
import { loadSettings } from './admin-reminder-settings.js'

const AUDIO_UNLOCK_KEY = 'gushi_admin_audio_unlocked_v1'

// 待接单预警（支付后约 4 分钟商家仍未接单）专用配音，走 public/audio 静态目录。
const LOCAL_AUDIO_PATH = '/audio/超时未接单.mp3'

let audioContext = null

export function readAudioUnlockedFlag() {
  try {
    return sessionStorage.getItem(AUDIO_UNLOCK_KEY) === '1'
  } catch (error) {
    return false
  }
}

export function writeAudioUnlockedFlag(unlocked) {
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

export function ensureAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) {
    return null
  }
  if (!audioContext) {
    audioContext = new Ctx()
  }
  return audioContext
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function playTone(ctx, frequency, durationMs, gainValue = 0.28) {
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

export async function playLocalAudio(settings = loadSettings()) {
  if (!settings.speechEnabled) {
    return false
  }

  return new Promise((resolve) => {
    try {
      const audio = new Audio(LOCAL_AUDIO_PATH)
      audio.volume = Math.max(Number(settings.speechVolume) || 1, 0.2)
      audio.onended = () => resolve(true)
      audio.onerror = () => resolve(false)
      const playPromise = audio.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => resolve(false))
      }
    } catch (error) {
      resolve(false)
    }
  })
}

export async function playAlertSound(settings = loadSettings()) {
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
