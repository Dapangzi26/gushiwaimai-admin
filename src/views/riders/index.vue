<!-- 这个页面是“总后台骑手管理页”，用于统一查看平台骑手和商家自配送员，避免两个配送角色在总后台里割裂。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">骑手管理</h1>
        <p class="page-shell__subtitle">{{ pageSubtitle }}</p>
      </div>
      <div class="page-shell__actions">
        <el-input
          v-model="keyword"
          :placeholder="activeRole === 'rider' ? '搜索昵称、手机号、乡镇名' : '搜索昵称、手机号、商家名、商家ID'"
          clearable
          style="width: 280px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </div>

    <el-card class="page-shell__card">
      <el-tabs v-model="activeRole" @tab-change="handleRoleChange">
        <el-tab-pane label="平台骑手" name="rider" />
        <el-tab-pane label="商家自配送员" name="merchant_delivery" />
      </el-tabs>

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

      <el-table :data="list" v-loading="loading" border empty-text="暂无骑手数据">
        <el-table-column prop="id" label="ID" width="90" />
        <el-table-column prop="nickname" label="昵称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="identity_type" label="身份类型" min-width="120">
          <template #default="{ row }">
            <el-tag :type="row.role === 'merchant_delivery' ? 'warning' : 'primary'">
              {{ row.identity_type || '--' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="delivery_scope" label="配送范围" min-width="120">
          <template #default="{ row }">
            {{ getDeliveryScopeLabel(row.delivery_scope) }}
          </template>
        </el-table-column>
        <el-table-column prop="town_name" label="所属乡镇" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.town_name || row.rider_town || '--' }}
          </template>
        </el-table-column>
        <el-table-column
          v-if="activeRole === 'merchant_delivery'"
          prop="merchant_name"
          label="所属店铺"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          v-if="activeRole === 'merchant_delivery'"
          prop="merchant_binding_code"
          label="商家ID"
          width="120"
        />
        <el-table-column prop="audit_status_text" label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getAuditStatusTagType(row.rider_audit_status)">
              {{ row.audit_status_text || getAuditStatusLabel(row.rider_audit_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="账号状态" width="100">
          <template #default="{ row }">
            <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'">
              {{ Number(row.status) === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewDetail(row)">详情</el-button>
            <template v-if="Number(row.rider_audit_status) === 0">
              <el-button type="success" link @click="handleAudit(row, 'approve')">通过</el-button>
              <el-button type="danger" link @click="handleAudit(row, 'reject')">拒绝</el-button>
            </template>
            <el-button
              v-if="activeRole === 'merchant_delivery'"
              type="danger"
              link
              @click="handleDelete(row)"
            >
              删除
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

    <el-drawer v-model="detailVisible" :title="detailTitle" size="480px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-alert v-if="detailError" :title="detailError" type="error" show-icon :closable="false" />
        <el-descriptions v-else-if="detailData" :column="1" border>
          <el-descriptions-item label="ID">{{ detailData.id }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ detailData.nickname || '--' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detailData.phone || '--' }}</el-descriptions-item>
          <el-descriptions-item label="身份类型">{{ detailData.identity_type || '--' }}</el-descriptions-item>
          <el-descriptions-item label="配送范围">{{ getDeliveryScopeLabel(detailData.delivery_scope) }}</el-descriptions-item>
          <el-descriptions-item label="所属乡镇">{{ detailData.town_name || detailData.rider_town || '--' }}</el-descriptions-item>
          <el-descriptions-item v-if="detailData.merchant_name" label="所属店铺">{{ detailData.merchant_name }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">{{ detailData.audit_status_text || getAuditStatusLabel(detailData.rider_audit_status) }}</el-descriptions-item>
          <el-descriptions-item label="审核人">{{ detailData.audited_by_name || '--' }}</el-descriptions-item>
          <el-descriptions-item v-if="detailData.reject_reason" label="驳回原因">{{ detailData.reject_reason }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(detailData.created_at) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <template v-if="Number(detailData?.rider_audit_status) === 0">
          <el-button type="success" :loading="actionLoading" @click="handleAudit(detailData, 'approve')">通过</el-button>
          <el-button type="danger" :loading="actionLoading" @click="handleAudit(detailData, 'reject')">拒绝</el-button>
        </template>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
// 这个文件是“总后台骑手管理页”。
// 这里把平台骑手和商家自配送员放到同一个页面里按角色切换，避免总后台菜单叫“骑手管理”，结果只能看自配送员。
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteDeliveryAgent, approveRider, fetchAdminRiders, fetchRiderDetail, rejectRider } from '../../api/riders'
import { getRequestErrorMessage } from '../../utils/http'

const route = useRoute()
const router = useRouter()

const DEFAULT_PAGE_SIZE = 10
const loading = ref(false)
const loadError = ref('')
const keyword = ref('')
const activeRole = ref('rider')
const list = ref([])
const pagination = reactive({
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref(null)
const detailTitle = ref('骑手详情')
const actionLoading = ref(false)

// 页面副标题跟着当前角色切换，告诉你这块到底在看哪一类配送账号。
const pageSubtitle = computed(() =>
  activeRole.value === 'rider'
    ? '这里看平台骑手，能对齐骑手端的县城骑手、乡镇骑手、乡镇站长资料。待审核账号仍在审核中心处理。'
    : '这里看绑定店铺的商家自配送员，只有这一类账号支持直接删除。',
)

function normalizeRole(value) {
  return value === 'merchant_delivery' ? 'merchant_delivery' : 'rider'
}

function normalizePage(value) {
  const page = Number.parseInt(value, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function getKeywordValue(value) {
  return String(value || '').trim()
}

function resolveTotal(payload, fallbackTotal = 0) {
  const total = Number(payload?.pagination?.total ?? payload?.total ?? fallbackTotal)
  return Number.isFinite(total) ? total : fallbackTotal
}

function syncStateFromRoute(query) {
  activeRole.value = normalizeRole(query.role)
  keyword.value = getKeywordValue(query.keyword)
  pagination.page = normalizePage(query.page)
}

function buildRouteQuery() {
  const nextQuery = {
    role: activeRole.value,
    page: String(pagination.page),
  }

  if (getKeywordValue(keyword.value)) {
    nextQuery.keyword = getKeywordValue(keyword.value)
  }

  return nextQuery
}

function isSameQuery(nextQuery) {
  const currentRole = normalizeRole(route.query.role)
  const currentKeyword = getKeywordValue(route.query.keyword)
  const currentPage = String(normalizePage(route.query.page))

  return (
    currentRole === normalizeRole(nextQuery.role) &&
    currentKeyword === getKeywordValue(nextQuery.keyword) &&
    currentPage === String(normalizePage(nextQuery.page))
  )
}

async function replaceRouteQuery(nextQuery) {
  if (isSameQuery(nextQuery)) {
    await loadList()
    return
  }

  await router.replace({
    path: route.path,
    query: nextQuery,
  })
}

// 列表只吃后端已经开放的 admin/rider 接口，所以这里按角色、关键词、分页来请求。
async function loadList() {
  loading.value = true
  loadError.value = ''

  try {
    const payload = await fetchAdminRiders({
      role: activeRole.value,
      keyword: getKeywordValue(keyword.value),
      page: pagination.page,
      limit: pagination.pageSize,
    })

    list.value = Array.isArray(payload?.list) ? payload.list : []
    pagination.total = resolveTotal(payload, list.value.length)
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '骑手列表加载失败')
    list.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

async function handleSearch() {
  pagination.page = 1
  await replaceRouteQuery(buildRouteQuery())
}

async function handleReset() {
  keyword.value = ''
  pagination.page = 1
  await replaceRouteQuery(buildRouteQuery())
}

async function handleRoleChange() {
  pagination.page = 1
  await replaceRouteQuery(buildRouteQuery())
}

async function handlePageChange(page) {
  pagination.page = page
  await replaceRouteQuery(buildRouteQuery())
}

async function handleDelete(row) {
  await ElMessageBox.confirm(
    `确认删除自配送员「${row.nickname || row.phone || row.id}」吗？删除后该账号将无法继续为店铺配送。`,
    '删除确认',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )

  await deleteDeliveryAgent(row.id)
  ElMessage.success('删除成功')

  if (list.value.length === 1 && pagination.page > 1) {
    pagination.page -= 1
    await replaceRouteQuery(buildRouteQuery())
    return
  }

  await loadList()
}

async function handleViewDetail(row) {
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detailData.value = null
  detailTitle.value = `骑手详情 · ${row.nickname || row.id}`

  try {
    detailData.value = await fetchRiderDetail(row.id)
  } catch (error) {
    detailError.value = getRequestErrorMessage(error, '骑手详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

async function handleAudit(row, action) {
  if (!row?.id) return

  const actionText = action === 'approve' ? '通过' : '拒绝'
  let payload = {}

  if (action === 'reject') {
    const promptResult = await ElMessageBox.prompt('请填写驳回原因', '拒绝骑手入驻', {
      confirmButtonText: '确认拒绝',
      cancelButtonText: '取消',
      inputPlaceholder: '驳回原因会展示给骑手',
      inputValidator: (val) => !!(val && String(val).trim()) || '请填写驳回原因',
    }).catch(() => null)

    if (!promptResult) return
    payload = { reject_reason: String(promptResult.value || '').trim() }
  } else {
    try {
      await ElMessageBox.confirm(`确认通过骑手「${row.nickname || row.id}」的入驻申请？`, '审核确认', {
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
      await approveRider(row.id)
    } else {
      await rejectRider(row.id, payload)
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

function getDeliveryScopeLabel(scope) {
  if (scope === 'county_delivery') return '县城配送'
  if (scope === 'town_delivery') return '乡镇配送'
  return scope || '--'
}

function getAuditStatusLabel(status) {
  if (Number(status) === 0) return '待审核'
  if (Number(status) === 1) return '已通过'
  if (Number(status) === 2) return '已拒绝'
  return '--'
}

function getAuditStatusTagType(status) {
  if (Number(status) === 1) return 'success'
  if (Number(status) === 2) return 'danger'
  return 'warning'
}

function formatTime(value) {
  if (!value) {
    return '--'
  }

  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

// 路由参数和页面状态保持同步，这样工作台跳过来时，就能直接落到正确的骑手视图。
watch(
  () => route.query,
  async (query) => {
    syncStateFromRoute(query)
    await loadList()
  },
  { immediate: true },
)
</script>

<style scoped>
.page-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-shell__title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-shell__subtitle {
  margin: 8px 0 0;
  color: #909399;
  font-size: 13px;
  line-height: 1.6;
}

.page-shell__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-shell__card {
  border-radius: 12px;
}

.page-shell__alert {
  margin-bottom: 16px;
}

.page-shell__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
