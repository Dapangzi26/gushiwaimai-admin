/**
 * 总后台提醒语音合成。testVoiceReminder 仍从 admin-reminder-center.js 再导出。
 */
import { loadSettings } from './admin-reminder-settings.js'
import { ensureAudioContext, playAlertSound, playLocalAudio, sleep } from './admin-reminder-audio.js'

let cachedChineseVoice = null
let voicesReadyPromise = null

export function ensureVoicesReady() {
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

export function pickChineseVoice(voices = []) {
  if (cachedChineseVoice) {
    return cachedChineseVoice
  }

  const preferred = voices.find((voice) => /zh-CN|cmn|Chinese/i.test(`${voice.lang} ${voice.name}`))
  cachedChineseVoice = preferred || voices.find((voice) => voice.lang?.startsWith('zh')) || voices[0] || null
  return cachedChineseVoice
}

export function speakOnce(text, settings, voices) {
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

export async function speakText(text, settings = loadSettings()) {
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

export async function testVoiceReminder() {
  const settings = loadSettings()
  await playAlertSound(settings)
  const localPlayed = await playLocalAudio(settings)
  if (localPlayed) {
    return true
  }
  const spoke = await speakText('这是一条待接单预警测试播报，请确认您能听到语音', settings)
  if (!spoke) {
    throw new Error('语音播报失败，请检查浏览器是否允许声音，或点击顶栏「开启语音」后重试')
  }
  return true
}
