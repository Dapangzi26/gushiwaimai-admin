// 总后台骑手 / 自配送员管理 / 审核接口封装。
import request from '../utils/request'
import { unwrapPayload } from './helpers'

/**
 * 骑手列表
 * @param {object} params
 * @param {string} [params.role] - rider | merchant_delivery
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.online_status] - online | offline
 * @param {string} [params.audit_status] - all | pending | approved | rejected
 * @param {string} [params.nickname] - 昵称
 * @param {string} [params.phone] - 手机号
 * @param {string} [params.town_name] - 乡镇名
 * @param {string} [params.merchant_name] - 店铺名（自配送员 Tab）
 * @param {string} [params.keyword] - 兼容旧版单框搜索
 */
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
