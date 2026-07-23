<!-- 这个页面是“总后台商家管理页”，查看全量商家（待审/已通过/已驳回），与审核中心分工：审核中心做待审处理，这里做运营视角的全量检索。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">商家管理</h1>
        <p class="page-shell__subtitle">查看全部商家申请与已上线店铺；待审商家可在本页直接审核，也可前往审核中心批量处理。</p>
      </div>
      <div class="page-shell__actions">
        <el-button type="primary" plain @click="goReviews">前往审核中心</el-button>
      </div>
    </div>

    <el-card class="page-shell__card">
      <div class="merchant-toolbar">
        <el-radio-group v-model="statusFilter" @change="handleStatusChange">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="pending">待审核</el-radio-button>
          <el-radio-button value="approved">已通过</el-radio-button>
          <el-radio-button value="rejected">已驳回</el-radio-button>
        </el-radio-group>
        <div v-if="summary" class="merchant-summary">
          <span>待审 {{ summary.pending_count ?? 0 }}</span>
          <span>已通过 {{ summary.approved_count ?? 0 }}</span>
          <span>已驳回 {{ summary.rejected_count ?? 0 }}</span>
        </div>
      </div>

      <el-form class="merchant-search" inline @submit.prevent="handleSearch">
        <el-form-item label="店铺名称">
          <el-input
            v-model="filters.storeName"
            placeholder="请输入店铺名称"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input
            v-model="filters.phone"
            placeholder="请输入手机号"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="乡镇名">
          <el-input
            v-model="filters.townName"
            placeholder="请输入乡镇名"
            clearable
            style="width: 180px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

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

      <el-table :data="list" v-loading="loading" border size="small" class="admin-table--compact" empty-text="暂无商家数据">
        <el-table-column label="店铺" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="admin-table__stack">
              <div class="admin-table__main">{{ row.store_name || '--' }}</div>
              <div class="admin-table__sub">{{ row.merchant_nickname || '--' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="手机号" min-width="108" show-overflow-tooltip>
          <template #default="{ row }">{{ row.phone || '--' }}</template>
        </el-table-column>
        <el-table-column label="业务/分类" min-width="108" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="admin-table__stack">
              <div class="admin-table__main">{{ getBusinessScopeLabel(row.business_scope) }}</div>
              <div class="admin-table__sub">{{ row.category || '--' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="乡镇" min-width="88" show-overflow-tooltip>
          <template #default="{ row }">{{ row.town_name || '--' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <div class="admin-table__inline">
              <el-tag :type="getAuditTagType(row.audit_status)" size="small">
                {{ row.audit_status_text || getAuditLabel(row.audit_status) }}
              </el-tag>
              <span class="admin-table__sub">{{ Number(row.status) === 1 ? '营业中' : '未营业' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="108">
          <template #default="{ row }">{{ formatCompactTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="92" align="center">
          <template #default="{ row }">
            <div class="admin-actions--compact">
              <el-button type="primary" link size="small" @click="handleViewDetail(row)">详情</el-button>
              <el-button
                v-if="Number(row.audit_status) === 0"
                type="success"
                link
                size="small"
                @click="handleAudit(row, 'approve')"
              >
                通过
              </el-button>
            </div>
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

    <el-drawer v-model="detailVisible" :title="detailTitle" size="520px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-alert
          v-if="detailError"
          :title="detailError"
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
      <template #footer>
        <template v-if="Number(detailData?.audit_status) === 0">
          <el-button type="success" :loading="actionLoading" @click="handleAudit(detailData, 'approve')">
            通过
          </el-button>
          <el-button type="danger" :loading="actionLoading" @click="handleAudit(detailData, 'reject')">
            拒绝
          </el-button>
        </template>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
// 这个文件是“总后台商家管理页”逻辑。
// 通过 /admin/merchant/* 拉取列表与详情，待审商家支持本页直接审核。
import { reactive, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveMerchant,
  fetchAdminMerchantDetail,
  fetchAdminMerchants,
  rejectMerchant,
} from '../../api/merchant'
import { getRequestErrorMessage } from '../../utils/http'
import { getBackendOrigin } from '../../utils/backend-origin'
import { buildDetailEntries, formatCompactTime, getAuditStatusLabel, getBusinessScopeLabel, MERCHANT_DETAIL_FIELD_ORDER } from '../../utils/detail-display'
import { normalizeSearchKeyword } from '../../utils/orderNo.js'

const route = useRoute()
const router = useRouter()

const BACKEND_ORIGIN = getBackendOrigin()

const DEFAULT_PAGE_SIZE = 10
const loading = ref(false)
const loadError = ref('')
const list = ref([])
const summary = ref(null)
const statusFilter = ref('approved')
const filters = reactive({
  storeName: '',
  phone: '',
  townName: '',
})
const pagination = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref(null)
const detailTitle = ref('商家详情')
const actionLoading = ref(false)

const detailEntries = computed(() => buildDetailEntries(detailData.value, {
  fieldOrder: MERCHANT_DETAIL_FIELD_ORDER,
  backendOrigin: BACKEND_ORIGIN,
}))

function normalizeStatus(value) {
  const allowed = ['all', 'pending', 'approved', 'rejected']
  return allowed.includes(value) ? value : 'approved'
}

function getAuditLabel(status) {
  return getAuditStatusLabel(status)
}

function getAuditTagType(status) {
  if (Number(status) === 1) return 'success'
  if (Number(status) === 2) return 'danger'
  return 'warning'
}

function buildSearchParams() {
  const params = {
    page: pagination.page,
    page_size: pagination.pageSize,
  }

  // 旧后端不支持 status=all 会 400；省略时新后端默认 all，旧后端默认待审（部署新后端后行为自动正确）
  if (statusFilter.value !== 'all') {
    params.status = statusFilter.value
  }

  const storeName = filters.storeName.trim()
  const phone = normalizeSearchKeyword(filters.phone)
  const townName = filters.townName.trim()

  if (storeName) params.store_name = storeName
  if (phone) params.phone = phone
  if (townName) params.town_name = townName

  return params
}

function syncRouteQuery() {
  const query = {
    status: statusFilter.value,
    page: String(pagination.page),
    page_size: String(pagination.pageSize),
  }

  const storeName = filters.storeName.trim()
  const phone = normalizeSearchKeyword(filters.phone)
  const townName = filters.townName.trim()

  if (storeName) query.store_name = storeName
  if (phone) query.phone = phone
  if (townName) query.town_name = townName

  router.replace({ query })
}

async function loadList() {
  loading.value = true
  loadError.value = ''

  try {
    const result = await fetchAdminMerchants(buildSearchParams())
    list.value = Array.isArray(result?.list) ? result.list : []
    pagination.total = result?.total ?? result?.pagination?.total ?? 0
    summary.value = result?.summary || null
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '商家列表加载失败')
    list.value = []
    summary.value = null
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handleStatusChange() {
  pagination.page = 1
  syncRouteQuery()
}

function handleSearch() {
  pagination.page = 1
  syncRouteQuery()
}

function handleReset() {
  filters.storeName = ''
  filters.phone = ''
  filters.townName = ''
  pagination.page = 1
  syncRouteQuery()
}

function handlePageChange(page) {
  pagination.page = page
  syncRouteQuery()
}

async function handleViewDetail(row) {
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detailData.value = null
  detailTitle.value = `商家详情 · ${row.store_name || row.id}`

  try {
    detailData.value = await fetchAdminMerchantDetail(row.id)
  } catch (error) {
    detailError.value = getRequestErrorMessage(error, '商家详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

function goReviews() {
  router.push({ path: '/reviews', query: { tab: 'merchant' } })
}

async function handleAudit(row, action) {
  if (!row?.id) return

  const actionText = action === 'approve' ? '通过' : '拒绝'
  let payload = {}

  if (action === 'reject') {
    const promptResult = await ElMessageBox.prompt('请填写驳回原因', '拒绝商家入驻', {
      confirmButtonText: '确认拒绝',
      cancelButtonText: '取消',
      inputPlaceholder: '驳回原因会展示给商家',
      inputValidator: (val) => !!(val && String(val).trim()) || '请填写驳回原因',
    }).catch(() => null)

    if (!promptResult) return
    payload = { reject_reason: String(promptResult.value || '').trim() }
  } else {
    try {
      await ElMessageBox.confirm(`确认通过商家「${row.store_name || row.id}」的入驻申请？`, '审核确认', {
        confirmButtonText: '通过',
        cancelButtonText: '取消',
        type: 'success',
      })
    } catch {
      return
    }
  }

  actionLoading.value = true
  try {
    if (action === 'approve') {
      await approveMerchant(row.id)
    } else {
      await rejectMerchant(row.id, payload)
    }
    ElMessage.success(`已${actionText}`)
    detailVisible.value = false
    await loadList()
  } catch (error) {
    ElMessage.error(getRequestErrorMessage(error, `${actionText}失败`))
  } finally {
    actionLoading.value = false
  }
}

function initFromRoute() {
  statusFilter.value = normalizeStatus(route.query.status)
  filters.storeName = String(route.query.store_name || '').trim()
  filters.phone = String(route.query.phone || '').trim()
  filters.townName = String(route.query.town_name || route.query.town || '').trim()
  pagination.page = Math.max(parseInt(route.query.page, 10) || 1, 1)
  pagination.pageSize = Math.min(Math.max(parseInt(route.query.page_size, 10) || DEFAULT_PAGE_SIZE, 1), 50)
}

watch(
  () => route.query,
  () => {
    initFromRoute()
    loadList()
  },
  { immediate: true },
)
</script>

<style scoped>
.merchant-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.merchant-summary {
  display: flex;
  gap: 16px;
  color: #606266;
  font-size: 13px;
}

.merchant-search {
  margin-bottom: 16px;
}
</style>
