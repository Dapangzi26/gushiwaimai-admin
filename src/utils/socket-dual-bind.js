/**
 * 总后台 Socket L-4：旧名 + v1: 双订阅 dedupe
 */

const recentSocketEvents = new Map()
const SOCKET_DEDUPE_MS = 3000

function shouldSkipDuplicateSocketEvent(eventName, data) {
  const baseName = String(eventName || '').replace(/^v1:/, '')
  const key = String(
    data?.dedupeKey ||
      `${baseName}:${data?.data?.id || data?.data?.order_id || ''}:${data?.timestamp || ''}`
  )
  const now = Date.now()
  const last = recentSocketEvents.get(key)
  if (last && now - last < SOCKET_DEDUPE_MS) {
    return true
  }
  recentSocketEvents.set(key, now)
  return false
}

export function bindDualAdminSocketEvent(socket, eventName, handler) {
  if (!socket || !eventName || typeof handler !== 'function') {
    return () => {}
  }
  const wrapped = (data) => {
    if (shouldSkipDuplicateSocketEvent(eventName, data)) {
      return
    }
    handler(data)
  }
  socket.on(eventName, wrapped)
  if (!String(eventName).startsWith('v1:')) {
    socket.on(`v1:${eventName}`, wrapped)
  }
  return () => {
    socket.off(eventName, wrapped)
    if (!String(eventName).startsWith('v1:')) {
      socket.off(`v1:${eventName}`, wrapped)
    }
  }
}
