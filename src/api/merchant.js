// 总后台商家管理 / 审核接口封装。
import request from '../utils/request'
import { unwrapPayload } from './helpers'

/**
 * 商家列表（含待审、已通过、已驳回）
 * @param {object} params
 * @param {number} [params.page]
 * @param {number} [params.page_size]
 * @param {string} [params.status] - all | pending | approved | rejected
 * @param {string} [params.store_name] - 店铺名称
 * @param {string} [params.phone] - 手机号
 * @param {string} [params.town_name] - 乡镇名
 */
export async function fetchAdminMerchants(params = {}) {
  const response = await request.get('/admin/merchant/pending', { params })
  return unwrapPayload(response)
}

export async function fetchAdminMerchantDetail(id) {
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
