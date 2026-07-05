// 这个文件是“总后台订单中心接口封装”。
// 这里统一收口后台订单列表、订单详情、取消审核、售后退款平台仲裁这几条请求，避免页面里到处散落接口地址。
import request from '../utils/request'

// 后台订单列表。
export async function fetchAdminOrders(params = {}) {
  const response = await request.get('/admin/orders', { params })
  return unwrapPayload(response)
}

// 后台订单详情。
export async function fetchAdminOrderDetail(id) {
  const response = await request.get(`/admin/orders/${id}`)
  return unwrapPayload(response)
}

// 后台审核“用户取消申请”。
export async function auditAdminOrderCancel(id, data = {}) {
  const response = await request.put(`/admin/orders/${id}/cancel-audit`, data)
  return unwrapPayload(response)
}

// 后台“售后退款 / 平台介入”列表。
export async function fetchAdminRefunds(params = {}) {
  const response = await request.get('/admin/orders/refunds', { params })
  return unwrapPayload(response)
}

// 后台最终仲裁“售后退款申请”。
export async function auditAdminRefund(id, data = {}) {
  const response = await request.put(`/admin/orders/${id}/refund-audit`, data)
  return unwrapPayload(response)
}

function unwrapPayload(response) {
  return response?.data ?? response
}
