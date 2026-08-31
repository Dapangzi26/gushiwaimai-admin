// 权限角色接口（S3-2：后端 /admin/roles 未实现；页面已停用调用，禁止假造 RBAC）。
import { isApiNotFound } from '../utils/list'

export { isApiNotFound as isRolesApiUnavailable }
