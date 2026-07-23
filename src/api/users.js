// 平台用户管理接口。
import request from '../utils/request'
import { unwrapPayload } from './helpers'
import { isApiNotFound } from '../utils/list'

export { isApiNotFound as isPlatformUsersApiUnavailable }

/**
 * 平台用户分页列表
 * @param {object} params
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.keyword] - 昵称 / 手机号 / 用户 ID
 * @param {string} [params.status] - active | disabled
 */
export async function fetchPlatformUsers(params = {}) {
  const response = await request.get('/admin/users', {
    params,
    skipErrorToast: true,
  })
  return unwrapPayload(response)
}
