// 总后台订单中心接口封装。
import request from '../utils/request'
import { unwrapPayload } from './helpers'

/**
 * 订单列表
 * @param {object} params
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.status] - 订单状态码
 * @param {string} [params.business_type] - county_takeout | town_takeout
 * @param {string} [params.keyword] - 订单号 / 联系人 / 手机号
 * @param {string} [params.merchant_name] - 商家名称
 * @param {string} [params.town_name] - 乡镇名称
 * @param {string} [params.start_time] - 开始时间
 * @param {string} [params.end_time] - 结束时间
 */
export async function fetchAdminOrders(params = {}) {
  const response = await request.get('/admin/orders', { params })
  return unwrapPayload(response)
}

export async function fetchAdminOrderDetail(id) {
  const response = await request.get(`/admin/orders/${id}`)
  return unwrapPayload(response)
}

export async function auditAdminOrderCancel(id, data = {}) {
  const response = await request.put(`/admin/orders/${id}/cancel-audit`, data)
  return unwrapPayload(response)
}

export async function fetchAdminRefunds(params = {}) {
  const response = await request.get('/admin/orders/refunds', { params })
  return unwrapPayload(response)
}

export async function auditAdminRefund(id, data = {}) {
  const response = await request.put(`/admin/orders/${id}/refund-audit`, data)
  return unwrapPayload(response)
}

/** 待平台仲裁的售后退款数量（工作台角标） */
export async function fetchPendingRefundCount() {
  const result = await fetchAdminRefunds({ status: 'pending', page: 1, limit: 1 })
  return Number(result?.pagination?.total ?? result?.total ?? 0)
}
