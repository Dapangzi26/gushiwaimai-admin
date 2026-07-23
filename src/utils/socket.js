/**
 * 总后台 Socket 连接工具
 * 只负责连后端实时通道并监听「待接单预警」，不接入调度大屏那套地图/派单事件。
 */
import { io } from 'socket.io-client'
import { getStoredAuth } from './auth'

let socketInstance = null
let reminderHandler = null

function resolveSocketBaseUrl() {
  const explicit = String(import.meta.env.VITE_BACKEND_ORIGIN || '').trim()
  if (explicit) {
    return explicit.replace(/\/$/, '')
  }

  const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim()
  if (apiBase.startsWith('http')) {
    return apiBase.replace(/\/api\/?$/i, '')
  }

  return window.location.origin
}

export function connectAdminSocket(onReminder) {
  const { token } = getStoredAuth()
  if (!token) {
    return null
  }

  reminderHandler = typeof onReminder === 'function' ? onReminder : null

  if (socketInstance?.connected) {
    return socketInstance
  }

  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }

  socketInstance = io(resolveSocketBaseUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    timeout: 15000,
  })

  socketInstance.on('admin_merchant_accept_pending_alert', (payload) => {
    reminderHandler?.(payload)
  })

  socketInstance.on('connect_error', (error) => {
    console.warn('[admin-socket] connect_error:', error?.message || error)
  })

  return socketInstance
}

export function disconnectAdminSocket() {
  if (socketInstance) {
    socketInstance.off('admin_merchant_accept_pending_alert')
    socketInstance.disconnect()
    socketInstance = null
  }
  reminderHandler = null
}

export function getAdminSocket() {
  return socketInstance
}
