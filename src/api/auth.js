import request from '../utils/request'

export async function adminLogin(payload) {
  const response = await request.post('/admin/auth/login', payload)
  return unwrapPayload(response)
}

export async function fetchCurrentAdmin() {
  const response = await request.get('/admin/auth/me')
  return unwrapPayload(response)
}

export async function fetchDispatchTicket() {
  const response = await request.post('/admin/auth/dispatch-ticket')
  return unwrapPayload(response)
}

export async function adminLogout() {
  const response = await request.post('/admin/auth/logout')
  return unwrapPayload(response)
}

function unwrapPayload(response) {
  return response?.data ?? response
}
