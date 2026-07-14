<!-- 这个页面是“总后台支付结算页”，基于已完成订单展示分账字段；提现审批等能力待后端专用接口。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">支付结算</h1>
        <p class="page-shell__subtitle">
          查看已完成订单的分账明细（平台抽成、骑手激励、商家收入）。商家提现审批、对账导出需后端 /admin/settlement 接口。
        </p>
      </div>
      <div class="page-shell__actions">
        <el-button type="primary" plain @click="goRefunds">查看售后退款</el-button>
      </div>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="page-shell__alert"
      title="数据来源说明"
      description="分账字段来自订单详情接口（commission_amount / platform_income_amount / merchant_income_amount / rider_incentive_amount）。当前页聚合展示已完成订单，不含商家提现审批。"
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
        <el-table-column prop="order_no" label="订单号" min-width="180" show-overflow-tooltip />
        <el-table-column label="业务" width="100">
          <template #default="{ row }">{{ row.business_label || '--' }}</template>
        </el-table-column>
        <el-table-column label="商家" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.merchant?.name || '--' }}</template>
        </el-table-column>
        <el-table-column label="实付金额" width="100">
          <template #default="{ row }">¥ {{ row.pay_amount ?? row.total_amount ?? '--' }}</template>
        </el-table-column>
        <el-table-column label="平台收入" width="100">
          <template #default="{ row }">¥ {{ row.platform_income_amount ?? '--' }}</template>
        </el-table-column>
        <el-table-column label="商家收入" width="100">
          <template #default="{ row }">¥ {{ row.merchant_income_amount ?? '--' }}</template>
        </el-table-column>
        <el-table-column label="骑手激励" width="100">
          <template #default="{ row }">¥ {{ row.rider_incentive_amount ?? '--' }}</template>
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

    <el-drawer v-model="detailVisible" title="订单分账详情" size="520px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-alert v-if="detailError" :title="detailError" type="error" show-icon :closable="false" />
        <el-descriptions v-else-if="detailData" :column="1" border>
          <el-descriptions-item label="订单号">{{ detailData.order_no }}</el-descriptions-item>
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
// 这个文件是“总后台支付结算页”逻辑。
// 拉取 status=6 已完成订单，列表展示摘要分账字段，详情抽屉拉订单详情补全分账明细。
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAdminOrderDetail, fetchAdminOrders } from '../../api/orders'
import { getRequestErrorMessage } from '../../utils/http'

const router = useRouter()

const DEFAULT_PAGE_SIZE = 10
const loading = ref(false)
const loadError = ref('')
const list = ref([])
const keyword = ref('')
const businessType = ref('')
const pagination = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref(null)

const summaryCards = computed(() => {
  const sum = (key) =>
    list.value.reduce((acc, row) => acc + parseMoney(row[key]), 0).toFixed(2)

  return [
    { key: 'pay', label: '本页实付合计', value: sum('pay_amount') },
    { key: 'platform', label: '本页平台收入', value: sum('platform_income_amount') },
    { key: 'merchant', label: '本页商家收入', value: sum('merchant_income_amount') },
    { key: 'rider', label: '本页骑手激励', value: sum('rider_incentive_amount') },
  ]
})

function parseMoney(value) {
  const num = parseFloat(String(value ?? '0').replace(/,/g, ''))
  return Number.isFinite(num) ? num : 0
}

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
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

    // 列表摘要不含分账字段，批量补拉详情中的分账数据（仅当前页，控制请求量）
    const enriched = await Promise.all(
      items.map(async (item) => {
        try {
          const detail = await fetchAdminOrderDetail(item.id)
          return {
            ...item,
            commission_amount: detail.commission_amount,
            platform_income_amount: detail.platform_income_amount,
            merchant_income_amount: detail.merchant_income_amount,
            rider_incentive_amount: detail.rider_incentive_amount,
            payment_channel: detail.payment_channel,
          }
        } catch {
          return item
        }
      }),
    )
    list.value = enriched

    pagination.total = result?.pagination?.total ?? result?.total ?? 0
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '结算数据加载失败')
    list.value = []
    pagination.total = 0
  } finally {
    loading.value = false
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

function goRefunds() {
  router.push({ path: '/orders', query: { tab: 'refunds' } })
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
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
</style>
