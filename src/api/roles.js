// 权限角色接口（S3-2：后端 /admin/roles 未实现；页面已停用调用，禁止假造 RBAC）。
import request from '../utils/request'
import { unwrapPayload } from './helpers'
import { isApiNotFound } from '../utils/list'

export { isApiNotFound as isRolesApiUnavailable }

/** @deprecated 后端无路由；角色页已不再调用 */
export async function fetchAdminRoles() {
  const response = await request.get('/admin/roles', {
    skipErrorToast: true,
  })
  return unwrapPayload(response)
}

/** @deprecated 需后端扩展 POST /admin/roles；前端不得假造矩阵 */
export async function createAdminRole(data) {
  const response = await request.post('/admin/roles', data)
  return unwrapPayload(response)
}

/** @deprecated 需后端扩展 PUT /admin/roles/:id */
export async function updateAdminRole(id, data) {
  const response = await request.put(`/admin/roles/${id}`, data)
  return unwrapPayload(response)
}

/** @deprecated 需后端扩展 DELETE /admin/roles/:id */
export async function deleteAdminRole(id) {
  const response = await request.delete(`/admin/roles/${id}`)
  return unwrapPayload(response)
}
