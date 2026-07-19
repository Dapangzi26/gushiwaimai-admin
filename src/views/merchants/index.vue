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

      <el-table :data="list" v-loading="loading" border empty-text="暂无商家数据">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="store_name" label="店铺名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="merchant_nickname" label="商家昵称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" min-width="130" />
        <el-table-column label="业务线" width="100">
          <template #default="{ row }">
            {{ getBusinessScopeLabel(row.business_scope) }}
          </template>
        </el-table-column>
        <el-table-column prop="town_name" label="所属乡镇" min-width="120" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" min-width="100" show-overflow-tooltip />
        <el-table-column label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getAuditTagType(row.audit_status)">
              {{ row.audit_status_text || getAuditLabel(row.audit_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="营业状态" width="100">
          <template #default="{ row }">
            <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'">
              {{ Number(row.status) === 1 ? '营业中' : '未营业' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" min-width="170">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewDetail(row)">详情</el-button>
            <el-button
              v-if="Number(row.audit_status) === 0"
              type="success"
              link
              @click="handleAudit(row, 'approve')"
            >
              通过
            </el-button>
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
          <el-descriptions-item label="店铺名称">{{ detailData.store_name || '--' }}</el-descriptions-item>
          <el-descriptions-item label="商家昵称">{{ detailData.merchant_nickname || '--' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detailData.phone || '--' }}</el-descriptions-item>
          <el-descriptions-item label="业务线">{{ getBusinessScopeLabel(detailData.business_scope) }}</el-descriptions-item>
          <el-descriptions-item label="所属乡镇">{{ detailData.town_name || '--' }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ detailData.address || '--' }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ detailData.category || '--' }}</el-descriptions-item>
          <el-descriptions-item label="简介">{{ detailData.description || '--' }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">{{ detailData.audit_status_text || getAuditLabel(detailData.audit_status) }}</el-descriptions-item>
          <el-descriptions-item label="审核人">{{ detailData.audited_by_name || '--' }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ formatTime(detailData.audited_at) }}</el-descriptions-item>
          <el-descriptions-item v-if="detailData.reject_reason" label="驳回原因">{{ detailData.reject_reason }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatTime(detailData.created_at) }}</el-descriptions-item>
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
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveMerchant,
  fetchAdminMerchantDetail,
  fetchAdminMerchants,
  rejectMerchant,
} from '../../api/merchant'
import { getRequestErrorMessage } from '../../utils/http'

const route = useRoute()
const router = useRouter()

const DEFAULT_PAGE_SIZE = 10
const loading = ref(false)
const loadError = ref('')
const list = ref([])
const summary = ref(null)
const statusFilter = ref('approved')
const pagination = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref(null)
const detailTitle = ref('商家详情')
const actionLoading = ref(false)

function normalizeStatus(value) {
  const allowed = ['all', 'pending', 'approved', 'rejected']
  return allowed.includes(value) ? value : 'approved'
}

function getBusinessScopeLabel(scope) {
  if (scope === 'county_food') return '县城'
  if (scope === 'town_food') return '乡镇'
  return scope || '--'
}

function getAuditLabel(status) {
  if (Number(status) === 0) return '待审核'
  if (Number(status) === 1) return '已通过'
  if (Number(status) === 2) return '已驳回'
  return '--'
}

function getAuditTagType(status) {
  if (Number(status) === 1) return 'success'
  if (Number(status) === 2) return 'danger'
  return 'warning'
}

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

function syncRouteQuery() {
  router.replace({
    query: {
      status: statusFilter.value,
      page: String(pagination.page),
      page_size: String(pagination.pageSize),
    },
  })
}

async function loadList() {
  loading.value = true
  loadError.value = ''

  try {
    const result = await fetchAdminMerchants({
      status: statusFilter.value,
      page: pagination.page,
      page_size: pagination.pageSize,
    })

    list.value = Array.isArray(result?.list) ? result.list : []
    summary.value = result?.summary || null
    pagination.total = result?.total ?? result?.pagination?.total ?? 0
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '商家列表加载失败')
    list.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handleStatusChange() {
  pagination.page = 1
  syncRouteQuery()
  loadList()
}

function handlePageChange(page) {
  pagination.page = page
  syncRouteQuery()
  loadList()
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
  pagination.page = Math.max(parseInt(route.query.page, 10) || 1, 1)
  pagination.pageSize = Math.min(Math.max(parseInt(route.query.page_size, 10) || DEFAULT_PAGE_SIZE, 1), 50)
}

watch(
  () => route.query,
  () => {
    initFromRoute()
    loadList()
  },
)

onMounted(() => {
  initFromRoute()
  loadList()
})
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
</style>
