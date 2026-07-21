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

    <template v-if="activeTab === 'settlement'">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        class="page-shell__alert"
        title="数据来源说明"
        description="分账金额在列表中点击「分账详情」查看；数据来自订单详情接口。"
      />

      <div class="payment-stats">
        <el-card v-for="item in summaryCards" :key="item.key" class="payment-stat-card" shadow="never">
          <div class="payment-stat-card__label">{{ item.label }}</div>
          <div class="payment-stat-card__value">¥ {{ item.value }}</div>
        </el-card>
      </div>

      <el-card class="page-shell__card">
        <div class="payment-toolbar">
          <el-select v-model="businessType" placeholder="业务类型" clearable style="width: 160px" @change="handleFilterChange">
            <el-option label="全部" value="" />
            <el-option label="县城外卖" value="county_takeout" />
            <el-option label="乡镇外卖" value="town_takeout" />
          </el-select>
          <el-input
            v-model="keyword"
            placeholder="订单号 / 商家 / 用户"
            clearable
            style="width: 220px"
            @keyup.enter="handleFilterChange"
            @clear="handleFilterChange"
          />
          <el-button type="primary" :loading="loading" @click="handleFilterChange">查询</el-button>
        </div>

        <el-alert
          v-if="loadError"
          :title="loadError"
          type="error"
          show-icon
          :closable="false"
          class="page-shell__alert"
        >
          <template #default>
            <el-button type="danger" link @click="loadList">重新加载</el-button>
          </template>
        </el-alert>

        <el-table :data="list" v-loading="loading" border empty-text="暂无已完成订单">
          <el-table-column label="订单号" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatOrderNoDisplay(row.order_no) || row.order_no || '--' }}
            </template>
          </el-table-column>
          <el-table-column label="业务" width="100">
            <template #default="{ row }">{{ row.business_label || '--' }}</template>
          </el-table-column>
          <el-table-column label="商家" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.merchant?.name || '--' }}</template>
          </el-table-column>
          <el-table-column label="实付金额" width="100">
            <template #default="{ row }">¥ {{ row.pay_amount ?? row.total_amount ?? '--' }}</template>
          </el-table-column>
          <el-table-column label="完成时间" min-width="170">
            <template #default="{ row }">{{ formatTime(row.delivered_at || row.settled_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleViewDetail(row)">分账详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="page-shell__pagination">
          <el-pagination
            background
            layout="total, prev, pager, next"
            :current-page="pagination.page"
            :page-size="pagination.pageSize"
            :total="pagination.total"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </template>

    <template v-else>
      <el-card class="page-shell__card">
        <div class="payment-toolbar">
          <el-radio-group v-model="withdrawRole" @change="handleWithdrawFilterChange">
            <el-radio-button label="merchant">商家提现</el-radio-button>
            <el-radio-button label="rider">骑手/站长提现</el-radio-button>
          </el-radio-group>
          <el-select v-model="withdrawStatus" placeholder="状态" clearable style="width: 140px" @change="handleWithdrawFilterChange">
            <el-option label="待处理" value="pending" />
            <el-option label="已打款" value="paid" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
          <el-button type="primary" :loading="withdrawLoading" @click="loadWithdrawList">刷新</el-button>
        </div>

        <el-alert
          v-if="withdrawError"
          :title="withdrawError"
          type="error"
          show-icon
          :closable="false"
          class="page-shell__alert"
        />

        <el-table :data="withdrawList" v-loading="withdrawLoading" border empty-text="暂无提现申请">
          <el-table-column prop="withdraw_no" label="提现单号" min-width="180" show-overflow-tooltip />
          <el-table-column :label="withdrawRole === 'merchant' ? '商家' : '账号'" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">
              {{ withdrawRole === 'merchant' ? (row.merchant_name || '--') : (row.account_name || '--') }}
            </template>
          </el-table-column>
          <el-table-column v-if="withdrawRole === 'rider'" label="类型" width="90">
            <template #default="{ row }">{{ row.rider_kind === 'stationmaster' ? '站长' : '骑手' }}</template>
          </el-table-column>
          <el-table-column label="金额" width="100">
            <template #default="{ row }">¥ {{ row.amount }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="withdrawStatusTag(row.status)">{{ withdrawStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="银行卡" min-width="200">
            <template #default="{ row }">
              <div>{{ row.bank_name || '--' }}</div>
              <div class="payment-bank-card">
                {{ row.bank_card_plain || row.bank_card_masked || '--' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="申请时间" min-width="170">
            <template #default="{ row }">{{ formatTime(row.applied_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 'pending'">
                <el-button type="primary" link :loading="actionLoadingId === row.id" @click="handleApproveWithdraw(row)">
                  确认打款
                </el-button>
                <el-button type="danger" link :loading="actionLoadingId === row.id" @click="handleRejectWithdraw(row)">
                  驳回
                </el-button>
              </template>
              <span v-else class="withdraw-processed">
                {{ row.reject_reason || row.channel_transfer_no || '已处理' }}
              </span>
            </template>
          </el-table-column>
        </el-table>

        <div class="page-shell__pagination">
          <el-pagination
            background
            layout="total, prev, pager, next"
            :current-page="withdrawPagination.page"
            :page-size="withdrawPagination.pageSize"
            :total="withdrawPagination.total"
            @current-change="handleWithdrawPageChange"
          />
        </div>
      </el-card>
    </template>

    <el-drawer v-model="detailVisible" title="订单分账详情" size="520px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-alert v-if="detailError" :title="detailError" type="error" show-icon :closable="false" />
        <el-descriptions v-else-if="detailData" :column="1" border>
          <el-descriptions-item label="订单号">{{ formatOrderNoDisplay(detailData.order_no) || detailData.order_no }}</el-descriptions-item>
          <el-descriptions-item label="业务类型">{{ detailData.business_label }}</el-descriptions-item>
          <el-descriptions-item label="支付渠道">{{ detailData.payment_channel || '--' }}</el-descriptions-item>
          <el-descriptions-item label="订单总额">¥ {{ detailData.total_amount ?? '--' }}</el-descriptions-item>
          <el-descriptions-item label="实付金额">¥ {{ detailData.pay_amount ?? '--' }}</el-descriptions-item>
          <el-descriptions-item label="配送费">¥ {{ detailData.rider_fee ?? '--' }}</el-descriptions-item>
          <el-descriptions-item label="平台抽成">¥ {{ detailData.commission_amount ?? '--' }}</el-descriptions-item>
          <el-descriptions-item label="平台收入">¥ {{ detailData.platform_income_amount ?? '--' }}</el-descriptions-item>
          <el-descriptions-item label="商家收入">¥ {{ detailData.merchant_income_amount ?? '--' }}</el-descriptions-item>
          <el-descriptions-item label="骑手激励">¥ {{ detailData.rider_incentive_amount ?? '--' }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ formatTime(detailData.paid_at) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ formatTime(detailData.delivered_at) }}</el-descriptions-item>
          <el-descriptions-item label="结算时间">{{ formatTime(detailData.settled_at) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdminOrderDetail, fetchAdminOrders } from '../../api/orders'
import {
  approveMerchantWithdrawal,
  approveRiderWithdrawal,
  fetchMerchantWithdrawals,
  fetchPendingWithdrawCount,
  fetchRiderWithdrawals,
  rejectMerchantWithdrawal,
  rejectRiderWithdrawal,
} from '../../api/withdraw'
import { getRequestErrorMessage } from '../../utils/http'
import { formatOrderNoDisplay } from '../../utils/orderNo.js'

const router = useRouter()
const route = useRoute()

const DEFAULT_PAGE_SIZE = 10
const activeTab = ref('settlement')
const loading = ref(false)
const loadError = ref('')
const list = ref([])
const keyword = ref('')
const businessType = ref('')
const pagination = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })

const withdrawRole = ref('merchant')
const withdrawStatus = ref('pending')
const withdrawLoading = ref(false)
const withdrawError = ref('')
const withdrawList = ref([])
const withdrawPagination = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })
const actionLoadingId = ref(null)

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref(null)

const summaryCards = computed(() => {
  const sumPay = list.value.reduce((acc, row) => acc + parseMoney(row.pay_amount ?? row.total_amount), 0).toFixed(2)

  return [
    { key: 'pay', label: '本页实付合计', value: sumPay },
    { key: 'count', label: '本页订单数', value: String(list.value.length) },
    { key: 'withdraw', label: '待处理提现', value: String(pendingWithdrawCount.value ?? '--') },
    { key: 'tab', label: '当前视图', value: activeTab.value === 'withdraw' ? '提现审批' : '分账明细' },
  ]
})

const pendingWithdrawCount = ref(null)

function parseMoney(value) {
  const num = parseFloat(String(value ?? '0').replace(/,/g, ''))
  return Number.isFinite(num) ? num : 0
}

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

function withdrawStatusLabel(status) {
  const map = { pending: '待处理', paid: '已打款', rejected: '已驳回' }
  return map[status] || status || '--'
}

function withdrawStatusTag(status) {
  const map = { pending: 'warning', paid: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

async function loadList() {
  loading.value = true
  loadError.value = ''

  try {
    const result = await fetchAdminOrders({
      status: '6',
      business_type: businessType.value || undefined,
      keyword: keyword.value.trim() || undefined,
      page: pagination.page,
      limit: pagination.pageSize,
    })

    const items = Array.isArray(result?.list) ? result.list : []
    list.value = items
    pagination.total = result?.pagination?.total ?? result?.total ?? 0
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '结算数据加载失败')
    list.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

async function loadWithdrawList() {
  withdrawLoading.value = true
  withdrawError.value = ''

  try {
    const params = {
      page: withdrawPagination.page,
      limit: withdrawPagination.pageSize,
      status: withdrawStatus.value || undefined,
    }
    const result = withdrawRole.value === 'merchant'
      ? await fetchMerchantWithdrawals(params)
      : await fetchRiderWithdrawals(params)

    withdrawList.value = Array.isArray(result?.list) ? result.list : []
    withdrawPagination.total = result?.total ?? 0
  } catch (error) {
    withdrawError.value = getRequestErrorMessage(error, '提现列表加载失败')
    withdrawList.value = []
    withdrawPagination.total = 0
  } finally {
    withdrawLoading.value = false
  }
}

function handleFilterChange() {
  pagination.page = 1
  loadList()
}

function handlePageChange(page) {
  pagination.page = page
  loadList()
}

function handleWithdrawFilterChange() {
  withdrawPagination.page = 1
  loadWithdrawList()
}

function handleWithdrawPageChange(page) {
  withdrawPagination.page = page
  loadWithdrawList()
}

function handleTabChange(tab) {
  if (tab === 'withdraw') {
    loadWithdrawList()
  } else {
    loadList()
  }
}

async function handleViewDetail(row) {
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detailData.value = null

  try {
    detailData.value = await fetchAdminOrderDetail(row.id)
  } catch (error) {
    detailError.value = getRequestErrorMessage(error, '分账详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

async function handleApproveWithdraw(row) {
  try {
    const { value } = await ElMessageBox.prompt('可填写打款渠道流水号（选填）', '确认打款', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPlaceholder: '渠道流水号',
      inputValue: '',
    })

    actionLoadingId.value = row.id
    if (withdrawRole.value === 'merchant') {
      await approveMerchantWithdrawal(row.id, { channel_transfer_no: value || undefined })
    } else {
      await approveRiderWithdrawal(row.id, { channel_transfer_no: value || undefined })
    }
    ElMessage.success('已确认打款')
    await loadWithdrawList()
    await loadPendingWithdrawCount()
  } catch (error) {
    if (error !== 'cancel' && error?.message !== 'cancel') {
      ElMessage.error(getRequestErrorMessage(error, '操作失败'))
    }
  } finally {
    actionLoadingId.value = null
  }
}

async function handleRejectWithdraw(row) {
  try {
    const { value } = await ElMessageBox.prompt('请填写驳回原因', '驳回提现', {
      confirmButtonText: '驳回',
      cancelButtonText: '取消',
      inputPlaceholder: '驳回原因',
      inputValue: '信息有误，请核对后重新申请',
      inputValidator: (val) => !!(val && String(val).trim()) || '请填写驳回原因',
    })

    actionLoadingId.value = row.id
    if (withdrawRole.value === 'merchant') {
      await rejectMerchantWithdrawal(row.id, { reject_reason: value })
    } else {
      await rejectRiderWithdrawal(row.id, { reject_reason: value })
    }
    ElMessage.success('已驳回并返还余额')
    await loadWithdrawList()
    await loadPendingWithdrawCount()
  } catch (error) {
    if (error !== 'cancel' && error?.message !== 'cancel') {
      ElMessage.error(getRequestErrorMessage(error, '操作失败'))
    }
  } finally {
    actionLoadingId.value = null
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
    loadWithdrawList()
  } else {
    loadList()
  }
  loadPendingWithdrawCount()
})

watch(
  () => route.query.tab,
  () => {
    syncRouteTab()
    if (activeTab.value === 'withdraw') {
      loadWithdrawList()
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

.payment-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.payment-stat-card__label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}

.payment-stat-card__value {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.payment-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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
