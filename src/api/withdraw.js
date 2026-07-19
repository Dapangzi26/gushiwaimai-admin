// 总后台提现审核接口封装。
import request from '../utils/request'
import { unwrapPayload } from './helpers'

export async function fetchMerchantWithdrawals(params = {}) {
  const response = await request.get('/admin/withdraw/merchants', { params })
  return unwrapPayload(response)
}

export async function fetchRiderWithdrawals(params = {}) {
  const response = await request.get('/admin/withdraw/riders', { params })
  return unwrapPayload(response)
}

export async function approveMerchantWithdrawal(id, data = {}) {
  const response = await request.put(`/admin/withdraw/merchants/${id}/approve`, data)
  return unwrapPayload(response)
}

export async function rejectMerchantWithdrawal(id, data = {}) {
  const response = await request.put(`/admin/withdraw/merchants/${id}/reject`, data)
  return unwrapPayload(response)
}

export async function approveRiderWithdrawal(id, data = {}) {
  const response = await request.put(`/admin/withdraw/riders/${id}/approve`, data)
  return unwrapPayload(response)
}

export async function rejectRiderWithdrawal(id, data = {}) {
  const response = await request.put(`/admin/withdraw/riders/${id}/reject`, data)
  return unwrapPayload(response)
}

/** 待处理提现总数（商家 + 骑手），供工作台角标使用 */
export async function fetchPendingWithdrawCount() {
  const params = { status: 'pending', page: 1, limit: 1 }
  const [merchantResult, riderResult] = await Promise.all([
    fetchMerchantWithdrawals(params),
    fetchRiderWithdrawals(params),
  ])
  const merchantTotal = Number(merchantResult?.total) || 0
  const riderTotal = Number(riderResult?.total) || 0
  return merchantTotal + riderTotal
}
