// 总后台订单中心接口封装。
import request from '../utils/request'
import { unwrapPayload } from './helpers'

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
