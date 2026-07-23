// 运营配置读写接口。
import request from '../utils/request'
import { unwrapPayload } from './helpers'
import { isApiNotFound } from '../utils/list'

export { isApiNotFound as isAdminConfigApiUnavailable }

/** 读取运营配置（服务区域、商家类目等） */
export async function fetchAdminConfig() {
  const response = await request.get('/admin/config', {
    skipErrorToast: true,
  })
  return unwrapPayload(response)
}

/** 更新运营配置 */
export async function updateAdminConfig(data) {
  const response = await request.put('/admin/config', data)
  return unwrapPayload(response)
}
