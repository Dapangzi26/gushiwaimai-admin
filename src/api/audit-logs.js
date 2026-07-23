// 系统审计日志接口。
import request from '../utils/request'
import { unwrapPayload } from './helpers'
import { isApiNotFound } from '../utils/list'

export { isApiNotFound as isAuditLogsApiUnavailable }

/**
 * 审计日志分页列表
 * @param {object} params
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.order_no] - 订单号
 * @param {string} [params.contact_name] - 联系人
 * @param {string} [params.contact_phone] - 手机号
 * @param {string} [params.keyword] - 兼容旧版：订单号 / 联系人 / 手机号（OR 匹配）
 * @param {string} [params.action] - 操作类型
 * @param {string} [params.operator_type] - user | merchant | rider | admin | system
 * @param {string} [params.start_time] - 开始时间
 * @param {string} [params.end_time] - 结束时间
 */
export async function fetchAuditLogs(params = {}) {
  const response = await request.get('/admin/audit-logs', {
    params,
    skipErrorToast: true,
  })
  return unwrapPayload(response)
}
