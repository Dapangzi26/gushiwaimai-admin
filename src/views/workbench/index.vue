<script setup>
// 这个文件是“总后台工作台首页”。
// 这里除了展示统计数字，还要负责把你快速带到对应业务页，不然看到了待办数字却点不进去，链路会断。
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, Refresh, Shop, ShoppingCart, Van, Wallet } from '@element-plus/icons-vue'
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

const overviewCards = [
  {
    key: 'today_orders',
    label: '今日订单',
    hint: '查看今日全部订单',
    theme: 'blue',
    icon: ShoppingCart,
    clickable: true,
    route: { path: '/orders', query: { page: '1', limit: '10' } },
  },
  {
    key: 'active_merchants',
    label: '活跃商家',
    hint: '已上线商家列表',
    theme: 'green',
    icon: Shop,
    clickable: true,
    route: { path: '/merchants', query: { status: 'approved', page: '1' } },
  },
  {
    key: 'online_riders',
    label: '在线骑手',
    hint: '平台骑手实时状态',
    theme: 'cyan',
    icon: Van,
    clickable: true,
    route: { path: '/riders', query: { role: 'rider', page: '1' } },
  },
  {
    key: 'pending_review_items',
    label: '待处理事项',
    hint: '审核中心待办汇总',
    theme: 'orange',
    icon: Bell,
    clickable: true,
    route: { path: '/reviews', query: { tab: 'merchant' } },
  },
]

const pendingGroups = [
  {
    key: 'audit',
    title: '审核待办',
    theme: 'purple',
    items: [
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
    ],
  },
  {
    key: 'order',
    title: '订单异常',
    theme: 'orange',
    items: [
      {
        key: 'abnormal_orders',
        label: '异常订单',
        clickable: true,
        route: { path: '/orders', query: { status: '7', page: '1', limit: '10' } },
      },
      {
        key: 'offline_riders',
        label: '离线骑手',
        clickable: true,
        route: { path: '/riders', query: { role: 'rider', online_status: 'offline', page: '1' } },
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
            limit: '10',
          },
        },
      },
      {
        key: 'pending_refunds',
        label: '待仲裁退款',
        clickable: true,
        route: { path: '/orders', query: { tab: 'refunds', refund_status: 'pending', page: '1', limit: '10' } },
      },
    ],
  },
  {
    key: 'finance',
    title: '财务待办',
    theme: 'green',
    items: [
      {
        key: 'pending_withdrawals',
        label: '待处理提现',
        clickable: true,
        route: { path: '/payments', query: { tab: 'withdraw' } },
      },
    ],
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

function groupTotal(group) {
  const total = group.items.reduce((sum, item) => sum + parseCount(pendingCounts.value?.[item.key]), 0)
  return total > 0 ? total : '--'
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
    <section class="workbench-hero">
      <div class="workbench-hero__main">
        <p class="workbench-hero__eyebrow">{{ todayText }}</p>
        <h1 class="workbench-hero__title">你好，{{ adminName }}</h1>
        <p class="workbench-hero__desc">固始县外卖管理总后台 · 今日运营概览与待办提醒</p>
      </div>
      <el-button type="primary" :icon="Refresh" :loading="loading" @click="loadDashboardData">
        刷新数据
      </el-button>
    </section>

    <div class="workbench-grid">
      <article
        v-for="item in overviewCards"
        :key="item.key"
        class="workbench-kpi"
        :class="[
          `workbench-kpi--${item.theme}`,
          { 'workbench-kpi--clickable': item.clickable },
        ]"
        @click="handleCardClick(item)"
      >
        <div class="workbench-kpi__icon">
          <el-icon :size="22">
            <component :is="item.icon" />
          </el-icon>
        </div>
        <div class="workbench-kpi__body">
          <div class="workbench-kpi__label">{{ item.label }}</div>
          <div class="workbench-kpi__value" :class="{ 'is-loading': loading }">
            {{ loading ? '' : formatValue(overview, item.key) }}
          </div>
          <div class="workbench-kpi__hint">{{ item.hint }}</div>
        </div>
      </article>
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

    <section class="workbench-groups">
      <article
        v-for="group in pendingGroups"
        :key="group.key"
        class="workbench-group"
      >
        <header class="workbench-group__header">
          <div class="workbench-group__title-wrap">
            <span class="workbench-group__dot" :class="`workbench-group__dot--${group.theme}`" />
            <h2 class="workbench-group__title">{{ group.title }}</h2>
          </div>
          <span class="workbench-group__total">合计 {{ groupTotal(group) }}</span>
        </header>

        <div class="workbench-group__list">
          <div
            v-for="item in group.items"
            :key="item.key"
            class="workbench-group__item"
            :class="{ 'workbench-group__item--clickable': item.clickable }"
            @click="handleCardClick(item)"
          >
            <span class="workbench-group__label">{{ item.label }}</span>
            <span
              class="workbench-group__count"
              :class="{
                'workbench-group__count--alert': !loading && isPendingAlert(pendingCounts[item.key]),
                'is-loading': loading,
              }"
            >
              {{ loading ? '' : formatValue(pendingCounts, item.key) }}
            </span>
          </div>
        </div>
      </article>
    </section>

    <footer class="workbench-footnote">
      <el-icon><Wallet /></el-icon>
      <span>点击指标卡片或待办项可快速跳转到对应业务页面</span>
    </footer>
  </div>
</template>
