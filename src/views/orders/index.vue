<script setup>
// 这个文件是“总后台订单中心”。
// 这里现在同时承接两条链路：
// 1. 用户取消订单后，进入后台人工审核的“取消申请”
// 2. 用户申请售后退款后，进入平台处理的“售后退款 / 平台介入”
// 这样你在总后台里就不用再分散到别的页面找处理入口了。
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  auditAdminOrderCancel,
  auditAdminRefund,
  fetchAdminOrderDetail,
  fetchAdminOrders,
  fetchAdminRefunds,
} from '../../api/orders'
import { getRequestErrorMessage } from '../../utils/http'

const route = useRoute()
const router = useRouter()

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
  { label: '骑手已接单', value: '4' },
  { label: '配送中', value: '5' },
  { label: '已完成', value: '6' },
  { label: '已取消', value: '7' },
]

const EXCEPTION_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待接单预警', value: 'timeout_unaccepted' },
]

const REFUND_STATUS_OPTIONS = [
  { label: '待处理', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '全部', value: 'all' },
]

const activeTab = ref(ORDER_TAB)

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

const orderTableData = computed(() => orderListState.items)
const refundTableData = computed(() => refundListState.items)

// 取消申请仍然走旧链路，这里单独收口，避免和售后退款混在一起误审。
const pendingCancelRefund = computed(() => {
  const refund = detailData.value?.latest_cancel_refund
  if (refund?.apply_source === 'cancel' && Number(refund.status) === 0) {
    return refund
  }

  const refunds = Array.isArray(detailData.value?.refunds) ? detailData.value.refunds : []
  return refunds.find((item) => item?.apply_source === 'cancel' && Number(item.status) === 0) || null
})

// 售后退款：仅当平台有权仲裁时才在详情里展示操作区。
const pendingAfterSaleRefund = computed(() => {
  const refunds = Array.isArray(detailData.value?.refunds) ? detailData.value.refunds : []
  const pending = refunds.find((item) => item?.apply_source === 'after_sale' && Number(item.status) === 0) || null
  if (!pending) return null
  return canAdminArbitrateRefund({
    ...pending,
    order_type: pending.order_type || detailData.value?.order_type || '',
  }) ? pending : null
})

const waitingExternalAfterSaleRefund = computed(() => {
  const refunds = Array.isArray(detailData.value?.refunds) ? detailData.value.refunds : []
  const pending = refunds.find((item) => item?.apply_source === 'after_sale' && Number(item.status) === 0) || null
  if (!pending || pendingAfterSaleRefund.value) return null
  return pending
})

const detailSections = computed(() => {
  if (!detailData.value) {
    return []
  }

  return [
    { key: 'base', title: '订单基础信息', items: toEntries(detailData.value) },
    { key: 'merchant', title: '商家信息', items: toEntries(detailData.value?.merchant) },
    { key: 'buyer', title: '用户信息', items: toEntries(detailData.value?.buyer) },
    { key: 'rider', title: '骑手信息', items: toEntries(detailData.value?.rider) },
    { key: 'refund', title: '退款记录', items: Array.isArray(detailData.value?.refunds) ? detailData.value.refunds : [] },
    { key: 'logs', title: '订单日志', items: Array.isArray(detailData.value?.logs) ? detailData.value.logs : [] },
  ]
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
    order_no: item?.order_no || '--',
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
    amount: item?.pay_amount || item?.total_amount || '--',
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
    order_no: item?.order_no || '--',
    amount: item?.amount || '--',
    pay_amount: item?.pay_amount || '--',
    merchant_income_amount: item?.merchant_income_amount || '--',
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

  const keyword = orderFilters.keyword.trim()
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
  activeTab.value = getQueryString(query.tab) === REFUND_TAB ? REFUND_TAB : ORDER_TAB

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
    orderPagination.pageSize = toPositiveNumber(query.limit, DEFAULT_PAGE_SIZE)
    return
  }

  refundFilters.status = getQueryString(query.refund_status) || 'pending'
  refundPagination.page = toPositiveNumber(query.page, 1)
  refundPagination.pageSize = toPositiveNumber(query.limit, DEFAULT_PAGE_SIZE)
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
    } else {
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

async function handleSearch() {
  if (activeTab.value === REFUND_TAB) {
    refundPagination.page = 1
  } else {
    orderPagination.page = 1
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

async function handleApproveCancel() {
  const currentOrderId = detailData.value?.id
  const refund = pendingCancelRefund.value
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

async function handleRejectCancel() {
  const currentOrderId = detailData.value?.id
  if (!currentOrderId || !pendingCancelRefund.value) {
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

async function handleApproveRefund(targetRow = null) {
  const row = targetRow || pendingAfterSaleRefund.value
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

async function handleRejectRefund(targetRow = null) {
  const row = targetRow || pendingAfterSaleRefund.value
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

function formatTime(value) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', { hour12: false })
}

function formatWaitMinutes(value) {
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes < 0) {
    return '--'
  }

  if (minutes < 60) {
    return `${minutes} 分钟`
  }

  const hour = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hour} 小时 ${rest} 分钟` : `${hour} 小时`
}

function resolveExceptionTags(row) {
  const tags = []
  if (row.primary_exception_label) {
    tags.push(row.primary_exception_label)
  }

  for (const item of row.exception_tags) {
    const label = typeof item === 'string' ? item : item?.label
    if (label && !tags.includes(label)) {
      tags.push(label)
    }
  }

  return tags
}

function getBusinessTagType(label) {
  if (label.includes('乡镇')) return 'success'
  return 'primary'
}

function getOrderStatusTagType(label) {
  if (label.includes('完成')) return 'success'
  if (label.includes('取消')) return 'info'
  if (label.includes('配送') || label.includes('备餐')) return 'warning'
  if (label.includes('待')) return 'danger'
  return ''
}

function getRefundStatusTagType(status) {
  if (Number(status) === 2) return 'success'
  if (Number(status) === 3) return 'danger'
  if (Number(status) === 4) return 'info'
  return 'warning'
}

function getApplySourceLabel(source) {
  if (source === 'after_sale') return '售后退款'
  if (source === 'cancel') return '取消申请'
  return source || '--'
}

function getResponsibilityTypeLabel(type) {
  if (type === 'platform') return '平台'
  if (type === 'merchant') return '商家'
  if (type === 'rider') return '骑手/站长'
  if (type === 'user') return '用户'
  return type || '--'
}

function getRefundAuditChannelLabel(refund) {
  if (!refund) {
    return '--'
  }

  if (refund.apply_source !== 'after_sale') {
    return '后台取消审核'
  }

  if (refund.audit_role === 'merchant') {
    return refund.is_merchant_audit_overdue ? '待商家处理（已超时）' : '待商家处理'
  }

  if (refund.audit_role === 'station') {
    return '待站长审核'
  }

  if (refund.is_merchant_escalated || String(refund.audit_note || '').includes('商家超时')) {
    return '商家超时转平台'
  }

  if (refund.audit_role === 'admin' && String(refund.audit_note || '').includes('转平台')) {
    return '站长拒绝后转平台'
  }

  return '平台直接处理'
}

function isRefundRowHighlighted(row) {
  return Boolean(row?.is_merchant_audit_overdue || row?.is_merchant_escalated)
}

/** 平台是否可仲裁该笔售后退款（与后端 assertPlatformCanArbitrateRefund 对齐） */
function canAdminArbitrateRefund(row) {
  if (!row || Number(row.status) !== 0) {
    return false
  }

  if (row.apply_source && row.apply_source !== 'after_sale') {
    return false
  }

  const auditRole = String(row.audit_role || '').trim().toLowerCase()
  if (auditRole === 'merchant' || auditRole === 'station') {
    return false
  }

  const orderType = String(row.order_type || row.raw?.order_type || '').trim().toLowerCase()
  if (!auditRole && orderType === 'town') {
    return false
  }

  return true
}

function getRefundRowClassName({ row }) {
  return isRefundRowHighlighted(row) ? 'orders-table__row--highlight' : ''
}

function getRefundAuditBannerTitle(refund) {
  if (!refund) {
    return ''
  }

  return getRefundAuditChannelLabel(refund) === '站长拒绝后转平台'
    ? '这笔订单的退款申请已转入平台仲裁'
    : '这笔订单有待处理的售后退款申请'
}

function getRefundAuditBannerDescription(refund) {
  if (!refund) {
    return ''
  }

  const reason = refund.description || refund.reason_type || '未填写'
  const baseText = `退款原因：${reason}，退款金额：¥${refund.amount || '--'}`

  if (refund.audit_role === 'admin' && String(refund.audit_note || '').includes('转平台')) {
    return `${baseText}。站长已拒绝，现由平台最终处理。`
  }

  return `${baseText}。当前这笔售后退款由平台处理。`
}

function toEntries(section) {
  if (!section || Array.isArray(section) || typeof section !== 'object') {
    return []
  }

  return Object.entries(section).map(([key, value]) => ({
    key,
    label: DETAIL_LABEL_MAP[key] || key,
    value: formatDetailValue(value),
  }))
}

function formatDetailValue(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return value
}

const DETAIL_LABEL_MAP = {
  id: 'ID',
  order_no: '订单号',
  business_label: '业务标签',
  business_type: '业务类型',
  order_type: '订单分类',
  status: '状态码',
  status_label: '当前状态',
  created_at: '下单时间',
  paid_at: '支付时间',
  accepted_at: '接单时间',
  delivered_at: '送达时间',
  settled_at: '结算时间',
  pay_amount: '实付金额',
  total_amount: '订单金额',
  rider_fee: '配送费',
  merchant_income_amount: '商家应得',
  platform_income_amount: '平台收益',
  commission_amount: '抽佣金额',
  rider_incentive_amount: '骑手激励',
  customer_town: '用户乡镇',
  display_town_name: '展示乡镇',
  contact_name: '联系人',
  contact_phone: '联系电话',
  address: '配送地址',
  cancel_reason: '取消原因',
  remark: '订单备注',
  payment_channel: '支付渠道',
  dispatch_center_status: '调度状态',
  refund_no: '退款单号',
  amount: '退款金额',
  reason_type: '申请类型',
  description: '申请说明',
  apply_source: '申请来源',
  responsibility_type: '责任归属',
  cancel_fee_amount: '取消扣费',
  is_full_refund: '是否全额退款',
  reject_reason: '驳回原因',
  audit_note: '审核备注',
  audit_role: '审核角色',
  audit_user_id: '审核人ID',
  bearer_user_id: '承担人ID',
  bearer_amount: '承担金额',
  merchant_audit_at: '审核时间',
  success_at: '退款成功时间',
  nickname: '昵称',
  phone: '手机号',
  name: '名称',
  town_name: '乡镇名称',
  address_detail: '详细地址',
}

watch(
  () => route.query,
  async (query) => {
    syncStateFromRoute(query)

    if (activeTab.value === REFUND_TAB) {
      await loadRefunds()
    } else {
      await loadOrders()
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

      <template v-if="activeTab === ORDER_TAB">
        <el-form :inline="true" class="orders-filters" @submit.prevent>
          <el-form-item label="业务类型">
            <el-select v-model="orderFilters.business_type" class="orders-filter__select">
              <el-option
                v-for="item in BUSINESS_OPTIONS"
                :key="item.value || 'all-business'"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="订单状态">
            <el-select v-model="orderFilters.status" class="orders-filter__select">
              <el-option
                v-for="item in STATUS_OPTIONS"
                :key="item.value || 'all-status'"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="异常筛选">
            <el-select v-model="orderFilters.exception_type" class="orders-filter__select">
              <el-option
                v-for="item in EXCEPTION_OPTIONS"
                :key="item.value || 'all-exception'"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="时间范围">
            <el-date-picker
              v-model="orderFilters.time_range"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              class="orders-filter__range"
            />
          </el-form-item>

          <el-form-item label="订单号/联系人">
            <el-input
              v-model="orderFilters.keyword"
              placeholder="可搜订单号、联系人、手机号"
              clearable
              class="orders-filter__input"
              @keyup.enter="handleSearch"
            />
          </el-form-item>

          <el-form-item label="商家名称">
            <el-input
              v-model="orderFilters.merchant_name"
              placeholder="请输入商家名称"
              clearable
              class="orders-filter__input"
              @keyup.enter="handleSearch"
            />
          </el-form-item>

          <el-form-item label="乡镇名称">
            <el-input
              v-model="orderFilters.town_name"
              placeholder="请输入乡镇名称"
              clearable
              class="orders-filter__input"
              @keyup.enter="handleSearch"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>

        <el-alert
          v-if="orderListState.error"
          :title="orderListState.error"
          type="error"
          show-icon
          :closable="false"
          class="orders-alert"
        >
          <template #default>
            <el-button type="danger" link @click="loadOrders">重新加载</el-button>
          </template>
        </el-alert>

        <el-table
          v-loading="orderListState.loading"
          :data="orderTableData"
          border
          class="orders-table"
          empty-text="暂无订单数据"
        >
          <el-table-column label="业务标签" min-width="120" fixed="left">
            <template #default="{ row }">
              <el-tag :type="getBusinessTagType(row.business_label)" effect="dark">{{ row.business_label }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="order_no" label="订单号" min-width="200" show-overflow-tooltip />
          <el-table-column prop="merchant_name" label="商家" min-width="160" show-overflow-tooltip />

          <el-table-column label="用户/联系人" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">
              <div>{{ row.user_name }}</div>
              <div class="orders-table__sub">{{ row.user_phone || '--' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="配送区域/乡镇" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <div>{{ row.area_name }}</div>
              <div class="orders-table__sub">{{ row.town_name }}</div>
            </template>
          </el-table-column>

          <el-table-column label="当前状态" min-width="120">
            <template #default="{ row }">
              <el-tag :type="getOrderStatusTagType(row.status_label)">{{ row.status_label }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="下单时间" min-width="180">
            <template #default="{ row }">
              <span>{{ formatTime(row.created_at) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="已等待时长" min-width="130">
            <template #default="{ row }">
              <span>{{ formatWaitMinutes(row.wait_minutes) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="amount" label="金额" min-width="100" />

          <el-table-column label="异常标签" min-width="220">
            <template #default="{ row }">
              <div v-if="resolveExceptionTags(row).length" class="orders-exception-tags">
                <el-tag v-for="tag in resolveExceptionTags(row)" :key="tag" type="danger" effect="plain">{{ tag }}</el-tag>
              </div>
              <span v-else>--</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" min-width="260" fixed="right">
            <template #default="{ row }">
              <div class="orders-actions">
                <el-button link type="primary" @click="handleViewOrder(row)">查看详情</el-button>
                <el-button link @click="handleContact('merchant', row)">联系商家</el-button>
                <el-button link @click="handleContact('rider', row)">联系骑手</el-button>
                <el-button link @click="handleContact('user', row)">联系用户</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template v-else>
        <el-form :inline="true" class="orders-filters" @submit.prevent>
          <el-form-item label="退款状态">
            <el-select v-model="refundFilters.status" class="orders-filter__select">
              <el-option
                v-for="item in REFUND_STATUS_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>

        <el-alert
          v-if="refundListState.error"
          :title="refundListState.error"
          type="error"
          show-icon
          :closable="false"
          class="orders-alert"
        >
          <template #default>
            <el-button type="danger" link @click="loadRefunds">重新加载</el-button>
          </template>
        </el-alert>

        <el-table
          v-loading="refundListState.loading"
          :data="refundTableData"
          border
          class="orders-table"
          empty-text="暂无退款数据"
          :row-class-name="getRefundRowClassName"
        >
          <el-table-column prop="refund_no" label="退款单号" min-width="180" show-overflow-tooltip />
          <el-table-column prop="order_no" label="订单号" min-width="180" show-overflow-tooltip />

          <el-table-column label="用户" min-width="170">
            <template #default="{ row }">
              <div>{{ row.buyer_name }}</div>
              <div class="orders-table__sub">{{ row.buyer_phone || '--' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="商家" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">
              <div>{{ row.merchant_name }}</div>
              <div class="orders-table__sub">{{ row.customer_town || row.merchant_town_name || '--' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="申请来源" min-width="120">
            <template #default="{ row }">
              <el-tag type="warning">{{ getApplySourceLabel(row.apply_source) }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="处理来源" min-width="180">
            <template #default="{ row }">
              <el-tag :type="isRefundRowHighlighted(row) ? 'danger' : 'info'">
                {{ getRefundAuditChannelLabel(row) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="amount" label="退款金额" min-width="100" />
          <el-table-column prop="pay_amount" label="实付金额" min-width="100" />

          <el-table-column label="退款状态" min-width="120">
            <template #default="{ row }">
              <el-tag :type="getRefundStatusTagType(row.status)">{{ row.status_label }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="description" label="退款原因" min-width="220" show-overflow-tooltip />
          <el-table-column prop="reject_reason" label="驳回原因" min-width="180" show-overflow-tooltip />

          <el-table-column label="操作" min-width="240" fixed="right">
            <template #default="{ row }">
              <div class="orders-actions">
                <el-button link type="primary" @click="handleViewRefund(row)">查看订单</el-button>
                <el-button
                  v-if="Number(row.status) === 0 && canAdminArbitrateRefund(row)"
                  link
                  type="success"
                  :loading="auditLoading"
                  @click="handleApproveRefund(row)"
                >
                  通过退款
                </el-button>
                <el-button
                  v-if="Number(row.status) === 0 && canAdminArbitrateRefund(row)"
                  link
                  type="danger"
                  :loading="auditLoading"
                  @click="handleRejectRefund(row)"
                >
                  驳回退款
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <div class="orders-pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :current-page="activeTab === REFUND_TAB ? refundPagination.page : orderPagination.page"
          :page-size="activeTab === REFUND_TAB ? refundPagination.pageSize : orderPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="activeTab === REFUND_TAB ? refundListState.total : orderListState.total"
          @current-change="handleCurrentChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-drawer v-model="detailVisible" title="订单详情" size="680px">
      <div v-loading="detailLoading">
        <el-alert v-if="detailError" :title="detailError" type="error" show-icon :closable="false" />

        <template v-else-if="detailData">
          <div v-if="pendingCancelRefund" class="orders-detail__audit-bar">
            <div class="orders-detail__audit-title">这笔订单有待审核的取消申请</div>
            <div class="orders-detail__audit-desc">
              用户原因：{{ pendingCancelRefund.description || pendingCancelRefund.reason_type || '未填写' }}
              ，申请退款：¥{{ pendingCancelRefund.amount || '--' }}
            </div>
            <div class="orders-detail__audit-actions">
              <el-button type="primary" :loading="auditLoading" @click="handleApproveCancel">通过取消</el-button>
              <el-button type="danger" plain :loading="auditLoading" @click="handleRejectCancel">驳回申请</el-button>
            </div>
          </div>

          <div v-if="waitingExternalAfterSaleRefund" class="orders-detail__audit-bar orders-detail__audit-bar--waiting">
            <div class="orders-detail__audit-title">{{ getRefundAuditChannelLabel(waitingExternalAfterSaleRefund) }}</div>
            <div class="orders-detail__audit-desc">
              {{ getRefundAuditBannerDescription(waitingExternalAfterSaleRefund) }}
            </div>
            <div class="orders-detail__audit-desc orders-detail__audit-desc--muted">
              平台需等商家或站长处理完毕（或转交平台）后才能仲裁。
            </div>
          </div>

          <div v-if="pendingAfterSaleRefund" class="orders-detail__audit-bar orders-detail__audit-bar--refund">
            <div class="orders-detail__audit-title">{{ getRefundAuditBannerTitle(pendingAfterSaleRefund) }}</div>
            <div class="orders-detail__audit-desc">
              {{ getRefundAuditBannerDescription(pendingAfterSaleRefund) }}
            </div>
            <div class="orders-detail__audit-extra">
              <span>处理来源：{{ getRefundAuditChannelLabel(pendingAfterSaleRefund) }}</span>
              <span>用户申诉：{{ pendingAfterSaleRefund.responsibility_label || getResponsibilityTypeLabel(pendingAfterSaleRefund.user_claim_direction || pendingAfterSaleRefund.responsibility_type) }}</span>
            </div>
            <div class="orders-detail__audit-actions">
              <el-button type="primary" :loading="auditLoading" @click="handleApproveRefund()">通过退款</el-button>
              <el-button type="danger" plain :loading="auditLoading" @click="handleRejectRefund()">驳回退款</el-button>
            </div>
          </div>

          <div v-for="section in detailSections" :key="section.key" class="orders-detail__section">
            <div class="orders-detail__title">{{ section.title }}</div>

            <el-empty v-if="!section.items.length" description="暂无数据" :image-size="60" />

            <el-descriptions v-else-if="section.key !== 'refund' && section.key !== 'logs'" :column="1" border>
              <el-descriptions-item v-for="item in section.items" :key="item.key" :label="item.label">
                <pre v-if="typeof item.value === 'string' && item.value.startsWith('{')" class="orders-detail__json">{{ item.value }}</pre>
                <span v-else>{{ item.value }}</span>
              </el-descriptions-item>
            </el-descriptions>

            <el-timeline v-else class="orders-detail__timeline">
              <el-timeline-item
                v-for="(item, index) in section.items"
                :key="item.id || item.refund_no || item.created_at || index"
                :timestamp="formatTime(item.created_at || item.merchant_audit_at || item.success_at)"
              >
                <div class="orders-detail__timeline-title">
                  {{
                    section.key === 'refund'
                      ? `${getApplySourceLabel(item.apply_source)} - ${item.status_label || '--'}`
                      : item.action || section.title
                  }}
                </div>
                <div class="orders-detail__timeline-content">
                  {{
                    section.key === 'refund'
                      ? item.description || item.reject_reason || item.audit_note || '无附加说明'
                      : item.remark || '无备注'
                  }}
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </template>

        <el-empty v-else description="暂无详情数据" />
      </div>
    </el-drawer>

    <el-dialog
      v-model="refundApproveDialog.visible"
      title="通过退款申请"
      width="460px"
      :close-on-click-modal="false"
    >
      <p class="orders-dialog__tip">请选择本次退款的责任归属，系统将按选定口径完成结算。</p>
      <el-radio-group v-model="refundApproveDialog.responsibilityType" class="orders-dialog__radio-group">
        <el-radio value="rider">配送责（商家照常结算，配送方承担商品赔偿）</el-radio>
        <el-radio value="merchant">商家责（商家承担损失，已送达时补骑手配送费）</el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="refundApproveDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="auditLoading" @click="submitRefundApprove">确认通过</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.orders-table__row--highlight > td {
  background: #fff7e6 !important;
}

.orders-dialog__tip {
  margin: 0 0 16px;
  color: #606266;
  line-height: 1.6;
}

.orders-dialog__radio-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
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

.orders-filter__range {
  width: 360px;
}

.orders-alert {
  margin-bottom: 16px;
}

.orders-table__sub {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.orders-exception-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.orders-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.orders-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.orders-detail__audit-bar {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid #f5c27b;
  border-radius: 12px;
  background: #fff7e6;
}

.orders-detail__audit-bar--refund {
  border-color: #91caff;
  background: #f0f7ff;
}

.orders-detail__audit-bar--waiting {
  border-color: #ffd591;
  background: #fff7e6;
}

.orders-detail__audit-bar--waiting .orders-detail__audit-title {
  color: #d46b08;
}

.orders-detail__audit-desc--muted {
  color: #8c8c8c;
  font-size: 13px;
}

.orders-detail__audit-title {
  font-size: 15px;
  font-weight: 600;
  color: #d46b08;
}

.orders-detail__audit-bar--refund .orders-detail__audit-title {
  color: #0958d9;
}

.orders-detail__audit-desc {
  margin-top: 8px;
  color: #8c5300;
  line-height: 1.6;
}

.orders-detail__audit-bar--refund .orders-detail__audit-desc {
  color: #1d39c4;
}

.orders-detail__audit-extra {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #5b6b8a;
  font-size: 13px;
}

.orders-detail__audit-actions {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}

.orders-detail__section + .orders-detail__section {
  margin-top: 20px;
}

.orders-detail__title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
}

.orders-detail__json {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
