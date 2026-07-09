<!-- 这个页面是“总后台平台用户页”，基于订单买家数据聚合展示 C 端用户概览；完整用户 CRUD 待后端 /admin/users 接口。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">平台用户</h1>
        <p class="page-shell__subtitle">
          从近期订单中提取下单用户做运营参考。用户封禁、资料编辑需后端 /admin/users 专用接口。
        </p>
      </div>
      <div class="page-shell__actions">
        <el-input
          v-model="keyword"
          placeholder="搜索昵称 / 手机号"
          clearable
          style="width: 220px"
          @keyup.enter="applyFilter"
          @clear="applyFilter"
        />
        <el-button type="primary" :loading="loading" @click="applyFilter">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="page-shell__alert"
      title="数据来源说明"
      description="用户列表由最近订单的 buyer 字段去重聚合，不代表全量注册用户。完整用户管理需后端建设。"
    />

    <div class="user-stats">
      <el-card v-for="item in statCards" :key="item.key" class="user-stat-card" shadow="never">
        <div class="user-stat-card__label">{{ item.label }}</div>
        <div class="user-stat-card__value">{{ item.value }}</div>
      </el-card>
    </div>

    <el-card class="page-shell__card">
      <el-alert
        v-if="loadError"
        :title="loadError"
        type="error"
        show-icon
        :closable="false"
        class="page-shell__alert"
      >
        <template #default>
          <el-button type="danger" link @click="loadUsersFromOrders">重新加载</el-button>
        </template>
      </el-alert>

      <el-table :data="displayList" v-loading="loading" border empty-text="暂无用户数据">
        <el-table-column prop="id" label="用户ID" width="90" />
        <el-table-column prop="nickname" label="昵称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="order_count" label="近期下单数" width="110" />
        <el-table-column label="最近下单" min-width="170">
          <template #default="{ row }">{{ formatTime(row.last_order_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goUserOrders(row)">看 TA 的订单</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
// 这个文件是“总后台平台用户页”逻辑。
// 拉取最近若干页订单，从 buyer 字段去重聚合用户列表（无专用用户 API 时的替代方案）。
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAdminOrders } from '../../api/orders'
import { getRequestErrorMessage } from '../../utils/http'

const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const keyword = ref('')
const allUsers = ref([])
const displayList = ref([])

const statCards = computed(() => [
  { key: 'total', label: '聚合用户数', value: allUsers.value.length },
  { key: 'active', label: '有手机号用户', value: allUsers.value.filter((u) => u.phone).length },
  {
    key: 'orders',
    label: '样本订单数',
    value: allUsers.value.reduce((sum, u) => sum + (u.order_count || 0), 0),
  },
])

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

function applyFilter() {
  const key = keyword.value.trim().toLowerCase()
  if (!key) {
    displayList.value = allUsers.value
    return
  }

  displayList.value = allUsers.value.filter((item) => {
    const haystack = [item.nickname, item.phone, String(item.id)].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(key)
  })
}

function handleReset() {
  keyword.value = ''
  applyFilter()
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

async function loadUsersFromOrders() {
  loading.value = true
  loadError.value = ''

  try {
    const mergedOrders = []
    const maxPages = 5

    for (let page = 1; page <= maxPages; page += 1) {
      const result = await fetchAdminOrders({ page, limit: 50 })
      const batch = Array.isArray(result?.list) ? result.list : []
      mergedOrders.push(...batch)
      if (batch.length < 50) break
    }

    allUsers.value = aggregateUsersFromOrders(mergedOrders)
    applyFilter()
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '用户数据加载失败')
    allUsers.value = []
    displayList.value = []
  } finally {
    loading.value = false
  }
}

function goUserOrders(row) {
  router.push({
    path: '/orders',
    query: {
      keyword: row.phone || row.nickname || String(row.id),
      page: '1',
      page_size: '10',
    },
  })
}

onMounted(() => {
  loadUsersFromOrders()
})
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
</style>
