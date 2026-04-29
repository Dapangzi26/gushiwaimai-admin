import request from '../utils/request'

export async function fetchFeedbackList() {
  const response = await request.get('/admin/feedback')
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

function unwrapPayload(response) {
  return response?.data ?? response
}
