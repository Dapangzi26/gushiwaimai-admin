// 后端静态资源（图片、证照等）的 origin 前缀，供详情页拼完整 URL。

export function getBackendOrigin() {
  const explicit = String(import.meta.env.VITE_BACKEND_ORIGIN || '').trim()
  if (explicit) {
    return explicit.replace(/\/$/, '')
  }

  const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim()
  if (apiBase.startsWith('http')) {
    return apiBase.replace(/\/api\/?$/, '')
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}
