import { nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  fetchAdminOrderDetail,
  fetchAdminOrders,
  fetchAdminRefunds,
} from '../../../api/orders'
import { getRequestErrorMessage } from '../../../utils/http'
import { formatOrderNoDisplay, looksLikeOrderNumber, normalizeOrderNoDigits } from '../../../utils/orderNo.js'
import {
  createDefaultOrderFilters,
  createDefaultRefundFilters,
  normalizeOrderRecord,
  normalizeRefundRecord,
  resolveList,
  resolveTotal,
} from './order-list-normalize.js'
import { DEFAULT_PAGE_SIZE, ORDER_TAB, REFUND_TAB } from './order-route-query.js'

export function createOrderListLoad({
  orderListState,
  refundListState,
  orderFilters,
  refundFilters,
  orderPagination,
  refundPagination,
  activeTab,
  highlightOrderId,
  detailVisible,
  detailLoading,
  detailError,
  detailData,
  getOrderQueryParams,
  getRefundQueryParams,
  replaceCurrentRouteQuery,
}) {
  async function loadOrders() {
    orderListState.loading = true
    orderListState.error = ''

    try {
      const result = await fetchAdminOrders(getOrderQueryParams())
      const items = resolveList(result).map(normalizeOrderRecord)
      orderListState.items = items
      orderListState.total = resolveTotal(result, items.length)
    } catch (error) {
      orderListState.error = getRequestErrorMessage(error, '订单列表加载失败')
      orderListState.items = []
      orderListState.total = 0
    } finally {
      orderListState.loading = false
    }
  }

  async function loadRefunds() {
    refundListState.loading = true
    refundListState.error = ''

    try {
      const result = await fetchAdminRefunds(getRefundQueryParams())
      const items = resolveList(result).map(normalizeRefundRecord)
      refundListState.items = items
      refundListState.total = resolveTotal(result, items.length)
    } catch (error) {
      refundListState.error = getRequestErrorMessage(error, '退款列表加载失败')
      refundListState.items = []
      refundListState.total = 0
    } finally {
      refundListState.loading = false
    }
  }

  async function handleTabChange(tabName) {
    activeTab.value = tabName

    if (tabName === REFUND_TAB) {
      refundPagination.page = 1
    } else {
      orderPagination.page = 1
    }

    await replaceCurrentRouteQuery()
  }

  function relaxFiltersForOrderNumberSearch() {
    if (!looksLikeOrderNumber(orderFilters.keyword)) {
      return false
    }

    let changed = false

    if (orderFilters.status) {
      orderFilters.status = ''
      changed = true
    }
    if (orderFilters.exception_type) {
      orderFilters.exception_type = ''
      changed = true
    }
    if (orderFilters.timeout_minutes !== '' && orderFilters.timeout_minutes !== null && orderFilters.timeout_minutes !== undefined) {
      orderFilters.timeout_minutes = ''
      changed = true
    }

    return changed
  }

  async function handleOrderNoClick(row) {
    const raw = normalizeOrderNoDigits(row?.order_no)
    if (!raw) {
      return
    }

    orderFilters.keyword = formatOrderNoDisplay(raw) || raw

    try {
      await navigator.clipboard.writeText(raw)
      ElMessage.success('订单号已复制，正在搜索')
    } catch {
      ElMessage.info('已填入订单号，正在搜索')
    }

    await handleSearch()
  }

  async function handleSearch() {
    if (activeTab.value === REFUND_TAB) {
      refundPagination.page = 1
    } else {
      orderPagination.page = 1
      relaxFiltersForOrderNumberSearch()
    }
    await replaceCurrentRouteQuery()
  }

  async function handleReset() {
    if (activeTab.value === REFUND_TAB) {
      Object.assign(refundFilters, createDefaultRefundFilters())
      refundPagination.page = 1
      refundPagination.pageSize = DEFAULT_PAGE_SIZE
    } else {
      Object.assign(orderFilters, createDefaultOrderFilters())
      orderPagination.page = 1
      orderPagination.pageSize = DEFAULT_PAGE_SIZE
    }

    await replaceCurrentRouteQuery()
  }

  async function handleCurrentChange(page) {
    if (activeTab.value === REFUND_TAB) {
      refundPagination.page = page
    } else {
      orderPagination.page = page
    }
    await replaceCurrentRouteQuery()
  }

  async function handleSizeChange(size) {
    if (activeTab.value === REFUND_TAB) {
      refundPagination.page = 1
      refundPagination.pageSize = size
    } else {
      orderPagination.page = 1
      orderPagination.pageSize = size
    }
    await replaceCurrentRouteQuery()
  }

  async function loadOrderDetail(orderId) {
    detailLoading.value = true
    detailError.value = ''
    detailData.value = null

    try {
      detailData.value = await fetchAdminOrderDetail(orderId)
    } catch (error) {
      detailError.value = getRequestErrorMessage(error, '订单详情加载失败')
    } finally {
      detailLoading.value = false
    }
  }

  async function handleViewOrder(row) {
    if (!row?.id) {
      ElMessage.warning('缺少订单 ID，无法查看详情')
      return
    }

    detailVisible.value = true
    await loadOrderDetail(row.id)
  }

  async function handleViewRefund(row) {
    if (!row?.order_id) {
      ElMessage.warning('缺少订单 ID，无法查看详情')
      return
    }

    detailVisible.value = true
    await loadOrderDetail(row.order_id)
  }

  function handleContact(type, row) {
    const phoneMap = {
      merchant: row.merchant_phone,
      rider: row.rider_phone,
      user: row.user_phone,
    }

    const phone = phoneMap[type]
    if (!phone) {
      ElMessage.warning('暂无可联系号码')
      return
    }

    window.location.href = `tel:${phone}`
  }

  async function scrollToHighlightedOrder() {
    if (!highlightOrderId.value) {
      return
    }

    await nextTick()
    document.querySelector('.orders-table__row--highlight')?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    })
  }

  return {
    loadOrders,
    loadRefunds,
    handleTabChange,
    relaxFiltersForOrderNumberSearch,
    handleOrderNoClick,
    handleSearch,
    handleReset,
    handleCurrentChange,
    handleSizeChange,
    loadOrderDetail,
    handleViewOrder,
    handleViewRefund,
    handleContact,
    scrollToHighlightedOrder,
  }
}
