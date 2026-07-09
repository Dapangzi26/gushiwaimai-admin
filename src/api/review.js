import request from '../utils/request'

export async function fetchPendingMerchants(params = {}) {
  const response = await request.get('/admin/merchant/pending', { params })
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

export async function rejectMerchant(id, data = {}) {
  const response = await request.put(`/admin/merchant/${id}/reject`, data)
  return unwrapPayload(response)
}

export async function fetchPendingRiders(params = {}) {
  const response = await request.get('/admin/rider/pending', { params })
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

export async function rejectRider(id, data = {}) {
  const response = await request.put(`/admin/rider/${id}/reject`, data)
  return unwrapPayload(response)
}

function unwrapPayload(response) {
  return response?.data ?? response
}
