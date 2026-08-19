<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveOrderReview,
  fetchOrderReviewDetail,
  fetchOrderReviewList,
  rejectOrderReview,
} from '../../api/order-review'
import { formatCompactTime } from '../../utils/detail-display'

const route = useRoute()
const router = useRouter()

const state = reactive({
  loading: false,
  error: '',
  list: [],
  status: 'pending',
  pagination: { page: 1, pageSize: 10, total: 0 },
  summary: { pending_count: 0, approved_count: 0, rejected_count: 0 },
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const actionLoading = ref(false)
const detailData = ref(null)

function statusTagType(status) {
  if (status === 3) return 'warning'
  if (status === 0) return 'danger'
  if (status === 2) return 'success'
  return 'success'
}

async function loadList() {
  state.loading = true
  state.error = ''
  try {
    const result = await fetchOrderReviewList({
      status: state.status,
      page: state.pagination.page,
      page_size: state.pagination.pageSize,
    })
    state.list = Array.isArray(result?.list) ? result.list : []
    state.pagination.total = result?.total ?? 0
    state.summary = result?.summary || state.summary
  } catch (error) {
    state.error = error?.response?.data?.message || error?.message || '评价列表加载失败'
    state.list = []
    state.pagination.total = 0
  } finally {
    state.loading = false
  }
}

function handleStatusChange(status) {
  state.status = status
  state.pagination.page = 1
  loadList()
}

function handlePageChange(page) {
  state.pagination.page = page
  loadList()
}

async function handleView(row) {
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    detailData.value = await fetchOrderReviewDetail(row.id)
  } catch (error) {
    detailData.value = {
      errorMessage: error?.response?.data?.message || error?.message || '详情加载失败',
    }
  } finally {
    detailLoading.value = false
  }
}

async function handleApprove(row) {
  await ElMessageBox.confirm('确认通过该评价并在用户端公开展示吗？', '审核确认', { type: 'warning' })
  actionLoading.value = true
  try {
    await approveOrderReview(row.id)
    ElMessage.success('评价已通过')
    await loadList()
    if (detailVisible.value && detailData.value?.id === row.id) {
      detailData.value = await fetchOrderReviewDetail(row.id)
    }
  } finally {
    actionLoading.value = false
  }
}

async function handleReject(row) {
  const promptResult = await ElMessageBox.prompt('请输入拒绝原因（用户可见，用于说明违规内容）', '拒绝评价', {
    confirmButtonText: '确认拒绝',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '例如：评价含违法/辱骂/广告内容',
    inputValidator: (value) => {
      if (!String(value || '').trim()) {
        return '拒绝原因不能为空'
      }
      return true
    },
  })

  actionLoading.value = true
  try {
    await rejectOrderReview(row.id, {
      reject_reason: String(promptResult.value || '').trim(),
    })
    ElMessage.success('评价已拒绝')
    await loadList()
    if (detailVisible.value && detailData.value?.id === row.id) {
      detailData.value = await fetchOrderReviewDetail(row.id)
    }
  } finally {
    actionLoading.value = false
  }
}

function canAuditRow(row) {
  return state.status === 'pending' && Number(row.status) === 3
}

async function syncRouteTab() {
  if (route.query.tab !== 'order-review') {
    await router.replace({
      path: route.path,
      query: { ...route.query, tab: 'order-review' },
    })
  }
}

onMounted(async () => {
  await syncRouteTab()
  loadList()
})
</script>

<template>
  <div class="order-review-tab">
    <div class="order-review-tab__toolbar">
      <el-radio-group v-model="state.status" @change="handleStatusChange">
        <el-radio-button value="pending">待审核 ({{ state.summary.pending_count ?? 0 }})</el-radio-button>
        <el-radio-button value="approved">已通过</el-radio-button>
        <el-radio-button value="rejected">已拒绝</el-radio-button>
        <el-radio-button value="all">全部</el-radio-button>
      </el-radio-group>
      <span class="order-review-tab__hint">用户评价提交后默认待审核，通过后才会在用户端和商家端公开展示。</span>
    </div>

    <el-alert
      v-if="state.error"
      :title="state.error"
      type="error"
      show-icon
      :closable="false"
      class="order-review-tab__alert"
    >
      <template #default>
        <el-button type="danger" link @click="loadList">重新加载</el-button>
      </template>
    </el-alert>

    <el-table
      v-loading="state.loading || actionLoading"
      :data="state.list"
      empty-text="暂无评价数据"
      border
      size="small"
      class="admin-table--compact"
    >
      <el-table-column label="订单" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="admin-table__stack">
            <div class="admin-table__main">{{ row.order_no || row.order_id }}</div>
            <div class="admin-table__sub">评价ID {{ row.id }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="用户/商家" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="admin-table__stack">
            <div class="admin-table__main">{{ row.user_nickname }}</div>
            <div class="admin-table__sub">{{ row.merchant_name || `商家${row.merchant_id}` }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="评分" width="72" align="center">
        <template #default="{ row }">{{ row.merchant_score }} 星</template>
      </el-table-column>

      <el-table-column label="评价内容" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.merchant_content || '（无文字）' }}</template>
      </el-table-column>

      <el-table-column label="状态" width="96">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ row.status_text }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="提交时间" width="108">
        <template #default="{ row }">{{ formatCompactTime(row.created_at) }}</template>
      </el-table-column>

      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <div class="admin-actions--compact">
            <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
            <template v-if="canAuditRow(row)">
              <el-button link type="success" size="small" @click="handleApprove(row)">通过</el-button>
              <el-button link type="danger" size="small" @click="handleReject(row)">拒绝</el-button>
            </template>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div class="page-shell__pagination">
      <el-pagination
        background
        layout="total, prev, pager, next, jumper"
        :current-page="state.pagination.page"
        :page-size="state.pagination.pageSize"
        :total="state.pagination.total"
        @current-change="handlePageChange"
      />
    </div>

    <el-drawer v-model="detailVisible" title="评价审核详情" size="560px">
      <div v-loading="detailLoading">
        <el-alert
          v-if="detailData?.errorMessage"
          :title="detailData.errorMessage"
          type="error"
          show-icon
          :closable="false"
        />
        <el-descriptions v-else-if="detailData" :column="1" border>
          <el-descriptions-item label="订单号">{{ detailData.order_no || detailData.order_id }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ detailData.user_nickname }} / {{ detailData.user_phone || '--' }}</el-descriptions-item>
          <el-descriptions-item label="商家">{{ detailData.merchant_name || detailData.merchant_id }}</el-descriptions-item>
          <el-descriptions-item label="商家评分">{{ detailData.merchant_score }} 星</el-descriptions-item>
          <el-descriptions-item label="商家评价">{{ detailData.merchant_content || '（无）' }}</el-descriptions-item>
          <el-descriptions-item v-if="detailData.rider_score" label="骑手评分">{{ detailData.rider_score }} 星</el-descriptions-item>
          <el-descriptions-item v-if="detailData.rider_content" label="骑手评价">{{ detailData.rider_content }}</el-descriptions-item>
          <el-descriptions-item label="匿名">{{ detailData.is_anonymous ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detailData.status_text }}</el-descriptions-item>
          <el-descriptions-item v-if="detailData.reject_reason" label="拒绝原因">{{ detailData.reject_reason }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ detailData.created_at || '--' }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ detailData.audited_at || '--' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="detailData && canAuditRow(detailData)" class="order-review-tab__drawer-actions">
          <el-button type="success" :loading="actionLoading" @click="handleApprove(detailData)">通过</el-button>
          <el-button type="danger" :loading="actionLoading" @click="handleReject(detailData)">拒绝</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.order-review-tab__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.order-review-tab__hint {
  color: #909399;
  font-size: 12px;
}

.order-review-tab__alert {
  margin-bottom: 16px;
}

.order-review-tab__drawer-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
</style>
