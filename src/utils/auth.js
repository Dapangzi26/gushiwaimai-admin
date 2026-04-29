const AUTH_STORAGE_KEY = 'gushi-admin-auth'

export function getStoredAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return createEmptyAuth()
  }

  try {
    const parsed = JSON.parse(raw)

    return {
      token: parsed?.token || '',
      admin: parsed?.admin || null,
    }
  } catch (error) {
    clearStoredAuth()
    return createEmptyAuth()
  }
}

export function setStoredAuth(payload) {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token: payload?.token || '',
      admin: payload?.admin || null,
    }),
  )
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

function createEmptyAuth() {
  return {
    token: '',
    admin: null,
  }
}
