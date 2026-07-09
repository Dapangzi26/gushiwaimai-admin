<script setup>
// 这个文件是“总后台工作台首页”。
// 这里除了展示统计数字，还要负责把你快速带到对应业务页，不然看到了待办数字却点不进去，链路会断。
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchDashboardOverview, fetchDashboardPendingCounts } from '../../api/dashboard'

const router = useRouter()
const overview = ref({})
const pendingCounts = ref({})
const loading = ref(false)
const loadError = ref('')

const overviewCards = computed(() => [
  {
    key: 'today_orders',
    label: '今日订单',
    clickable: true,
    route: { path: '/orders', query: { page: '1', page_size: '10' } },
  },
  { key: 'active_merchants', label: '活跃商家', clickable: true, route: { path: '/merchants', query: { status: 'approved', page: '1' } } },
  {
    key: 'online_riders',
    label: '在线骑手',
    clickable: true,
    route: { path: '/riders', query: { role: 'rider', page: '1' } },
  },
  {
    key: 'pending_review_items',
    label: '待处理事项',
    clickable: true,
    route: { path: '/reviews', query: { tab: 'merchant' } },
  },
])

const pendingCards = computed(() => [
  {
    key: 'pending_merchants',
    label: '待审核商家',
    clickable: true,
    route: { path: '/reviews', query: { tab: 'merchant' } },
  },
  {
    key: 'pending_riders',
    label: '待审核骑手',
    clickable: true,
    route: { path: '/reviews', query: { tab: 'rider' } },
  },
  {
    key: 'abnormal_orders',
    label: '异常订单',
    clickable: true,
    route: { path: '/orders', query: { status: '7', page: '1', page_size: '10' } },
  },
  {
    key: 'offline_riders',
    label: '离线骑手',
    clickable: true,
    route: { path: '/riders', query: { role: 'rider', page: '1' } },
  },
  {
    key: 'timeout_unaccepted_orders',
    label: '待接单预警',
    clickable: true,
    route: {
      path: '/orders',
      query: {
        exception_type: 'timeout_unaccepted',
        timeout_minutes: '5',
        page: '1',
        page_size: '10',
      },
    },
  },
])

function formatValue(source, key) {
  const value = source?.[key]
  return value === undefined || value === null || value === '' ? '--' : value
}

function handleCardClick(item) {
  if (!item?.clickable || !item.route) {
    return
  }

  router.push(item.route)
}

async function loadDashboardData() {
  loading.value = true
  loadError.value = ''

  try {
    const [overviewResult, pendingResult] = await Promise.all([
      fetchDashboardOverview(),
      fetchDashboardPendingCounts(),
    ])

    overview.value = overviewResult || {}
    pendingCounts.value = pendingResult || {}
  } catch (error) {
    loadError.value = error?.response?.data?.message || error?.message || '工作台数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboardData()
  window.addEventListener('gushi-admin-pending-refresh', loadDashboardData)
})

onUnmounted(() => {
  window.removeEventListener('gushi-admin-pending-refresh', loadDashboardData)
})
</script>

<template>
  <div class="page-shell" v-loading="loading">
    <h1 class="page-shell__title">工作台</h1>

    <div class="workbench-grid">
      <el-card
        v-for="item in overviewCards"
        :key="item.key"
        class="page-shell__card workbench-card"
        :class="{ 'workbench-card--clickable': item.clickable }"
        @click="handleCardClick(item)"
      >
        <div class="workbench-card__label">{{ item.label }}</div>
        <div class="workbench-card__value">{{ formatValue(overview, item.key) }}</div>
      </el-card>
    </div>

    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      show-icon
      :closable="false"
      class="workbench-error"
    >
      <template #default>
        <el-button type="danger" link @click="loadDashboardData">重新加载</el-button>
      </template>
    </el-alert>

    <el-card class="page-shell__card workbench-section">
      <template #header>待处理统计</template>
      <div class="workbench-pending">
        <div
          v-for="item in pendingCards"
          :key="item.key"
          class="workbench-pending__item"
          :class="{ 'workbench-pending__item--clickable': item.clickable }"
          @click="handleCardClick(item)"
        >
          <span class="workbench-pending__label">{{ item.label }}</span>
          <span class="workbench-pending__value">{{ formatValue(pendingCounts, item.key) }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.workbench-card--clickable,
.workbench-pending__item--clickable {
  cursor: pointer;
}
</style>
