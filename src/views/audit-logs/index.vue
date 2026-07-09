<!-- 这个页面是“总后台日志审计页”，基于订单详情的 logs 字段展示近期操作记录；专用审计 API 待后端建设。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">日志审计</h1>
        <p class="page-shell__subtitle">
          从近期订单的操作日志聚合展示。登录审计、配置变更等需后端 /admin/audit-logs 专用接口。
        </p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadLogs">刷新</el-button>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="page-shell__alert"
      title="数据来源说明"
      description="当前展示的是订单状态变更日志（orders.logs），采样最近 30 笔订单。非全量系统审计日志。"
    />

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
          <el-button type="danger" link @click="loadLogs">重新加载</el-button>
        </template>
      </el-alert>

      <el-table :data="logList" v-loading="loading" border empty-text="暂无日志数据">
        <el-table-column prop="order_no" label="订单号" min-width="170" show-overflow-tooltip />
        <el-table-column prop="action" label="操作" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态变更" min-width="140">
          <template #default="{ row }">
            {{ row.from_status ?? '--' }} → {{ row.to_status ?? '--' }}
          </template>
        </el-table-column>
        <el-table-column prop="operator_type" label="操作方" width="110" />
        <el-table-column prop="operator_id" label="操作人ID" width="100" />
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goOrder(row.order_id)">看订单</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
// 这个文件是“总后台日志审计页”逻辑。
// 采样最近订单并拉详情中的 logs 字段，扁平化展示（无专用审计 API 时的替代方案）。
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAdminOrderDetail, fetchAdminOrders } from '../../api/orders'
import { getRequestErrorMessage } from '../../utils/http'

const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const logList = ref([])

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

async function loadLogs() {
  loading.value = true
  loadError.value = ''
  logList.value = []

  try {
    const result = await fetchAdminOrders({ page: 1, limit: 30 })
    const orders = Array.isArray(result?.list) ? result.list : []

    const allLogs = []

    await Promise.all(
      orders.map(async (order) => {
        try {
          const detail = await fetchAdminOrderDetail(order.id)
          const logs = Array.isArray(detail?.logs) ? detail.logs : []
          logs.forEach((log) => {
            allLogs.push({
              ...log,
              order_id: order.id,
              order_no: detail.order_no || order.order_no,
            })
          })
        } catch {
          // 单笔订单详情失败不影响整体
        }
      }),
    )

    logList.value = allLogs.sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    )
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '审计日志加载失败')
  } finally {
    loading.value = false
  }
}

function goOrder(orderId) {
  router.push({ path: '/orders', query: { highlight: String(orderId), page: '1' } })
}

onMounted(() => {
  loadLogs()
})
</script>
