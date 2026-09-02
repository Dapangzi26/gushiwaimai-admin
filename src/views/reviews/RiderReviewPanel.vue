<script setup>
// 审核中心「骑手审核」这一侧：工具条、表、分页、拉列表。
// 详情抽屉和通过/拒绝仍在父页。父页 /reviews 还在，tab=rider 时看见这块。
import { onMounted, reactive } from 'vue'
import { fetchAdminRiders, fetchPendingRiders } from '../../api/review'
import { formatCompactTime, getIdentityTypeLabel } from '../../utils/detail-display'

defineProps({
  actionLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['view', 'row-command'])

const riderState = reactive({
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

async function loadRiderList() {
  riderState.loading = true
  riderState.error = ''

  try {
    if (riderState.status === 'pending') {
      const result = await fetchPendingRiders({
        page: riderState.pagination.page,
        limit: riderState.pagination.pageSize,
      })
      riderState.list = resolveList(result).map((item) => normalizeRecord(item, 'rider'))
      riderState.pagination.total = result?.pagination?.total ?? result?.total ?? 0
      return
    }

    const params = {
      role: 'rider',
      page: riderState.pagination.page,
      limit: riderState.pagination.pageSize,
    }

    if (riderState.status === 'approved') {
      params.audit_status = 'approved'
    } else if (riderState.status === 'rejected') {
      params.audit_status = 'rejected'
    } else if (riderState.status === 'all') {
      params.audit_status = 'all'
    }

    const result = await fetchAdminRiders(params)
    riderState.list = resolveList(result).map((item) => normalizeRecord(item, 'rider'))
    riderState.pagination.total = result?.pagination?.total ?? result?.total ?? 0
  } catch (error) {
    riderState.error = error?.response?.data?.message || error?.message || '骑手待审核列表加载失败'
    riderState.list = []
    riderState.pagination.total = 0
  } finally {
    riderState.loading = false
  }
}

function handleRiderStatusChange(status) {
  riderState.status = status
  riderState.pagination.page = 1
  loadRiderList()
}

function handleRiderPageChange(page) {
  riderState.pagination.page = page
  loadRiderList()
}

function canAuditRow(row) {
  if (row.type === 'merchant') {
    return false
  }
  return riderState.status === 'pending'
}

function handleRetry() {
  loadRiderList()
}

onMounted(() => {
  loadRiderList()
})

defineExpose({
  loadRiderList,
  riderState,
})
</script>

<template>
  <div>
    <div class="review-page__toolbar">
      <el-radio-group v-model="riderState.status" @change="handleRiderStatusChange">
        <el-radio-button value="pending">待审核</el-radio-button>
        <el-radio-button value="approved">已通过</el-radio-button>
        <el-radio-button value="rejected">已驳回</el-radio-button>
        <el-radio-button value="all">全部</el-radio-button>
      </el-radio-group>
      <span class="review-page__hint">已通过/已驳回由后端 audit_status 参数筛选；自配送员待审含在「待审核」中。</span>
    </div>

    <el-alert
      v-if="riderState.error"
      :title="riderState.error"
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
      v-loading="riderState.loading || actionLoading"
      :data="riderState.list"
      empty-text="暂无待审核数据"
      border
      size="small"
      class="admin-table--compact"
    >
      <el-table-column label="骑手" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="admin-table__stack">
            <div class="admin-table__main">{{ row.nickname }}</div>
            <div class="admin-table__sub">{{ row.phone }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="身份/乡镇" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="admin-table__stack">
            <div class="admin-table__main">{{ row.identityType }}</div>
            <div class="admin-table__sub">{{ row.town }}</div>
          </div>
        </template>
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
        :current-page="riderState.pagination.page"
        :page-size="riderState.pagination.pageSize"
        :total="riderState.pagination.total"
        @current-change="handleRiderPageChange"
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

.review-page__hint {
  color: #909399;
  font-size: 12px;
}
</style>
