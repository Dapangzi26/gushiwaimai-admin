// 这个文件是“总后台商家管理接口封装”。
// 复用后台商家审核列表接口，支持按审核状态分页查询已上线/待审/已驳回商家。
import request from '../utils/request'

/**
 * 后台商家列表（含待审、已通过、已驳回）
 * @param {object} params - status(pending|approved|rejected|all)、page、page_size
 */
export async function fetchAdminMerchants(params = {}) {
  const response = await request.get('/admin/merchant/pending', { params })
  return unwrapPayload(response)
}

export async function fetchAdminMerchantDetail(id) {
  const response = await request.get(`/admin/merchant/${id}`)
  return unwrapPayload(response)
}

function unwrapPayload(response) {
  return response?.data ?? response
}
