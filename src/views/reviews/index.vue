<script setup>
// 这个文件是“总后台审核中心”。
// 这里同时承接商家审核和骑手审核，并且支持从工作台按 query 直接跳到对应审核页签。
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveMerchant,
  approveRider,
  fetchAdminRiders,
  fetchMerchantDetail,
  fetchPendingMerchants,
  fetchPendingRiders,
  fetchRiderDetail,
  rejectMerchant,
  rejectRider,
} from '../../api/review'
import { getBackendOrigin } from '../../utils/backend-origin'
import {
  buildDetailEntry,
  COMMON_HIDDEN_FIELDS,
  MERCHANT_DETAIL_FIELD_ORDER,
  RIDER_DETAIL_FIELD_ORDER,
  formatCompactTime,
  getIdentityTypeLabel,
} from '../../utils/detail-display'

const route = useRoute()
const router = useRouter()

const activeTab = ref('merchant')
const detailVisible = ref(false)
const detailLoading = ref(false)
const actionLoading = ref(false)
const detailTitle = ref('审核详情')
const detailData = ref(null)
const detailType = ref('merchant')

const BACKEND_ORIGIN = getBackendOrigin()

const DETAIL_FIELD_ORDER = {
  merchant: MERCHANT_DETAIL_FIELD_ORDER,
  rider: RIDER_DETAIL_FIELD_ORDER,
}

const merchantState = reactive({
  loading: false,
  error: '',
  list: [],
  status: 'pending',
  pagination: { page: 1, pageSize: 10, total: 0 },
})

const riderState = reactive({
  loading: false,
  error: '',
  list: [],
  status: 'pending',
  pagination: { page: 1, pageSize: 10, total: 0 },
})

const currentState = computed(() => (activeTab.value === 'merchant' ? merchantState : riderState))

const detailEntries = computed(() => {
  if (!detailData.value || detailData.value.errorMessage) {
    return []
  }

  const schema = DETAIL_FIELD_ORDER[detailType.value] || []
  const matchedEntries = schema
    .filter((key) => key in detailData.value && !COMMON_HIDDEN_FIELDS.has(key))
    .map((key) => buildDetailEntry(key, detailData.value[key], BACKEND_ORIGIN))

  const remainingEntries = Object.entries(detailData.value)
    .filter(([key]) => !schema.includes(key) && !COMMON_HIDDEN_FIELDS.has(key))
    .map(([key, value]) => buildDetailEntry(key, value, BACKEND_ORIGIN))

  return [...matchedEntries, ...remainingEntries]
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

function normalizeReviewTab(value) {
  return value === 'rider' ? 'rider' : 'merchant'
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

function handleMerchantStatusChange(status) {
  merchantState.status = status
  merchantState.pagination.page = 1
  loadMerchantList()
}

function handleMerchantPageChange(page) {
  merchantState.pagination.page = page
  loadMerchantList()
}

function handleRiderPageChange(page) {
  riderState.pagination.page = page
  loadRiderList()
}

function canAuditRow(row) {
  if (row.type === 'merchant') {
    return merchantState.status === 'pending'
  }
  return riderState.status === 'pending'
}

async function handleView(row) {
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = null
  detailType.value = row.type
  detailTitle.value = row.type === 'merchant' ? '商家审核详情' : '骑手审核详情'

  try {
    detailData.value = row.type === 'merchant' ? await fetchMerchantDetail(row.id) : await fetchRiderDetail(row.id)
  } catch (error) {
    detailData.value = { errorMessage: error?.response?.data?.message || error?.message || '详情加载失败' }
  } finally {
    detailLoading.value = false
  }
}

async function handleAudit(row, action) {
  const actionText = action === 'approve' ? '通过' : '拒绝'
  let payload = {}

  if (action === 'reject') {
    const promptResult = await ElMessageBox.prompt(
      `请输入${row.type === 'merchant' ? '商家' : '骑手'}审核驳回原因`,
      '填写驳回原因',
      {
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '驳回原因会展示给申请方和审核端查看',
        inputValidator: (value) => {
          if (!String(value || '').trim()) {
            return '驳回原因不能为空'
          }
          return true
        }
      },
    )
    payload = {
      reject_reason: String(promptResult.value || '').trim(),
    }
  }

  await ElMessageBox.confirm(`确认${actionText}当前${row.type === 'merchant' ? '商家' : '骑手'}审核吗？`, '审核确认', {
    type: 'warning',
  })

  actionLoading.value = true

  try {
    if (row.type === 'merchant') {
      if (action === 'approve') {
        await approveMerchant(row.id)
      } else {
        await rejectMerchant(row.id, payload)
      }

      await loadMerchantList()
    } else {
      if (action === 'approve') {
        await approveRider(row.id)
      } else {
        await rejectRider(row.id, payload)
      }

      await loadRiderList()
    }

    ElMessage.success(`审核${actionText}成功`)
  } finally {
    actionLoading.value = false
  }
}

function handleRetry() {
  if (activeTab.value === 'merchant') {
    loadMerchantList()
    return
  }

  loadRiderList()
}

function handleRowCommand(command, row) {
  if (command === 'approve') {
    handleAudit(row, 'approve')
    return
  }
  if (command === 'reject') {
    handleAudit(row, 'reject')
  }
}

// 工作台跳审核页时，会带 tab 参数进来。
// 这里把路由参数和当前页签对齐，避免“点了待审核骑手，却还停在商家审核”。
async function handleTabChange(tabName) {
  const normalizedTab = normalizeReviewTab(tabName)
  if (normalizeReviewTab(route.query.tab) === normalizedTab) {
    return
  }

  await router.replace({
    path: route.path,
    query: {
      ...route.query,
      tab: normalizedTab,
    },
  })
}

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = normalizeReviewTab(tab)
  },
  { immediate: true },
)

onMounted(() => {
  loadMerchantList()
  loadRiderList()
})
</script>

<template>
  <div class="page-shell">
    <h1 class="page-shell__title">审核中心</h1>

    <el-card class="page-shell__card review-page">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="商家审核" name="merchant" />
        <el-tab-pane label="骑手审核" name="rider" />
      </el-tabs>

      <div v-if="activeTab === 'merchant'" class="review-page__toolbar">
        <el-radio-group v-model="merchantState.status" @change="handleMerchantStatusChange">
          <el-radio-button value="pending">待审核</el-radio-button>
          <el-radio-button value="approved">已通过</el-radio-button>
          <el-radio-button value="rejected">已驳回</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
      </div>

      <div v-else class="review-page__toolbar">
        <el-radio-group v-model="riderState.status" @change="handleRiderStatusChange">
          <el-radio-button value="pending">待审核</el-radio-button>
          <el-radio-button value="approved">已通过</el-radio-button>
          <el-radio-button value="rejected">已驳回</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
        <span class="review-page__hint">已通过/已驳回由后端 audit_status 参数筛选；自配送员待审含在「待审核」中。</span>
      </div>

      <el-alert
        v-if="currentState.error"
        :title="currentState.error"
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
        v-loading="currentState.loading || actionLoading"
        :data="currentState.list"
        empty-text="暂无待审核数据"
        border
        size="small"
        class="admin-table--compact"
      >
        <template v-if="activeTab === 'merchant'">
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
        </template>

        <template v-else>
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
        </template>

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
              <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
              <el-dropdown v-if="canAuditRow(row)" trigger="click" @command="(command) => handleRowCommand(command, row)">
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
          v-if="activeTab === 'merchant'"
          background
          layout="total, prev, pager, next, jumper"
          :current-page="merchantState.pagination.page"
          :page-size="merchantState.pagination.pageSize"
          :total="merchantState.pagination.total"
          @current-change="handleMerchantPageChange"
        />
        <el-pagination
          v-else
          background
          layout="total, prev, pager, next, jumper"
          :current-page="riderState.pagination.page"
          :page-size="riderState.pagination.pageSize"
          :total="riderState.pagination.total"
          @current-change="handleRiderPageChange"
        />
      </div>
    </el-card>

    <el-drawer v-model="detailVisible" :title="detailTitle" size="520px">
      <div v-loading="detailLoading">
        <el-alert
          v-if="detailData?.errorMessage"
          :title="detailData.errorMessage"
          type="error"
          show-icon
          :closable="false"
        />
        <el-descriptions v-else-if="detailData" :column="1" border>
          <el-descriptions-item
            v-for="item in detailEntries"
            :key="item.key"
            :label="item.label"
          >
            <el-image
              v-if="item.isImage"
              :src="item.imageUrl"
              :preview-src-list="[item.imageUrl]"
              fit="cover"
              class="review-detail__image"
              preview-teleported
            />
            <span v-else class="detail-display__text">{{ item.value }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
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
