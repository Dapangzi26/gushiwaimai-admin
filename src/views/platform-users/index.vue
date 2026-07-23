<!-- 总后台平台用户页：优先 GET /admin/users；404 时从订单 buyer 聚合兜底。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">平台用户</h1>
        <p class="page-shell__subtitle">
          查看 C 端注册用户及下单概况。搜索与分页由 GET /admin/users 服务端处理。
        </p>
      </div>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="page-shell__alert"
      title="数据来源说明"
      :description="dataSource === 'api'
        ? '数据来自 GET /admin/users，搜索参数 keyword 由后端筛选。'
        : '后端 /admin/users 尚未就绪，当前从最近订单 buyer 字段聚合，不代表全量注册用户。'"
    />

    <div class="user-stats">
      <el-card v-for="item in statCards" :key="item.key" class="user-stat-card" shadow="never">
        <div class="user-stat-card__label">{{ item.label }}</div>
        <div class="user-stat-card__value">{{ item.value }}</div>
      </el-card>
    </div>

    <el-card class="page-shell__card">
      <el-form class="user-toolbar" inline @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input
            v-model="keyword"
            placeholder="昵称 / 手机号 / 用户 ID"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
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
          <el-button type="danger" link @click="loadUsers(true)">重新加载</el-button>
        </template>
      </el-alert>

      <el-table :data="displayList" v-loading="loading" border size="small" class="admin-table--compact" empty-text="暂无用户数据">
        <el-table-column label="用户" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="admin-table__stack">
              <div class="admin-table__main">{{ row.nickname || '--' }}</div>
              <div class="admin-table__sub">ID {{ row.id }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="手机号" min-width="108" show-overflow-tooltip>
          <template #default="{ row }">{{ row.phone || '--' }}</template>
        </el-table-column>
        <el-table-column label="近期下单" width="88" align="center">
          <template #default="{ row }">{{ row.order_count || 0 }}</template>
        </el-table-column>
        <el-table-column label="最近下单" width="108">
          <template #default="{ row }">{{ formatCompactTime(row.last_order_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goUserOrders(row)">看订单</el-button>
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
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchPlatformUsers, isPlatformUsersApiUnavailable } from '../../api/users'
import { fetchAdminOrders } from '../../api/orders'
import { getRequestErrorMessage } from '../../utils/http'
import { resolveList, resolveTotal } from '../../utils/list'
import { matchesLocalSearchKeyword, normalizeSearchKeyword } from '../../utils/orderNo.js'
import { formatCompactTime } from '../../utils/detail-display'

const route = useRoute()
const router = useRouter()

const DEFAULT_PAGE_SIZE = 10
const loading = ref(false)
const loadError = ref('')
const keyword = ref('')
const displayList = ref([])
const allUsers = ref([])
const dataSource = ref('api')
const pagination = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })

function normalizePlatformUser(item) {
  return {
    id: item?.id ?? '',
    nickname: item?.nickname || item?.name || `用户${item?.id ?? ''}`,
    phone: item?.phone || item?.mobile || '',
    order_count: item?.order_count ?? item?.recent_order_count ?? 0,
    last_order_at: item?.last_order_at || item?.last_order_time || null,
  }
}

const statCards = computed(() => {
  if (dataSource.value === 'api') {
    return [
      { key: 'total', label: '用户总数', value: pagination.total },
      { key: 'page', label: '本页用户', value: displayList.value.length },
      {
        key: 'phone',
        label: '本页有手机号',
        value: displayList.value.filter((u) => u.phone).length,
      },
    ]
  }

  return [
    { key: 'total', label: '聚合用户数', value: allUsers.value.length },
    { key: 'active', label: '有手机号用户', value: allUsers.value.filter((u) => u.phone).length },
    {
      key: 'orders',
      label: '样本订单数',
      value: allUsers.value.reduce((sum, u) => sum + (u.order_count || 0), 0),
    },
  ]
})

function buildSearchParams() {
  const params = {
    page: pagination.page,
    limit: pagination.pageSize,
  }

  const key = normalizeSearchKeyword(keyword.value)
  if (key) {
    params.keyword = key
  }

  return params
}

function syncRouteQuery() {
  const query = {
    page: String(pagination.page),
  }

  const key = normalizeSearchKeyword(keyword.value)
  if (key) {
    query.keyword = key
  }

  router.replace({ query })
}

function initFromRoute() {
  keyword.value = String(route.query.keyword || '').trim()
  pagination.page = Math.max(parseInt(route.query.page, 10) || 1, 1)
}

function getFilteredFallbackUsers() {
  const key = keyword.value.trim()
  if (!key) {
    return allUsers.value
  }

  return allUsers.value.filter((item) =>
    matchesLocalSearchKeyword(key, [item.nickname, item.phone, item.id]),
  )
}

function applyFallbackFilterAndPage() {
  const filtered = getFilteredFallbackUsers()
  pagination.total = filtered.length
  const start = (pagination.page - 1) * pagination.pageSize
  displayList.value = filtered.slice(start, start + pagination.pageSize)
}

function aggregateUsersFromOrders(orders) {
  const map = new Map()

  orders.forEach((order) => {
    const buyer = order?.buyer
    if (!buyer?.id) return

    const existing = map.get(buyer.id) || {
      id: buyer.id,
      nickname: buyer.nickname || `用户${buyer.id}`,
      phone: buyer.phone || '',
      order_count: 0,
      last_order_at: null,
    }

    existing.order_count += 1
    const orderTime = order.created_at
    if (orderTime && (!existing.last_order_at || new Date(orderTime) > new Date(existing.last_order_at))) {
      existing.last_order_at = orderTime
    }

    map.set(buyer.id, existing)
  })

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.last_order_at || 0) - new Date(a.last_order_at || 0),
  )
}

async function loadUsersFromOrdersFallback() {
  const mergedOrders = []
  const maxPages = 5

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchAdminOrders({ page, limit: 50 })
    const batch = Array.isArray(result?.list) ? result.list : []
    mergedOrders.push(...batch)
    if (batch.length < 50) break
  }

  allUsers.value = aggregateUsersFromOrders(mergedOrders)
}

async function loadUsers(forceRefreshFallback = false) {
  loading.value = true
  loadError.value = ''

  try {
    const result = await fetchPlatformUsers(buildSearchParams())
    displayList.value = resolveList(result).map(normalizePlatformUser)
    pagination.total = resolveTotal(result, displayList.value.length)
    dataSource.value = 'api'
    return
  } catch (error) {
    if (!isPlatformUsersApiUnavailable(error)) {
      loadError.value = getRequestErrorMessage(error, '用户数据加载失败')
      displayList.value = []
      pagination.total = 0
      return
    }
  } finally {
    loading.value = false
  }

  loading.value = true
  try {
    if (forceRefreshFallback || !allUsers.value.length) {
      await loadUsersFromOrdersFallback()
    }
    dataSource.value = 'fallback'
    applyFallbackFilterAndPage()
  } catch (fallbackError) {
    loadError.value = getRequestErrorMessage(fallbackError, '用户数据加载失败')
    allUsers.value = []
    displayList.value = []
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
  keyword.value = ''
  pagination.page = 1
  syncRouteQuery()
}

function handlePageChange(page) {
  pagination.page = page
  syncRouteQuery()
}

function goUserOrders(row) {
  router.push({
    path: '/orders',
    query: {
      keyword: normalizeSearchKeyword(row.phone || row.nickname || String(row.id)) || undefined,
      page: '1',
      limit: '10',
    },
  })
}

watch(
  () => route.query,
  () => {
    initFromRoute()
    loadUsers()
  },
  { immediate: true },
)
</script>

<style scoped>
.user-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.user-stat-card__label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}

.user-stat-card__value {
  font-size: 28px;
  font-weight: 600;
}

.user-toolbar {
  margin-bottom: 16px;
}
</style>
