<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchDashboardOverview, fetchDashboardPendingCounts } from '../../api/dashboard'

const overview = ref({})
const pendingCounts = ref({})
const loading = ref(false)
const loadError = ref('')

const overviewCards = computed(() => [
  { key: 'today_orders', label: '今日订单' },
  { key: 'active_merchants', label: '活跃商家' },
  { key: 'online_riders', label: '在线骑手' },
  { key: 'pending_review_items', label: '待处理事项' },
])

const pendingCards = computed(() => [
  { key: 'pending_merchants', label: '待审核商家' },
  { key: 'pending_riders', label: '待审核骑手' },
  { key: 'abnormal_orders', label: '异常订单' },
  { key: 'offline_riders', label: '离线骑手' },
])

function formatValue(source, key) {
  const value = source?.[key]
  return value === undefined || value === null || value === '' ? '--' : value
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
})
</script>

<template>
  <div class="page-shell" v-loading="loading">
    <h1 class="page-shell__title">工作台</h1>

    <div class="workbench-grid">
      <el-card v-for="item in overviewCards" :key="item.key" class="page-shell__card workbench-card">
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
        <div v-for="item in pendingCards" :key="item.key" class="workbench-pending__item">
          <span class="workbench-pending__label">{{ item.label }}</span>
          <span class="workbench-pending__value">{{ formatValue(pendingCounts, item.key) }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>
