// 总后台商家管理 / 审核接口封装。
import request from '../utils/request'
import { unwrapPayload } from './helpers'

/** 商家列表（含待审、已通过、已驳回） */
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
