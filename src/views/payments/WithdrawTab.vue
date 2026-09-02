<!-- 支付结算「提现审批」这一侧：角色/状态筛选、列表、打款/驳回、提现分页。 -->
<!-- 父页 /payments 还在。tab=withdraw 时挂这块。goRefunds / syncRouteTab / handleTabChange 仍在父页。 -->
<script setup>
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveMerchantWithdrawal,
  approveRiderWithdrawal,
  fetchMerchantWithdrawals,
  fetchRiderWithdrawals,
  rejectMerchantWithdrawal,
  rejectRiderWithdrawal,
} from '../../api/withdraw'
import { getRequestErrorMessage } from '../../utils/http'
import { formatCompactTime } from '../../utils/detail-display'

const emit = defineEmits(['pending-count-change'])

const DEFAULT_PAGE_SIZE = 10
const withdrawRole = ref('merchant')
const withdrawStatus = ref('pending')
const withdrawLoading = ref(false)
const withdrawError = ref('')
const withdrawList = ref([])
const withdrawPagination = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })
const actionLoadingId = ref(null)

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

function withdrawStatusLabel(status) {
  const map = { pending: '待处理', paid: '已打款', rejected: '已驳回' }
  return map[status] || status || '--'
}

function withdrawStatusTag(status) {
  const map = { pending: 'warning', paid: 'success', rejected: 'danger' }
  return map[status] || 'info'
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

function handleWithdrawFilterChange() {
  withdrawPagination.page = 1
  loadWithdrawList()
}

function handleWithdrawPageChange(page) {
  withdrawPagination.page = page
  loadWithdrawList()
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
    emit('pending-count-change')
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
    emit('pending-count-change')
  } catch (error) {
    if (error !== 'cancel' && error?.message !== 'cancel') {
      ElMessage.error(getRequestErrorMessage(error, '操作失败'))
    }
  } finally {
    actionLoadingId.value = null
  }
}

defineExpose({
  loadWithdrawList,
})
</script>

<template>
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

    <el-table :data="withdrawList" v-loading="withdrawLoading" border size="small" class="admin-table--compact" empty-text="暂无提现申请">
      <el-table-column label="账号" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="admin-table__main">
            {{ withdrawRole === 'merchant' ? (row.merchant_name || '--') : (row.account_name || '--') }}
          </div>
          <div class="admin-table__sub">{{ row.withdraw_no || '--' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="金额/状态" width="96">
        <template #default="{ row }">
          <div class="admin-table__main">¥ {{ row.amount }}</div>
          <el-tag :type="withdrawStatusTag(row.status)" size="small">{{ withdrawStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="银行卡" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="admin-table__main">{{ row.bank_name || '--' }}</div>
          <div class="admin-table__sub">{{ row.bank_card_plain || row.bank_card_masked || '--' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="变动前" width="88">
        <template #default="{ row }">¥ {{ formatMoney(row.balance_before) }}</template>
      </el-table-column>
      <el-table-column label="变动后" width="88">
        <template #default="{ row }">¥ {{ formatMoney(row.balance_after) }}</template>
      </el-table-column>
      <el-table-column label="申请时间" width="102">
        <template #default="{ row }">{{ formatCompactTime(row.applied_at) }}</template>
      </el-table-column>
      <el-table-column label="处理时间" width="102">
        <template #default="{ row }">{{ formatCompactTime(row.processed_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="92" align="center">
        <template #default="{ row }">
          <div v-if="row.status === 'pending'" class="admin-actions--compact">
            <el-button type="primary" link size="small" :loading="actionLoadingId === row.id" @click="handleApproveWithdraw(row)">
              打款
            </el-button>
            <el-button type="danger" link size="small" :loading="actionLoadingId === row.id" @click="handleRejectWithdraw(row)">
              驳回
            </el-button>
          </div>
          <span v-else class="admin-table__sub">{{ row.reject_reason || row.channel_transfer_no || '已处理' }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="page-shell__pagination">
      <el-pagination
        background
        layout="total, prev, pager, next, jumper"
        :current-page="withdrawPagination.page"
        :page-size="withdrawPagination.pageSize"
        :total="withdrawPagination.total"
        @current-change="handleWithdrawPageChange"
      />
    </div>
  </el-card>
</template>

<style scoped>
.payment-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
