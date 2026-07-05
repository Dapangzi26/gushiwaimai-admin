// 这个文件是“总后台骑手管理接口封装”。
// 这里统一收口后台骑手列表、自配送员列表、删除自配送员这些请求，方便页面按角色切换复用。
import request from '../utils/request'

// 后台骑手列表接口。
// role 支持 rider(平台骑手) 和 merchant_delivery(商家自配送员)。
export async function fetchAdminRiders(params = {}) {
  const response = await request.get('/admin/rider', {
    params,
  })
  return response?.data ?? response
}

// 兼容旧页面命名，保留“自配送员列表”这个导出。
export async function fetchDeliveryAgents(params = {}) {
  return fetchAdminRiders({
    role: 'merchant_delivery',
    ...params,
  })
}

// 删除商家自配送员。
// 后端只允许删除 merchant_delivery，所以这个方法不要拿去删平台骑手。
export async function deleteDeliveryAgent(id) {
  const response = await request.delete(`/admin/rider/${id}`)
  return response?.data ?? response
}
