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
 * @param {string} [params.start_time] - 开始时间（按下单日 created_at）
 * @param {string} [params.end_time] - 结束时间（按下单日 created_at）
 * @param {string} [params.settled_start] - 入账起（按结算日 settled_at，用于分账/账单）
 * @param {string} [params.settled_end] - 入账止（按结算日 settled_at，用于分账/账单）
 */
export async function fetchAdminOrders(params = {}) {
  const response = await request.get('/admin/orders', { params })
  return unwrapPayload(response)
}

async function readBlobErrorMessage(payload, fallback = '导出失败') {
  if (!(payload instanceof Blob)) {
    return payload?.message || fallback
  }
  try {
    const text = await payload.text()
    const json = JSON.parse(text)
    return json?.message || fallback
  } catch {
    return fallback
  }
}

/**
 * 分账 csv 导出（D-P31）：与列表同一套筛选，下载筛选全量，不是本页。
 * 金额由后端按订单快照写出，前端不算利润。
 */
export async function exportAdminOrdersCsv(params = {}) {
  try {
    const blob = await request.get('/admin/orders/export', {
      params,
      responseType: 'blob',
      timeout: 120000,
      skipErrorToast: true,
    })
    if (blob instanceof Blob && /json/i.test(blob.type || '')) {
      throw new Error(await readBlobErrorMessage(blob))
    }
    if (blob instanceof Blob) return blob
    return new Blob([blob], { type: 'text/csv;charset=utf-8' })
  } catch (error) {
    const message = await readBlobErrorMessage(error?.response?.data, error?.message || '导出失败')
    error.message = message
    throw error
  }
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
