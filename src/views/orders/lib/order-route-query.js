import { normalizeSearchKeyword } from '../../../utils/orderNo.js'
import { parseTimeRange } from './order-list-normalize.js'

export const ORDER_TAB = 'orders'
export const REFUND_TAB = 'refunds'
export const DEFAULT_PAGE_SIZE = 10

export function resolveActiveTabFromQuery(query) {
  const tab = getQueryString(query.tab)
  if (tab === REFUND_TAB) return REFUND_TAB
  return ORDER_TAB
}

export function getQueryString(value) {
  if (Array.isArray(value)) {
    return String(value[0] || '')
  }
  return value === undefined || value === null ? '' : String(value)
}

export function toPositiveNumber(value, fallback) {
  const num = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(num) && num > 0 ? num : fallback
}

export function normalizeQueryObject(query) {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, Array.isArray(value) ? String(value[0]) : String(value)]),
  )
}

export function createOrderRouteQuery({
  orderFilters,
  refundFilters,
  orderPagination,
  refundPagination,
  activeTab,
  highlightOrderId,
}) {
  function getOrderQueryParams() {
    const params = {
      page: orderPagination.page,
      limit: orderPagination.pageSize,
    }

    if (orderFilters.business_type) {
      params.business_type = orderFilters.business_type
    }
    if (orderFilters.status) {
      params.status = orderFilters.status
    }
    if (orderFilters.exception_type) {
      params.exception_type = orderFilters.exception_type
    }
    if (orderFilters.timeout_minutes !== '' && orderFilters.timeout_minutes !== null && orderFilters.timeout_minutes !== undefined) {
      params.timeout_minutes = orderFilters.timeout_minutes
    }

    const keyword = normalizeSearchKeyword(orderFilters.keyword)
    if (keyword) {
      params.keyword = keyword
    }

    const merchantName = orderFilters.merchant_name.trim()
    if (merchantName) {
      params.merchant_name = merchantName
    }

    const townName = orderFilters.town_name.trim()
    if (townName) {
      params.town_name = townName
    }

    Object.assign(params, parseTimeRange(orderFilters.time_range))
    return params
  }

  function getRefundQueryParams() {
    return {
      status: refundFilters.status || 'pending',
      page: refundPagination.page,
      limit: refundPagination.pageSize,
    }
  }

  function syncStateFromRoute(query) {
    activeTab.value = resolveActiveTabFromQuery(query)

    if (activeTab.value === ORDER_TAB) {
      orderFilters.business_type = getQueryString(query.business_type)
      orderFilters.status = getQueryString(query.status)
      orderFilters.exception_type = getQueryString(query.exception_type)
      orderFilters.timeout_minutes = getQueryString(query.timeout_minutes)
      orderFilters.keyword = getQueryString(query.keyword)
      orderFilters.merchant_name = getQueryString(query.merchant_name)
      orderFilters.town_name = getQueryString(query.town_name)

      const startTime = getQueryString(query.start_time)
      const endTime = getQueryString(query.end_time)
      orderFilters.time_range = startTime && endTime ? [startTime, endTime] : []

      orderPagination.page = toPositiveNumber(query.page, 1)
      orderPagination.pageSize = toPositiveNumber(query.limit ?? query.page_size, DEFAULT_PAGE_SIZE)
      highlightOrderId.value = getQueryString(query.highlight)
      return
    }

    refundFilters.status = getQueryString(query.refund_status) || 'pending'
    refundPagination.page = toPositiveNumber(query.page, 1)
    refundPagination.pageSize = toPositiveNumber(query.limit ?? query.page_size, DEFAULT_PAGE_SIZE)
    highlightOrderId.value = ''
  }

  function buildCurrentRouteQuery() {
    if (activeTab.value === REFUND_TAB) {
      return {
        tab: REFUND_TAB,
        refund_status: refundFilters.status || 'pending',
        page: String(refundPagination.page),
        limit: String(refundPagination.pageSize),
      }
    }

    const query = {
      tab: ORDER_TAB,
      page: String(orderPagination.page),
      limit: String(orderPagination.pageSize),
    }

    if (orderFilters.business_type) query.business_type = orderFilters.business_type
    if (orderFilters.status) query.status = orderFilters.status
    if (orderFilters.exception_type) query.exception_type = orderFilters.exception_type
    if (orderFilters.timeout_minutes !== '' && orderFilters.timeout_minutes !== null && orderFilters.timeout_minutes !== undefined) {
      query.timeout_minutes = String(orderFilters.timeout_minutes)
    }
    if (orderFilters.keyword.trim()) query.keyword = orderFilters.keyword.trim()
    if (orderFilters.merchant_name.trim()) query.merchant_name = orderFilters.merchant_name.trim()
    if (orderFilters.town_name.trim()) query.town_name = orderFilters.town_name.trim()

    const { start_time, end_time } = parseTimeRange(orderFilters.time_range)
    if (start_time && end_time) {
      query.start_time = start_time
      query.end_time = end_time
    }

    return query
  }

  return {
    getOrderQueryParams,
    getRefundQueryParams,
    syncStateFromRoute,
    buildCurrentRouteQuery,
  }
}
