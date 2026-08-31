// 运营配置接口（S3-3：后端仅 GET /admin/config；写入另立项，禁止假造 PUT）。
import request from '../utils/request'
import { unwrapPayload } from './helpers'
import { isApiNotFound } from '../utils/list'

export { isApiNotFound as isAdminConfigApiUnavailable }

/** 读取运营配置（服务区域、商家类目等）；响应含 read_only: true */
export async function fetchAdminConfig() {
  const response = await request.get('/admin/config', {
    skipErrorToast: true,
  })
  return unwrapPayload(response)
}
