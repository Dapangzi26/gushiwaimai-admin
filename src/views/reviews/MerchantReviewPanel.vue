<script setup>
// 审核中心「商家审核」这一侧：工具条、表、分页、拉列表。
// 详情抽屉和通过/拒绝仍在父页。父页 /reviews 还在，tab=merchant 或没带 tab 时看见这块。
import { onMounted, reactive } from 'vue'
import { fetchPendingMerchants } from '../../api/review'
import { formatCompactTime, getIdentityTypeLabel } from '../../utils/detail-display'

defineProps({
  actionLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['view', 'row-command'])

const merchantState = reactive({
  loading: false,
  error: '',
  list: [],
  status: 'pending',
  pagination: { page: 1, pageSize: 10, total: 0 },
})

function resolveList(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.list)) {
    return payload.list
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  return []
}

function normalizeRecord(record, type) {
  return {
    raw: record,
    id: record?.id ?? '--',
    name: record?.name || record?.merchant_name || record?.store_name || '--',
    nickname: record?.nickname || record?.name || '--',
    phone: record?.phone || record?.mobile || '--',
    town: record?.town_name || record?.town || record?.station_name || '--',
    identityType: getIdentityTypeLabel(record?.identity_type),
    submittedAt: record?.submitted_at || record?.created_at || record?.apply_time || '--',
    statusText: record?.status_text || record?.audit_status_text || record?.apply_status_text || '待审核',
    type,
  }
}

async function loadMerchantList() {
  merchantState.loading = true
  merchantState.error = ''

  try {
    const params = {
      page: merchantState.pagination.page,
      page_size: merchantState.pagination.pageSize,
    }
    if (merchantState.status !== 'all') {
      params.status = merchantState.status
    }

    const result = await fetchPendingMerchants(params)
    merchantState.list = resolveList(result).map((item) => normalizeRecord(item, 'merchant'))
    merchantState.pagination.total = result?.total ?? result?.pagination?.total ?? 0
  } catch (error) {
    merchantState.error = error?.response?.data?.message || error?.message || '商家待审核列表加载失败'
    merchantState.list = []
    merchantState.pagination.total = 0
  } finally {
    merchantState.loading = false
  }
}

function handleMerchantStatusChange(status) {
  merchantState.status = status
  merchantState.pagination.page = 1
  loadMerchantList()
}

function handleMerchantPageChange(page) {
  merchantState.pagination.page = page
  loadMerchantList()
}

function canAuditRow(row) {
  if (row.type === 'merchant') {
    return merchantState.status === 'pending'
  }
  return false
}

function handleRetry() {
  loadMerchantList()
}

onMounted(() => {
  loadMerchantList()
})

defineExpose({
  loadMerchantList,
  merchantState,
})
</script>

<template>
  <div>
    <div class="review-page__toolbar">
      <el-radio-group v-model="merchantState.status" @change="handleMerchantStatusChange">
        <el-radio-button value="pending">待审核</el-radio-button>
        <el-radio-button value="approved">已通过</el-radio-button>
        <el-radio-button value="rejected">已驳回</el-radio-button>
        <el-radio-button value="all">全部</el-radio-button>
      </el-radio-group>
    </div>

    <el-alert
      v-if="merchantState.error"
      :title="merchantState.error"
      type="error"
      show-icon
      :closable="false"
      class="review-page__alert"
    >
      <template #default>
        <el-button type="danger" link @click="handleRetry">重新加载</el-button>
      </template>
    </el-alert>

    <el-table
      v-loading="merchantState.loading || actionLoading"
      :data="merchantState.list"
      empty-text="暂无待审核数据"
      border
      size="small"
      class="admin-table--compact"
    >
      <el-table-column label="商家" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="admin-table__stack">
            <div class="admin-table__main">{{ row.name }}</div>
            <div class="admin-table__sub">{{ row.phone }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="乡镇" min-width="88" show-overflow-tooltip>
        <template #default="{ row }">{{ row.town }}</template>
      </el-table-column>

      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag type="warning" size="small">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="提交时间" width="108">
        <template #default="{ row }">{{ formatCompactTime(row.submittedAt) }}</template>
      </el-table-column>

      <el-table-column label="操作" width="92" align="center">
        <template #default="{ row }">
          <div class="admin-actions--compact">
            <el-button link type="primary" size="small" @click="emit('view', row)">详情</el-button>
            <el-dropdown v-if="canAuditRow(row)" trigger="click" @command="(command) => emit('row-command', command, row)">
              <el-button link size="small">审核</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="approve">通过</el-dropdown-item>
                  <el-dropdown-item command="reject">拒绝</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div class="page-shell__pagination">
      <el-pagination
        background
        layout="total, prev, pager, next, jumper"
        :current-page="merchantState.pagination.page"
        :page-size="merchantState.pagination.pageSize"
        :total="merchantState.pagination.total"
        @current-change="handleMerchantPageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.review-page__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
