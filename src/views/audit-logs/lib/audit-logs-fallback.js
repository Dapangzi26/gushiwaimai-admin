// 审计页 API 404 后的订单 logs 采样：拉最近 30 单、本地筛、slice 分页。
// 父页 /audit-logs 还在。loadLogs 404 时转调这里。goOrder / initFromRoute / syncRouteQuery 仍在父页。
import { fetchAdminOrderDetail, fetchAdminOrders } from '../../../api/orders'
import { resolveList } from '../../../utils/list'
import { matchesLocalSearchKeyword, normalizeSearchKeyword } from '../../../utils/orderNo.js'

export function createAuditLogsFallback({
  fallbackLogCache,
  filters,
  pagination,
  logList,
  dataSource,
  normalizeAuditLog,
}) {
  function sortLogs(items) {
    return [...items].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    )
  }

  function matchesFallbackFilters(row) {
    const orderNo = normalizeSearchKeyword(filters.orderNo)
    if (orderNo && !matchesLocalSearchKeyword(orderNo, [row.order_no])) {
      return false
    }

    const contactName = filters.contactName.trim()
    if (contactName && !String(row.contact_name || '').includes(contactName)) {
      return false
    }

    const contactPhone = normalizeSearchKeyword(filters.contactPhone)
    if (contactPhone && !String(row.contact_phone || '').includes(contactPhone)) {
      return false
    }

    const action = filters.action.trim()
    if (action && !String(row.action || '').includes(action)) {
      return false
    }

    if (filters.operatorType && row.operator_type !== filters.operatorType) {
      return false
    }

    if (Array.isArray(filters.timeRange) && filters.timeRange.length === 2) {
      const createdAt = new Date(row.created_at || 0).getTime()
      const start = new Date(filters.timeRange[0]).getTime()
      const end = new Date(filters.timeRange[1]).getTime()
      if (createdAt < start || createdAt > end) {
        return false
      }
    }

    return true
  }

  function applyFallbackFilterAndPage() {
    const filtered = fallbackLogCache.value.filter(matchesFallbackFilters)
    pagination.total = filtered.length
    const start = (pagination.page - 1) * pagination.pageSize
    logList.value = filtered.slice(start, start + pagination.pageSize)
  }

  async function loadLogsFromOrdersFallback(forceRefresh = false) {
    if (forceRefresh) {
      fallbackLogCache.value = []
    }

    if (!fallbackLogCache.value.length) {
      const result = await fetchAdminOrders({ page: 1, limit: 30 })
      const orders = resolveList(result)
      const allLogs = []

      await Promise.all(
        orders.map(async (order) => {
          try {
            const detail = await fetchAdminOrderDetail(order.id)
            const logs = Array.isArray(detail?.logs) ? detail.logs : []
            logs.forEach((log) => {
              allLogs.push(normalizeAuditLog({
                ...log,
                order_id: order.id,
                order_no: detail.order_no || order.order_no,
                contact_name: detail.contact_name || order.contact_name || '',
                contact_phone: detail.contact_phone || order.contact_phone || '',
              }))
            })
          } catch {
            // 单笔订单详情失败不影响整体
          }
        }),
      )

      fallbackLogCache.value = sortLogs(allLogs)
    }

    dataSource.value = 'fallback'
    applyFallbackFilterAndPage()
  }

  return {
    sortLogs,
    matchesFallbackFilters,
    applyFallbackFilterAndPage,
    loadLogsFromOrdersFallback,
  }
}
