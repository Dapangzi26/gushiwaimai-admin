<!-- 总后台：语音提醒 Outbox 只读监控 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">语音提醒监控</h1>
        <p class="page-shell__subtitle">查看 notify-delivery Outbox 投递与 ACK 情况（只读）。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      show-icon
      :closable="false"
      class="page-shell__alert"
    />

    <div class="notify-stats">
      <el-card v-for="item in statCards" :key="item.key" class="notify-stat-card" shadow="never">
        <div class="notify-stat-card__label">{{ item.label }}</div>
        <div class="notify-stat-card__value">{{ item.value }}</div>
      </el-card>
    </div>

    <el-card class="page-shell__card">
      <template #header>未 ACK 记录（最近 {{ unackedLimit }} 条）</template>
      <el-table :data="unackedList" v-loading="loading" border size="small" empty-text="暂无未 ACK 记录">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="target_role" label="角色" width="90" />
        <el-table-column prop="target_user_id" label="用户ID" width="90" />
        <el-table-column prop="order_id" label="订单ID" width="90" />
        <el-table-column prop="event_name" label="事件" min-width="160" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100" />
        <el-table-column label="尝试" width="80">
          <template #default="{ row }">{{ row.attempts }}/{{ row.max_attempts }}</template>
        </el-table-column>
        <el-table-column prop="last_error" label="最近错误" min-width="160" show-overflow-tooltip />
        <el-table-column label="创建时间" width="108">
          <template #default="{ row }">{{ formatCompactTime(row.created_at) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchNotifyDeliveryStats, fetchRecentUnackedNotifyDeliveries } from '../../api/notify-delivery'
import { getRequestErrorMessage } from '../../utils/http'
import { formatCompactTime } from '../../utils/detail-display'

const loading = ref(false)
const loadError = ref('')
const stats = ref({})
const unackedList = ref([])
const unackedLimit = 50

const statCards = computed(() => {
  const data = stats.value || {}
  const connections = data.connections || {}

  return [
    { key: 'total', label: `${data.window_hours || 24}h 投递总数`, value: data.total ?? '--' },
    { key: 'acked', label: '已 ACK', value: data.acked ?? '--' },
    { key: 'pending', label: '待重试', value: data.pending_retry ?? '--' },
    { key: 'rate', label: 'ACK 率', value: data.ack_rate != null ? `${(Number(data.ack_rate) * 100).toFixed(1)}%` : '--' },
    { key: 'merchant', label: '商家投递', value: data.by_role?.merchant ?? '--' },
    { key: 'socket', label: 'Socket 连接', value: connections.total ?? '--' },
  ]
})

async function loadAll() {
  loading.value = true
  loadError.value = ''

  try {
    const [statsResult, unackedResult] = await Promise.all([
      fetchNotifyDeliveryStats({ hours: 24 }),
      fetchRecentUnackedNotifyDeliveries({ limit: unackedLimit }),
    ])
    stats.value = statsResult || {}
    unackedList.value = Array.isArray(unackedResult?.list) ? unackedResult.list : []
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '监控数据加载失败')
    stats.value = {}
    unackedList.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
.notify-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.notify-stat-card__label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}

.notify-stat-card__value {
  font-size: 24px;
  font-weight: 600;
}
</style>
