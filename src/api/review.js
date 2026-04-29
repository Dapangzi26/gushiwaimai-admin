import request from '../utils/request'

export async function fetchPendingMerchants() {
  const response = await request.get('/admin/merchant/pending')
  return unwrapPayload(response)
}

export async function fetchMerchantDetail(id) {
  const response = await request.get(`/admin/merchant/${id}`)
  return unwrapPayload(response)
}

export async function approveMerchant(id) {
  const response = await request.put(`/admin/merchant/${id}/approve`)
  return unwrapPayload(response)
}

export async function rejectMerchant(id) {
  const response = await request.put(`/admin/merchant/${id}/reject`)
  return unwrapPayload(response)
}

export async function fetchPendingRiders() {
  const response = await request.get('/admin/rider/pending')
  return unwrapPayload(response)
}

export async function fetchRiderDetail(id) {
  const response = await request.get(`/admin/rider/${id}`)
  return unwrapPayload(response)
}

export async function approveRider(id) {
  const response = await request.put(`/admin/rider/${id}/approve`)
  return unwrapPayload(response)
}

export async function rejectRider(id) {
  const response = await request.put(`/admin/rider/${id}/reject`)
  return unwrapPayload(response)
}

function unwrapPayload(response) {
  return response?.data ?? response
}
