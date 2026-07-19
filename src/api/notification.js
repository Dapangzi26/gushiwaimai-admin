import request from '../utils/request'
import { unwrapPayload } from './helpers'

export async function fetchNotifications(params) {
  const response = await request.get('/admin/notifications', { params })
  return unwrapPayload(response)
}

export async function createNotification(payload) {
  const response = await request.post('/admin/notifications', payload)
  return unwrapPayload(response)
}

export async function updateNotification(id, payload) {
  const response = await request.put(`/admin/notifications/${id}`, payload)
  return unwrapPayload(response)
}

export async function deleteNotification(id) {
  const response = await request.delete(`/admin/notifications/${id}`)
  return unwrapPayload(response)
}

export async function publishNotification(id) {
  const response = await request.post(`/admin/notifications/${id}/publish`)
  return unwrapPayload(response)
}

export async function offlineNotification(id) {
  const response = await request.post(`/admin/notifications/${id}/offline`)
  return unwrapPayload(response)
}

export async function toggleNotificationPin(id, isPinned) {
  const response = await request.post(`/admin/notifications/${id}/pin`, {
    is_pinned: isPinned,
  })
  return unwrapPayload(response)
}
