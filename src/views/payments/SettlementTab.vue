<!-- 支付结算「分账明细」这一侧：统计卡、筛选条、表、导出 csv、分页、分账详情抽屉。 -->
<!-- 父页 /payments 还在。goRefunds / syncRouteTab / handleTabChange 仍在父页。合计混读不修。 -->
<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exportAdminOrdersCsv, fetchAdminOrderDetail, fetchAdminOrders } from '../../api/orders'
import { getRequestErrorMessage } from '../../utils/http'
import { formatOrderNoDisplay, normalizeSearchKeyword } from '../../utils/orderNo.js'
import { formatCompactTime } from '../../utils/detail-display'

const props = defineProps({
  pendingWithdrawCount: { default: null },
})

const DEFAULT_PAGE_SIZE = 10
const loading = ref(false)
const exporting = ref(false)
const loadError = ref('')
const list = ref([])
const filters = reactive({
  orderNo: '',
  merchantName: '',
})
const businessType = ref('')
// 入账日（settled_at）范围筛选（D-P01 / D-P23）：走后端新参数 settled_start/settled_end，
// 与订单中心按下单日 created_at 的筛选互不影响。
const settledRange = ref([])
const pagination = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref(null)

const listSums = ref(null)

const summaryCards = computed(() => {
  const hasMissingPay = list.value.some(
    (row) => row.pay_amount === null || row.pay_amount === undefined || row.pay_amount === ''
  )
  const sumPay = hasMissingPay
    ? '--'
    : list.value.reduce((acc, row) => acc + parseMoney(row.pay_amount), 0).toFixed(2)
  const pendingCount = props.pendingWithdrawCount
  const sums = listSums.value || {}

  return [
    { key: 'sum_merchant', label: '筛选合计·商家应得', value: formatMoney(sums.sum_merchant_income), format: 'money' },
    { key: 'sum_platform', label: '筛选合计·平台利润', value: formatMoney(sums.sum_platform_income), format: 'money' },
    { key: 'sum_rider', label: '筛选合计·骑手所得', value: formatMoney(sums.sum_rider_fee), format: 'money' },
    { key: 'pay', label: '本页实付合计', value: sumPay, format: 'money' },
    { key: 'count', label: '本页订单数', value: String(list.value.length), format: 'count', unit: '笔' },
    {
      key: 'total',
      label: '符合条件的订单',
      value: pagination.total > 0 ? String(pagination.total) : '0',
      format: 'count',
      unit: '笔',
    },
    {
      key: 'withdraw',
      label: '待处理提现',
      value: pendingCount === null || pendingCount === undefined || pendingCount === '' ? '--' : String(pendingCount),
      format: 'count',
      unit: '笔',
    },
  ]
})

function parseMoney(value) {
  const num = parseFloat(String(value ?? '0').replace(/,/g, ''))
  return Number.isFinite(num) ? num : 0
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }
  const num = parseMoney(value)
  return num.toFixed(2)
}

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

function buildSettlementQueryParams({ withPagination = true } = {}) {
  const params = {
    status: '6',
    business_type: businessType.value || undefined,
  }

  if (withPagination) {
    params.page = pagination.page
    params.limit = pagination.pageSize
  }

  const orderKeyword = normalizeSearchKeyword(filters.orderNo)
  if (orderKeyword) {
    params.keyword = orderKeyword
  }

  const merchantName = filters.merchantName.trim()
  if (merchantName) {
    params.merchant_name = merchantName
  }

  if (Array.isArray(settledRange.value) && settledRange.value.length === 2) {
    params.settled_start = settledRange.value[0]
    params.settled_end = settledRange.value[1]
  }

  return params
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function loadList() {
  loading.value = true
  loadError.value = ''

  try {
    const result = await fetchAdminOrders(buildSettlementQueryParams())

    const items = Array.isArray(result?.list) ? result.list : []
    list.value = items
    pagination.total = result?.pagination?.total ?? result?.total ?? 0
    listSums.value = result?.sums || null
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '结算数据加载失败')
    list.value = []
    pagination.total = 0
    listSums.value = null
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  pagination.page = 1
  loadList()
}

function handleReset() {
  filters.orderNo = ''
  filters.merchantName = ''
  businessType.value = ''
  settledRange.value = []
  pagination.page = 1
  loadList()
}

async function handleExport() {
  exporting.value = true
  try {
    const blob = await exportAdminOrdersCsv(buildSettlementQueryParams({ withPagination: false }))
    const range = Array.isArray(settledRange.value) && settledRange.value.length === 2
      ? `_${settledRange.value[0]}_${settledRange.value[1]}`
      : ''
    downloadBlob(blob, `分账明细${range}.csv`)
    ElMessage.success('已开始下载 csv')
  } catch (error) {
    ElMessage.error(getRequestErrorMessage(error, error?.message || '导出失败'))
  } finally {
    exporting.value = false
  }
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

defineExpose({
  loadList,
})
</script>

<template>
  <div>
    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="page-shell__alert"
      title="数据来源说明"
      description="筛选合计按当前筛选全量加总，不是本页。镇上平台利润常为 0（商品 15% 计入骑手所得）。「导出 csv」下载当前筛选全量对账文件（订单号、入账日、实付、商家应得、平台、骑手）。点击列表「详情」可查看单笔分账。"
    />

    <div class="payment-stats">
      <el-card v-for="item in summaryCards" :key="item.key" class="payment-stat-card" shadow="never">
        <div class="payment-stat-card__label">{{ item.label }}</div>
        <div class="payment-stat-card__value" :class="`payment-stat-card__value--${item.format}`">
          <template v-if="item.format === 'money'">¥ {{ item.value }}</template>
          <template v-else-if="item.format === 'count'">
            {{ item.value }}<span v-if="item.value !== '--'" class="payment-stat-card__unit">{{ item.unit }}</span>
          </template>
          <template v-else>{{ item.value }}</template>
        </div>
      </el-card>
    </div>

    <el-card class="page-shell__card">
      <div class="payment-toolbar">
        <el-input
          v-model="filters.orderNo"
          placeholder="订单号"
          clearable
          style="width: 200px"
          @keyup.enter="handleFilterChange"
          @clear="handleFilterChange"
        />
        <el-select v-model="businessType" placeholder="业务类型" clearable style="width: 160px" @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="县城外卖" value="county_takeout" />
          <el-option label="乡镇外卖" value="town_takeout" />
        </el-select>
        <el-date-picker
          v-model="settledRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="入账起"
          end-placeholder="入账止"
          clearable
          style="width: 260px"
          @change="handleFilterChange"
        />
        <el-input
          v-model="filters.merchantName"
          placeholder="商家名称"
          clearable
          style="width: 200px"
          @keyup.enter="handleFilterChange"
          @clear="handleFilterChange"
        />
        <el-button type="primary" :loading="loading" @click="handleFilterChange">查询</el-button>
        <el-button :loading="exporting" @click="handleExport">导出 csv</el-button>
        <el-button @click="handleReset">重置</el-button>
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

      <el-table :data="list" v-loading="loading" border size="small" class="admin-table--compact" empty-text="暂无已完成订单">
        <el-table-column label="订单号" width="168">
          <template #default="{ row }">
            <span class="admin-table__order-no">
              {{ formatOrderNoDisplay(row.order_no) || row.order_no || '--' }}
            </span>
            <!-- S-07 拼单账单口径（D-P43）：按子单列，标主店/子店；主店行提示取餐费只挂主店 + 退单运费不重算 -->
            <div v-if="row.is_group_order" class="payment-group-tags">
              <el-tag :type="row.is_group_main ? 'warning' : 'info'" size="small" effect="plain">
                {{ row.is_group_main ? '拼单·主店' : '拼单·子店' }}
              </el-tag>
              <span v-if="row.group_no" class="payment-group-no">组 {{ row.group_no }}</span>
            </div>
            <div v-if="row.is_group_order && row.is_group_main" class="payment-group-note">
              取餐费 ¥{{ formatMoney(row.pickup_fee) }}（含全单，仅主店计）
            </div>
            <div v-if="row.is_group_order && row.is_group_main && row.group_has_refund" class="payment-group-note">
              拼单运费不因退单重算（取餐费已按份退）
            </div>
          </template>
        </el-table-column>
        <el-table-column label="业务" width="72" align="center">
          <template #default="{ row }">
            {{ row.business_label === '县城外卖' ? '县城' : row.business_label === '乡镇外卖' ? '乡镇' : (row.business_label || '--') }}
          </template>
        </el-table-column>
        <el-table-column label="商家" min-width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.merchant?.name || '--' }}</template>
        </el-table-column>
        <el-table-column label="实付/完成" width="102" align="right">
          <template #default="{ row }">
            <div class="admin-table__main payment-amount">¥ {{ formatMoney(row.pay_amount) }}</div>
            <div class="admin-table__sub">{{ formatCompactTime(row.delivered_at || row.settled_at) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="商家应得" width="92" align="right">
          <template #default="{ row }">
            <div class="admin-table__main payment-amount">¥ {{ formatMoney(row.merchant_income_amount) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="平台/骑手" width="112" align="right">
          <template #default="{ row }">
            <!-- 镇上单商品 15% 计入骑手所得、平台收入常为 0（D-P30），故平台与骑手并列展示 -->
            <div class="admin-table__main payment-amount">平台 ¥{{ formatMoney(row.platform_income_amount) }}</div>
            <div class="admin-table__sub">骑手 ¥{{ formatMoney(row.rider_fee) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="入账时间" width="102" align="right">
          <template #default="{ row }">
            <span v-if="row.settled_at">{{ formatCompactTime(row.settled_at) }}</span>
            <el-tag v-else type="warning" size="small">未入账</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="page-shell__pagination">
        <el-pagination
          background
          layout="total, prev, pager, next, jumper"
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

<style scoped>
.payment-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
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
  line-height: 1.2;
}

.payment-stat-card__value--money {
  color: #cf1322;
}

.payment-stat-card__unit {
  margin-left: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #909399;
}

.payment-amount {
  text-align: right;
}

.payment-group-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.payment-group-no {
  font-size: 12px;
  color: #909399;
}

.payment-group-note {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.payment-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
