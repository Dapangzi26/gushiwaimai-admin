<!-- 总后台日志审计页：优先 GET /admin/audit-logs；404 时从订单 logs 采样兜底。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">日志审计</h1>
        <p class="page-shell__subtitle">
          查看订单操作日志。搜索与分页由 GET /admin/audit-logs 服务端处理。
        </p>
      </div>
      <el-button type="primary" :loading="loading" @click="handleRefresh">刷新</el-button>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="page-shell__alert"
      :title="dataSource === 'api' ? '专用审计接口' : '采样模式'"
      :description="dataSource === 'api'
        ? '数据来自 GET /admin/audit-logs，筛选参数由后端处理。'
        : '后端 /admin/audit-logs 尚未就绪，当前展示最近 30 笔订单的操作日志采样（前端本地筛选）。'"
    />

    <el-card class="page-shell__card">
      <el-form class="audit-toolbar" inline @submit.prevent="handleSearch">
        <el-form-item label="订单号">
          <el-input
            v-model="filters.orderNo"
            placeholder="订单号"
            clearable
            style="width: 160px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input
            v-model="filters.contactName"
            placeholder="联系人"
            clearable
            style="width: 120px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input
            v-model="filters.contactPhone"
            placeholder="手机号"
            clearable
            style="width: 140px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-input
            v-model="filters.action"
            placeholder="如：接单、取消"
            clearable
            style="width: 160px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="操作方">
          <el-select
            v-model="filters.operatorType"
            placeholder="全部"
            clearable
            style="width: 120px"
            @change="handleSearch"
          >
            <el-option label="用户" value="user" />
            <el-option label="商家" value="merchant" />
            <el-option label="骑手" value="rider" />
            <el-option label="管理员" value="admin" />
            <el-option label="系统" value="system" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 340px"
            @change="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="loadError"
        :title="loadError"
        type="error"
        show-icon
        :closable="false"
        class="page-shell__alert"
      >
        <template #default>
          <el-button type="danger" link @click="handleRefresh">重新加载</el-button>
        </template>
      </el-alert>

      <el-table :data="logList" v-loading="loading" border size="small" class="admin-table--compact" empty-text="暂无日志数据">
        <el-table-column label="订单号" width="168">
          <template #default="{ row }">
            <span class="admin-table__order-no">
              {{ formatOrderNoDisplay(row.order_no) || row.order_no || '--' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="联系人" width="88" show-overflow-tooltip>
          <template #default="{ row }">{{ row.contact_name || '--' }}</template>
        </el-table-column>
        <el-table-column label="手机号" width="118">
          <template #default="{ row }">{{ row.contact_phone || '--' }}</template>
        </el-table-column>
        <el-table-column label="操作/备注" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="admin-table__main">{{ row.action || '--' }}</div>
            <div class="admin-table__sub">{{ row.remark || '--' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态变更" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getOrderStatusLabel(row.from_status) }} → {{ getOrderStatusLabel(row.to_status) }}
          </template>
        </el-table-column>
        <el-table-column label="操作方" width="80">
          <template #default="{ row }">{{ getOperatorTypeLabel(row.operator_type) }}</template>
        </el-table-column>
        <el-table-column label="时间" width="102">
          <template #default="{ row }">{{ formatCompactTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="72" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goOrder(row.order_id)">订单</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="page-shell__pagination">
        <el-pagination
          background
          layout="total, prev, pager, next, jumper"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchAuditLogs, isAuditLogsApiUnavailable } from '../../api/audit-logs'
import { fetchAdminOrderDetail, fetchAdminOrders } from '../../api/orders'
import { getRequestErrorMessage } from '../../utils/http'
import { resolveList, resolveTotal } from '../../utils/list'
import { formatCompactTime, getOperatorTypeLabel, getOrderStatusLabel } from '../../utils/detail-display'
import { formatOrderNoDisplay, matchesLocalSearchKeyword, normalizeSearchKeyword } from '../../utils/orderNo.js'

const route = useRoute()
const router = useRouter()

const DEFAULT_PAGE_SIZE = 10
const loading = ref(false)
const loadError = ref('')
const logList = ref([])
const dataSource = ref('api')
const fallbackLogCache = ref([])
const filters = reactive({
  orderNo: '',
  contactName: '',
  contactPhone: '',
  action: '',
  operatorType: '',
  timeRange: [],
})
const pagination = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })

function normalizeAuditLog(item) {
  return {
    ...item,
    order_id: item.order_id ?? item.orderId ?? '',
    order_no: item.order_no ?? item.orderNo ?? '',
    contact_name: item.contact_name ?? item.contactName ?? '',
    contact_phone: item.contact_phone ?? item.contactPhone ?? '',
    action: item.action ?? item.operation ?? '',
    remark: item.remark ?? item.note ?? '',
    from_status: item.from_status ?? item.fromStatus ?? '',
    to_status: item.to_status ?? item.toStatus ?? '',
    operator_type: item.operator_type ?? item.operatorType ?? '',
    created_at: item.created_at ?? item.createdAt ?? '',
  }
}

function sortLogs(items) {
  return [...items].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  )
}

function buildSearchParams() {
  const params = {
    page: pagination.page,
    limit: pagination.pageSize,
  }

  const orderNo = normalizeSearchKeyword(filters.orderNo)
  if (orderNo) {
    params.order_no = orderNo
  }

  const contactName = filters.contactName.trim()
  if (contactName) {
    params.contact_name = contactName
  }

  const contactPhone = normalizeSearchKeyword(filters.contactPhone)
  if (contactPhone) {
    params.contact_phone = contactPhone
  }

  const action = filters.action.trim()
  if (action) {
    params.action = action
  }

  if (filters.operatorType) {
    params.operator_type = filters.operatorType
  }

  if (Array.isArray(filters.timeRange) && filters.timeRange.length === 2) {
    params.start_time = filters.timeRange[0]
    params.end_time = filters.timeRange[1]
  }

  return params
}

function syncRouteQuery() {
  const query = {
    page: String(pagination.page),
  }

  const orderNo = normalizeSearchKeyword(filters.orderNo)
  if (orderNo) query.order_no = orderNo

  const contactName = filters.contactName.trim()
  if (contactName) query.contact_name = contactName

  const contactPhone = normalizeSearchKeyword(filters.contactPhone)
  if (contactPhone) query.contact_phone = contactPhone

  const action = filters.action.trim()
  if (action) query.action = action

  if (filters.operatorType) query.operator_type = filters.operatorType

  if (Array.isArray(filters.timeRange) && filters.timeRange.length === 2) {
    query.start_time = filters.timeRange[0]
    query.end_time = filters.timeRange[1]
  }

  router.replace({ query })
}

function initFromRoute() {
  filters.orderNo = String(route.query.order_no || route.query.keyword || '').trim()
  filters.contactName = String(route.query.contact_name || '').trim()
  filters.contactPhone = String(route.query.contact_phone || '').trim()
  filters.action = String(route.query.action || '').trim()
  filters.operatorType = String(route.query.operator_type || '').trim()

  const startTime = String(route.query.start_time || '').trim()
  const endTime = String(route.query.end_time || '').trim()
  filters.timeRange = startTime && endTime ? [startTime, endTime] : []

  pagination.page = Math.max(parseInt(route.query.page, 10) || 1, 1)
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

async function loadLogs(forceRefreshFallback = false) {
  loading.value = true
  loadError.value = ''

  try {
    const result = await fetchAuditLogs(buildSearchParams())
    const items = resolveList(result).map(normalizeAuditLog)
    logList.value = items
    pagination.total = resolveTotal(result, items.length)
    dataSource.value = 'api'
    fallbackLogCache.value = []
    return
  } catch (error) {
    if (!isAuditLogsApiUnavailable(error)) {
      loadError.value = getRequestErrorMessage(error, '审计日志加载失败')
      logList.value = []
      pagination.total = 0
      return
    }
  } finally {
    loading.value = false
  }

  loading.value = true
  try {
    await loadLogsFromOrdersFallback(forceRefreshFallback)
  } catch (fallbackError) {
    loadError.value = getRequestErrorMessage(fallbackError, '审计日志加载失败')
    logList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  syncRouteQuery()
}

function handleReset() {
  filters.orderNo = ''
  filters.contactName = ''
  filters.contactPhone = ''
  filters.action = ''
  filters.operatorType = ''
  filters.timeRange = []
  pagination.page = 1
  syncRouteQuery()
}

function handlePageChange(page) {
  pagination.page = page
  syncRouteQuery()
}

function handleRefresh() {
  pagination.page = 1
  loadLogs(true)
}

function goOrder(orderId) {
  router.push({ path: '/orders', query: { highlight: String(orderId), page: '1', limit: '10' } })
}

watch(
  () => route.query,
  () => {
    initFromRoute()
    loadLogs()
  },
  { immediate: true },
)
</script>

<style scoped>
.audit-toolbar {
  margin-bottom: 16px;
}
</style>
