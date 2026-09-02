<!-- 总后台支付结算页：已完成订单分账 + 商家/骑手提现审批 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">支付结算</h1>
        <p class="page-shell__subtitle">
          查看已完成订单分账明细，审核商家与骑手/站长提现申请。
        </p>
      </div>
      <div class="page-shell__actions">
        <el-button type="primary" plain @click="goRefunds">查看售后退款</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="payment-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="分账明细" name="settlement" />
      <el-tab-pane label="提现审批" name="withdraw" />
    </el-tabs>

    <SettlementTab
      v-if="activeTab === 'settlement'"
      ref="settlementTabRef"
      :pending-withdraw-count="pendingWithdrawCount"
    />

    <WithdrawTab
      v-if="activeTab === 'withdraw'"
      ref="withdrawTabRef"
      @pending-count-change="loadPendingWithdrawCount"
    />
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchPendingWithdrawCount } from '../../api/withdraw'
import SettlementTab from './SettlementTab.vue'
import WithdrawTab from './WithdrawTab.vue'

const router = useRouter()
const route = useRoute()

const activeTab = ref('settlement')
const settlementTabRef = ref(null)
const withdrawTabRef = ref(null)
const pendingWithdrawCount = ref(null)

function handleTabChange(tab) {
  if (tab === 'withdraw') {
    nextTick(() => {
      withdrawTabRef.value?.loadWithdrawList()
    })
  } else {
    nextTick(() => {
      settlementTabRef.value?.loadList()
    })
  }
}

function syncRouteTab() {
  const tab = route.query.tab === 'withdraw' ? 'withdraw' : 'settlement'
  if (activeTab.value !== tab) {
    activeTab.value = tab
  }
}

async function loadPendingWithdrawCount() {
  try {
    pendingWithdrawCount.value = await fetchPendingWithdrawCount()
  } catch {
    pendingWithdrawCount.value = null
  }
}

function goRefunds() {
  router.push({ path: '/orders', query: { tab: 'refunds' } })
}

onMounted(() => {
  syncRouteTab()
  if (activeTab.value === 'withdraw') {
    nextTick(() => {
      withdrawTabRef.value?.loadWithdrawList()
    })
  } else {
    settlementTabRef.value?.loadList()
  }
  loadPendingWithdrawCount()
})

watch(
  () => route.query.tab,
  () => {
    syncRouteTab()
    if (activeTab.value === 'withdraw') {
      nextTick(() => {
        withdrawTabRef.value?.loadWithdrawList()
      })
    }
  },
)

watch(activeTab, (tab) => {
  const nextTab = tab === 'withdraw' ? 'withdraw' : undefined
  const currentTab = route.query.tab === 'withdraw' ? 'withdraw' : undefined
  if (nextTab === currentTab) return
  router.replace({
    query: {
      ...route.query,
      tab: nextTab,
    },
  })
})
</script>

<style scoped>
.payment-tabs {
  margin-bottom: 16px;
}

.withdraw-processed {
  color: #909399;
  font-size: 12px;
}

.payment-bank-card {
  color: #606266;
  font-size: 12px;
  font-family: Consolas, monospace;
}
</style>
