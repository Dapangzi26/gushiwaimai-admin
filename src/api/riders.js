// 总后台骑手 / 自配送员管理 / 审核接口封装。
import request from '../utils/request'
import { unwrapPayload } from './helpers'

export async function fetchAdminRiders(params = {}) {
  const response = await request.get('/admin/rider', { params })
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

export async function fetchDeliveryAgents(params = {}) {
  return fetchAdminRiders({
    role: 'merchant_delivery',
    ...params,
  })
}

export async function deleteDeliveryAgent(id) {
  const response = await request.delete(`/admin/rider/${id}`)
  return unwrapPayload(response)
}
