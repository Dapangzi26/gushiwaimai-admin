<script setup>
// 这个文件是“总后台订单中心”。
// 这里现在同时承接两条链路：
// 1. 用户取消订单后，进入后台人工审核的“取消申请”
// 2. 用户申请售后退款后，进入平台处理的“售后退款 / 平台介入”
// 这样你在总后台里就不用再分散到别的页面找处理入口了。
import { reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  auditAdminOrderCancel,
  auditAdminRefund,
  fetchAdminOrderDetail,
  fetchAdminOrders,
  fetchAdminRefunds,
} from '../../api/orders'
import RefundAuditTab from './RefundAuditTab.vue'
import OrderListTab from './OrderListTab.vue'
// D-1：订单详情抽屉、退款责任弹窗都拆成同目录子组件，父页只做“取数 + 编排”
import OrderDetailDrawer from './OrderDetailDrawer.vue'
import RefundApproveDialog from './RefundApproveDialog.vue'
import { getRequestErrorMessage } from '../../utils/http'
import { formatOrderNoDisplay, looksLikeOrderNumber, normalizeOrderNoDigits, normalizeSearchKeyword } from '../../utils/orderNo.js'
import { getBackendOrigin } from '../../utils/backend-origin'

const route = useRoute()
const router = useRouter()
const backendOrigin = getBackendOrigin()

const ORDER_TAB = 'orders'
const REFUND_TAB = 'refunds'
const DEFAULT_PAGE_SIZE = 10

const TAB_OPTIONS = [
  { label: '订单列表', value: ORDER_TAB },
  { label: '售后退款 / 平台介入', value: REFUND_TAB },
]

const BUSINESS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '县城外卖', value: 'county_takeout' },
  { label: '乡镇外卖', value: 'town_takeout' },
]

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待接单', value: '1' },
  { label: '备餐中', value: '2' },
  { label: '待配送', value: '3' },
  { label: '待取餐', value: '4' },
  { label: '配送中', value: '5' },
  { label: '已送达待确认', value: '8' },
  { label: '已完成', value: '6' },
  { label: '已取消', value: '7' },
]

const EXCEPTION_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待接单预警', value: 'timeout_unaccepted' },
  { label: '待补账', value: 'settlement_pending' },
]

const REFUND_STATUS_OPTIONS = [
  { label: '待处理', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '全部', value: 'all' },
]

const activeTab = ref(ORDER_TAB)
const highlightOrderId = ref('')

const orderListState = reactive({
  loading: false,
  error: '',
  items: [],
  total: 0,
})

const refundListState = reactive({
  loading: false,
  error: '',
  items: [],
  total: 0,
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref(null)
const auditLoading = ref(false)
const refundApproveDialog = reactive({
  visible: false,
  orderId: null,
  responsibilityType: 'rider',
})

const orderFilters = reactive(createDefaultOrderFilters())
const refundFilters = reactive(createDefaultRefundFilters())

const orderPagination = reactive({
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
})

const refundPagination = reactive({
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
})

function createDefaultOrderFilters() {
  return {
    business_type: '',
    status: '',
    exception_type: '',
    timeout_minutes: '',
    time_range: [],
    keyword: '',
    merchant_name: '',
    town_name: '',
  }
}

function createDefaultRefundFilters() {
  return {
    status: 'pending',
  }
}

function resolveActiveTabFromQuery(query) {
  const tab = getQueryString(query.tab)
  if (tab === REFUND_TAB) return REFUND_TAB
  return ORDER_TAB
}

function resolveList(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.list)) {
    return payload.list
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  return []
}

function resolveTotal(payload, itemsLength) {
  const candidates = [payload?.total, payload?.count, payload?.total_count, payload?.meta?.total, payload?.pagination?.total]
  for (const value of candidates) {
    const total = Number(value)
    if (Number.isFinite(total)) {
      return total
    }
  }
  return itemsLength
}

function normalizeOrderRecord(item) {
  return {
    id: item?.id ?? '',
    order_no: normalizeOrderNoDigits(item?.order_no) || String(item?.order_no || '').trim() || '--',
    business_label: item?.business_label || '--',
    business_badge: item?.business_badge || '',
    merchant_name: item?.merchant?.name || '--',
    merchant_phone: item?.merchant?.phone || '',
    user_name: item?.buyer?.nickname || item?.contact_name || '--',
    user_phone: item?.buyer?.phone || item?.contact_phone || '',
    rider_name: item?.rider?.nickname || '--',
    rider_phone: item?.rider?.phone || '',
    area_name: item?.display_town_name || item?.customer_town || item?.merchant?.town_name || '--',
    town_name: item?.customer_town || item?.merchant?.town_name || '--',
    status_label: item?.status_label || '--',
    created_at: item?.created_at || '',
    wait_minutes: item?.wait_minutes,
    amount: item?.pay_amount || '--',
    // 每单利润列（D-P22）：后端 formatOrderSummary 已补这些字段，订单列表原来只映射 amount=pay_amount。
    // 镇上单 platform_income_amount 常为 0（商品 15% 计入 rider_fee），展示利润需并列 rider_fee（D-P30）。
    merchant_income_amount: item?.merchant_income_amount ?? '--',
    platform_income_amount: item?.platform_income_amount ?? '--',
    rider_fee: item?.rider_fee ?? '--',
    settled_at: item?.settled_at || '',
    latest_cancel_refund: item?.latest_cancel_refund || null,
    primary_exception_label: item?.primary_exception_label || '',
    exception_tags: Array.isArray(item?.exception_tags) ? item.exception_tags : [],
    raw: item,
  }
}

function normalizeRefundRecord(item) {
  return {
    id: item?.id ?? '',
    order_id: item?.order_id ?? '',
    refund_no: item?.refund_no || '--',
    order_no: normalizeOrderNoDigits(item?.order_no) || String(item?.order_no || '').trim() || '--',
    amount: item?.amount || '--',
    pay_amount: item?.pay_amount || '--',
    merchant_income_amount: item?.merchant_income_amount ?? '--',
    status: Number(item?.status),
    status_label: item?.status_label || '--',
    reason_type: item?.reason_type || '--',
    description: item?.description || '--',
    reject_reason: item?.reject_reason || '',
    user_claim_direction: item?.user_claim_direction || '',
    responsibility_type: item?.responsibility_type || '',
    responsibility_label: item?.responsibility_label || '',
    apply_source: item?.apply_source || '',
    audit_role: item?.audit_role || '',
    audit_role_label: item?.audit_role_label || '',
    audit_note: item?.audit_note || '',
    merchant_notified_at: item?.merchant_notified_at || '',
    merchant_audit_deadline_at: item?.merchant_audit_deadline_at || '',
    is_merchant_audit_overdue: Boolean(item?.is_merchant_audit_overdue),
    is_merchant_escalated: Boolean(item?.is_merchant_escalated),
    success_at: item?.success_at || '',
    customer_town: item?.customer_town || item?.merchant?.town_name || '--',
    buyer_name: item?.buyer?.nickname || '--',
    buyer_phone: item?.buyer?.phone || '',
    merchant_name: item?.merchant?.name || '--',
    merchant_town_name: item?.merchant?.town_name || '--',
    order_type: item?.order_type || '',
    // B-8：平台能否仲裁，只读后端 can_admin_arbitrate，不在前端镜像 audit_role 规则
    can_admin_arbitrate: typeof item?.can_admin_arbitrate === 'boolean'
      ? item.can_admin_arbitrate
      : null,
    raw: item,
  }
}

function parseTimeRange(range) {
  if (!Array.isArray(range) || range.length !== 2) {
    return {}
  }

  const [start, end] = range
  return {
    start_time: start || undefined,
    end_time: end || undefined,
  }
}

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

async function replaceCurrentRouteQuery() {
  const nextQuery = buildCurrentRouteQuery()
  const currentQuery = normalizeQueryObject(route.query)

  if (JSON.stringify(nextQuery) === JSON.stringify(currentQuery)) {
    if (activeTab.value === REFUND_TAB) {
      await loadRefunds()
    } else if (activeTab.value === ORDER_TAB) {
      await loadOrders()
    }
    return
  }

  await router.replace({ path: route.path, query: nextQuery })
}

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

// refund 由详情抽屉在点“通过取消”时把 pendingCancelRefund 一并 emit 上来
async function handleApproveCancel(refund) {
  const currentOrderId = detailData.value?.id
  if (!currentOrderId || !refund) {
    ElMessage.warning('当前没有待审核的取消申请')
    return
  }

  try {
    const { value } = await ElMessageBox.prompt(
      '这里填后台最终同意退款的金额。填全额就是无责取消，少于实付金额就是按人工审核结果扣除取消费用。',
      '通过取消申请',
      {
        confirmButtonText: '确认通过',
        cancelButtonText: '取消',
        inputValue: refund.amount || detailData.value?.pay_amount || '0.00',
        inputPattern: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
        inputErrorMessage: '请输入合法的退款金额',
      },
    )

    auditLoading.value = true
    await auditAdminOrderCancel(currentOrderId, {
      action: 'approve',
      refund_amount: value,
      responsibility_type: 'platform',
      audit_note: '后台人工审核通过取消申请',
    })
    ElMessage.success('已通过取消申请')
    await refreshAfterAudit(currentOrderId)
  } catch (error) {
    if (error !== 'cancel') {
      throw error
    }
  } finally {
    auditLoading.value = false
  }
}

// refund 同样来自详情抽屉的 emit；这里只用它判断“确实有待审核的取消申请”
async function handleRejectCancel(refund) {
  const currentOrderId = detailData.value?.id
  if (!currentOrderId || !refund) {
    ElMessage.warning('当前没有待审核的取消申请')
    return
  }

  try {
    const { value } = await ElMessageBox.prompt(
      '这里填写驳回原因，用户端会直接看到这条说明。',
      '驳回取消申请',
      {
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
        inputPattern: /^.{2,255}$/,
        inputErrorMessage: '驳回原因至少写 2 个字',
      },
    )

    auditLoading.value = true
    await auditAdminOrderCancel(currentOrderId, {
      action: 'reject',
      reject_reason: value,
      audit_note: '后台人工审核驳回取消申请',
    })
    ElMessage.success('已驳回取消申请')
    await refreshAfterAudit(currentOrderId)
  } catch (error) {
    if (error !== 'cancel') {
      throw error
    }
  } finally {
    auditLoading.value = false
  }
}

// targetRow 可能来自退款 Tab 的表格行，也可能来自详情抽屉 emit 的 pendingAfterSaleRefund
async function handleApproveRefund(targetRow = null) {
  const row = targetRow
  const currentOrderId = targetRow?.order_id || detailData.value?.id
  if (!currentOrderId) {
    ElMessage.warning('当前没有待处理的退款申请')
    return
  }

  if (row && !canAdminArbitrateRefund(row)) {
    ElMessage.warning('该退款尚在商家或站长审核阶段，平台暂不可仲裁')
    return
  }

  refundApproveDialog.orderId = currentOrderId
  refundApproveDialog.responsibilityType = 'rider'
  refundApproveDialog.visible = true
}

async function submitRefundApprove() {
  const currentOrderId = refundApproveDialog.orderId
  if (!currentOrderId) {
    return
  }

  auditLoading.value = true
  try {
    await auditAdminRefund(currentOrderId, {
      action: 'approve',
      responsibility_type: refundApproveDialog.responsibilityType,
      audit_note: `总后台通过售后退款申请（责任：${refundApproveDialog.responsibilityType === 'merchant' ? '商家' : '配送'}）`,
    })
    refundApproveDialog.visible = false
    ElMessage.success('已通过退款申请')
    await refreshAfterAudit(currentOrderId)
  } finally {
    auditLoading.value = false
  }
}

// 同 handleApproveRefund：targetRow 来自退款 Tab 表格行或详情抽屉 emit
async function handleRejectRefund(targetRow = null) {
  const row = targetRow
  const currentOrderId = targetRow?.order_id || detailData.value?.id
  if (!currentOrderId) {
    ElMessage.warning('当前没有待处理的退款申请')
    return
  }

  if (row && !canAdminArbitrateRefund(row)) {
    ElMessage.warning('该退款尚在商家或站长审核阶段，平台暂不可仲裁')
    return
  }

  try {
    const { value } = await ElMessageBox.prompt(
      '这里填写驳回原因，用户端会直接看到这条说明。',
      '驳回退款申请',
      {
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
        inputPattern: /^.{2,255}$/,
        inputErrorMessage: '驳回原因至少写 2 个字',
      },
    )

    auditLoading.value = true
    await auditAdminRefund(currentOrderId, {
      action: 'reject',
      reject_reason: value,
      audit_note: '总后台驳回售后退款申请',
    })
    ElMessage.success('已驳回退款申请')
    await refreshAfterAudit(currentOrderId)
  } catch (error) {
    if (error !== 'cancel') {
      throw error
    }
  } finally {
    auditLoading.value = false
  }
}

// 审核结束后，当前详情和列表都要一起刷新。
// 不然你会看到详情已变，但列表还是旧状态，容易误以为没成功。
async function refreshAfterAudit(currentOrderId) {
  if (currentOrderId) {
    await loadOrderDetail(currentOrderId)
  }

  if (activeTab.value === REFUND_TAB) {
    await loadRefunds()
    return
  }

  await loadOrders()
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

function getQueryString(value) {
  if (Array.isArray(value)) {
    return String(value[0] || '')
  }
  return value === undefined || value === null ? '' : String(value)
}

function toPositiveNumber(value, fallback) {
  const num = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(num) && num > 0 ? num : fallback
}

function normalizeQueryObject(query) {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, Array.isArray(value) ? String(value[0]) : String(value)]),
  )
}

/**
 * 平台是否可仲裁该笔售后退款（C3：只读后端 can_admin_arbitrate）。
 * 缺字段时不猜业务规则，默认不可操作，避免与 policy 漂移。
 * 说明：审核通过/驳回前父页要用它兜底校验，所以留在这里；详情抽屉里另有一份同逻辑用于展示，属既有约定。
 */
function canAdminArbitrateRefund(row) {
  if (!row || Number(row.status) !== 0) {
    return false
  }

  if (row.apply_source && row.apply_source !== 'after_sale') {
    return false
  }

  if (typeof row.can_admin_arbitrate === 'boolean') {
    return row.can_admin_arbitrate
  }
  if (typeof row.raw?.can_admin_arbitrate === 'boolean') {
    return row.raw.can_admin_arbitrate
  }

  return false
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

watch(
  () => route.query,
  async (query) => {
    syncStateFromRoute(query)

    if (activeTab.value === ORDER_TAB && relaxFiltersForOrderNumberSearch()) {
      await replaceCurrentRouteQuery()
      return
    }

    if (activeTab.value === REFUND_TAB) {
      await loadRefunds()
    } else if (activeTab.value === ORDER_TAB) {
      await loadOrders()
      await scrollToHighlightedOrder()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="page-shell">
    <h1 class="page-shell__title">订单中心</h1>

    <el-card class="page-shell__card orders-page">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane
          v-for="item in TAB_OPTIONS"
          :key="item.value"
          :label="item.label"
          :name="item.value"
        />
      </el-tabs>

      <OrderListTab
        v-if="activeTab === ORDER_TAB"
        :filters="orderFilters"
        :business-options="BUSINESS_OPTIONS"
        :status-options="STATUS_OPTIONS"
        :exception-options="EXCEPTION_OPTIONS"
        :list-state="orderListState"
        :highlight-order-id="highlightOrderId"
        @search="handleSearch"
        @reset="handleReset"
        @reload="loadOrders"
        @view-order="handleViewOrder"
        @order-no-click="handleOrderNoClick"
        @contact="handleContact"
      />

      <RefundAuditTab
        v-else-if="activeTab === REFUND_TAB"
        :filters="refundFilters"
        :status-options="REFUND_STATUS_OPTIONS"
        :list-state="refundListState"
        :audit-loading="auditLoading"
        @search="handleSearch"
        @reset="handleReset"
        @reload="loadRefunds"
        @view-refund="handleViewRefund"
        @approve="handleApproveRefund"
        @reject="handleRejectRefund"
      />

      <div class="orders-pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :current-page="activeTab === REFUND_TAB ? refundPagination.page : orderPagination.page"
          :page-size="activeTab === REFUND_TAB ? refundPagination.pageSize : orderPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="activeTab === REFUND_TAB ? refundListState.total : orderListState.total"
          @current-change="handleCurrentChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 订单详情抽屉：只展示，用户点的通过/驳回/拨号动作通过事件回传给本页处理 -->
    <OrderDetailDrawer
      v-model:visible="detailVisible"
      :detail-data="detailData"
      :detail-loading="detailLoading"
      :detail-error="detailError"
      :audit-loading="auditLoading"
      :backend-origin="backendOrigin"
      @approve-cancel="handleApproveCancel"
      @reject-cancel="handleRejectCancel"
      @approve-refund="handleApproveRefund"
      @reject-refund="handleRejectRefund"
      @contact="handleContact"
    />

    <!-- 通过退款前选责任归属的弹窗；确认后回到本页 submitRefundApprove 调后端结算 -->
    <RefundApproveDialog
      :dialog="refundApproveDialog"
      :audit-loading="auditLoading"
      @submit="submitRefundApprove"
    />
  </div>
</template>

<style scoped>
.orders-table__row--highlight > td {
  background: #fff7e6 !important;
}

.orders-page {
  border-radius: 12px;
}

.orders-filters {
  margin-bottom: 12px;
}

.orders-filter__select {
  width: 140px;
}

.orders-filter__input {
  width: 220px;
}

.orders-filter__input--wide {
  width: 320px;
}

.orders-filter__range {
  width: 360px;
}

.orders-alert {
  margin-bottom: 16px;
}

.orders-order-no {
  padding: 0;
  border: 0;
  background: transparent;
  color: #409eff;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  text-align: left;
  display: inline-block;
  max-width: 100%;
}

.orders-order-no:hover {
  text-decoration: underline;
}

.orders-table__main {
  font-size: 12px;
  line-height: 1.35;
}

.orders-table__sub {
  margin-top: 2px;
  color: #909399;
  font-size: 11px;
  line-height: 1.3;
}

.orders-table__exception {
  margin-top: 2px;
  color: #f56c6c;
  font-size: 11px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orders-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
