<script setup>
// 这个文件是“总后台工作台首页”。
// 这里除了展示统计数字，还要负责把你快速带到对应业务页，不然看到了待办数字却点不进去，链路会断。
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, ShoppingCart, Van, Wallet, WarningFilled } from '@element-plus/icons-vue'
import { fetchDashboardOverview, fetchDashboardPendingCounts } from '../../api/dashboard'
import { fetchPendingRefundCount } from '../../api/orders'
import { fetchPendingWithdrawCount } from '../../api/withdraw'
import { getRequestErrorMessage } from '../../utils/http'
import { useAuthStore } from '../../store/modules/auth'
import './workbench.css'

const router = useRouter()
const authStore = useAuthStore()

const overview = ref({})
const pendingCounts = ref({})
const loading = ref(true)
const loadError = ref('')

const adminName = computed(() => authStore.adminName || '管理员')

const todayText = computed(() => {
  const now = new Date()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`
})

const primarySpotlight = [
  {
    key: 'online_riders',
    label: '在线骑手',
    sub: '点击查看骑手列表',
    theme: 'cyan',
    icon: Van,
    source: 'overview',
    clickable: true,
    route: { path: '/riders', query: { role: 'rider', page: '1' } },
  },
  {
    key: 'today_orders',
    label: '今日订单',
    sub: '点击查看今日全部订单',
    theme: 'blue',
    icon: ShoppingCart,
    source: 'overview',
    clickable: true,
    route: { path: '/orders', query: { page: '1', limit: '10' } },
  },
  {
    key: 'pending_refunds',
    label: '待处理售后',
    sub: '待仲裁退款',
    theme: 'rose',
    icon: WarningFilled,
    source: 'pending',
    clickable: true,
    route: { path: '/orders', query: { tab: 'refunds', refund_status: 'pending', page: '1', limit: '10' } },
  },
]

const secondaryTiles = [
  {
    key: 'active_merchants',
    label: '活跃商家',
    source: 'overview',
    clickable: true,
    route: { path: '/merchants', query: { status: 'approved', page: '1' } },
  },
  {
    key: 'pending_review_items',
    label: '待审核合计',
    source: 'overview',
    clickable: true,
    route: { path: '/reviews', query: { tab: 'merchant' } },
  },
  {
    key: 'pending_merchants',
    label: '待审商家',
    source: 'pending',
    clickable: true,
    route: { path: '/reviews', query: { tab: 'merchant' } },
  },
  {
    key: 'pending_riders',
    label: '待审骑手',
    source: 'pending',
    clickable: true,
    route: { path: '/reviews', query: { tab: 'rider' } },
  },
  {
    key: 'pending_order_reviews',
    label: '待审评价',
    source: 'pending',
    clickable: true,
    route: { path: '/reviews', query: { tab: 'order-review' } },
  },
  {
    key: 'abnormal_orders',
    label: '异常订单',
    source: 'pending',
    clickable: true,
    route: { path: '/orders', query: { status: '7', page: '1', limit: '10' } },
  },
  {
    key: 'offline_riders',
    label: '离线骑手',
    source: 'pending',
    clickable: true,
    route: { path: '/riders', query: { role: 'rider', online_status: 'offline', page: '1' } },
  },
  {
    key: 'timeout_unaccepted_orders',
    label: '待接单预警',
    source: 'pending',
    clickable: true,
    route: {
      path: '/orders',
      query: {
        exception_type: 'timeout_unaccepted',
        timeout_minutes: '5',
        page: '1',
        limit: '10',
      },
    },
  },
  {
    key: 'pending_withdrawals',
    label: '待处理提现',
    source: 'pending',
    clickable: true,
    route: { path: '/payments', query: { tab: 'withdraw' } },
  },
]

function formatValue(source, key) {
  const value = source?.[key]
  return value === undefined || value === null || value === '' ? '--' : value
}

function parseCount(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function isPendingAlert(value) {
  return parseCount(value) > 0
}

function getTileValue(tile) {
  const source = tile.source === 'overview' ? overview.value : pendingCounts.value
  return formatValue(source, tile.key)
}

function handleTileClick(item) {
  if (!item?.clickable || !item.route) {
    return
  }

  router.push(item.route)
}

async function loadDashboardData() {
  loading.value = true
  loadError.value = ''

  try {
    const [overviewResult, pendingResult, withdrawCount, refundCount] = await Promise.all([
      fetchDashboardOverview(),
      fetchDashboardPendingCounts(),
      fetchPendingWithdrawCount().catch(() => null),
      fetchPendingRefundCount().catch(() => null),
    ])

    overview.value = overviewResult || {}
    pendingCounts.value = {
      ...(pendingResult || {}),
      pending_withdrawals: withdrawCount ?? '--',
      pending_refunds: refundCount ?? '--',
    }
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '工作台数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await authStore.ensureAuthReady()
  await loadDashboardData()
  window.addEventListener('gushi-admin-pending-refresh', loadDashboardData)
})

onUnmounted(() => {
  window.removeEventListener('gushi-admin-pending-refresh', loadDashboardData)
})
</script>

<template>
  <div class="page-shell workbench-page">
    <header class="workbench-topbar">
      <div class="workbench-topbar__greet">
        <p class="workbench-topbar__date">{{ todayText }}</p>
        <h1 class="workbench-topbar__title">你好，{{ adminName }}</h1>
      </div>
      <el-button
        class="workbench-topbar__refresh"
        type="primary"
        :icon="Refresh"
        :loading="loading"
        @click="loadDashboardData"
      >
        刷新数据
      </el-button>
    </header>

    <section class="workbench-spotlight" aria-label="核心运营指标">
      <article
        v-for="item in primarySpotlight"
        :key="item.key"
        class="workbench-spotlight__cell"
        :class="[
          `workbench-spotlight__cell--${item.theme}`,
          { 'workbench-spotlight__cell--clickable': item.clickable },
        ]"
        @click="handleTileClick(item)"
      >
        <div class="workbench-spotlight__icon">
          <el-icon :size="24">
            <component :is="item.icon" />
          </el-icon>
        </div>
        <div class="workbench-spotlight__label">{{ item.label }}</div>
        <div
          class="workbench-spotlight__value"
          :class="{
            'is-loading': loading,
            'is-alert': !loading && isPendingAlert(getTileValue(item)),
          }"
        >
          {{ loading ? '' : getTileValue(item) }}
        </div>
        <div class="workbench-spotlight__sub">{{ item.sub }}</div>
      </article>
    </section>

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

    <section class="workbench-mosaic" aria-label="其他待办指标">
      <h2 class="workbench-mosaic__heading">其他待办</h2>
      <div class="workbench-mosaic__grid">
        <article
          v-for="item in secondaryTiles"
          :key="item.key"
          class="workbench-mosaic__cell"
          :class="{ 'workbench-mosaic__cell--clickable': item.clickable }"
          @click="handleTileClick(item)"
        >
          <div class="workbench-mosaic__label">{{ item.label }}</div>
          <div
            class="workbench-mosaic__value"
            :class="{
              'is-loading': loading,
              'is-alert': !loading && isPendingAlert(getTileValue(item)),
            }"
          >
            {{ loading ? '' : getTileValue(item) }}
          </div>
        </article>
      </div>
    </section>

    <footer class="workbench-footnote">
      <el-icon><Wallet /></el-icon>
      <span>点击任意格子可跳转到对应业务页面</span>
    </footer>
  </div>
</template>


