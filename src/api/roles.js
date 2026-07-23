// 权限角色接口。
import request from '../utils/request'
import { unwrapPayload } from './helpers'
import { isApiNotFound } from '../utils/list'

export { isApiNotFound as isRolesApiUnavailable }

/** 获取角色列表与权限矩阵 GET /admin/roles */
export async function fetchAdminRoles() {
  const response = await request.get('/admin/roles', {
    skipErrorToast: true,
  })
  return unwrapPayload(response)
}

/** 创建角色（需后端扩展 POST /admin/roles） */
export async function createAdminRole(data) {
  const response = await request.post('/admin/roles', data)
  return unwrapPayload(response)
}

/** 更新角色（需后端扩展 PUT /admin/roles/:id） */
export async function updateAdminRole(id, data) {
  const response = await request.put(`/admin/roles/${id}`, data)
  return unwrapPayload(response)
}

/** 删除角色（需后端扩展 DELETE /admin/roles/:id） */
export async function deleteAdminRole(id) {
  const response = await request.delete(`/admin/roles/${id}`)
  return unwrapPayload(response)
}
