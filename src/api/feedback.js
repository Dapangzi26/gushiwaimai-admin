import request from '../utils/request'
import { unwrapPayload } from './helpers'

export async function fetchFeedbackList(params = {}) {
  const response = await request.get('/admin/feedback', { params })
  return unwrapPayload(response)
}

export async function fetchFeedbackDetail(id) {
  const response = await request.get(`/admin/feedback/${id}`)
  return unwrapPayload(response)
}

export async function updateFeedbackStatus(id, status) {
  const response = await request.put(`/admin/feedback/${id}/status`, { status })
  return unwrapPayload(response)
}
