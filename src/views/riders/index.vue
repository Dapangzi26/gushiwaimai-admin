<!-- 这个页面是“总后台骑手管理页”，用于统一查看平台骑手和商家自配送员，避免两个配送角色在总后台里割裂。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">骑手管理</h1>
        <p class="page-shell__subtitle">{{ pageSubtitle }}</p>
      </div>
    </div>

    <el-card class="page-shell__card">
      <el-tabs v-model="activeRole" @tab-change="handleRoleChange">
        <el-tab-pane label="平台骑手" name="rider" />
        <el-tab-pane label="商家自配送员" name="merchant_delivery" />
      </el-tabs>

      <el-form class="rider-toolbar" inline @submit.prevent="handleSearch">
        <el-form-item label="昵称">
          <el-input
            v-model="filters.nickname"
            placeholder="请输入昵称"
            clearable
            style="width: 160px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input
            v-model="filters.phone"
            placeholder="请输入手机号"
            clearable
            style="width: 160px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item v-if="activeRole === 'rider'" label="乡镇名">
          <el-input
            v-model="filters.townName"
            placeholder="请输入乡镇名"
            clearable
            style="width: 160px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item v-else label="店铺名">
          <el-input
            v-model="filters.merchantName"
            placeholder="请输入店铺名"
            clearable
            style="width: 160px"
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
        v-if="onlineStatus === 'offline'"
        type="info"
        show-icon
        :closable="false"
        class="page-shell__alert"
        title="离线骑手筛选"
        description="已按 online_status=offline 过滤（已通过审核且当前不在线的骑手）。"
      />

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

      <el-table :data="list" v-loading="loading" border size="small" class="admin-table--compact" empty-text="暂无骑手数据">
        <el-table-column label="骑手" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="admin-table__stack">
              <div class="admin-table__main">{{ row.nickname || '--' }}</div>
              <div class="admin-table__sub">{{ row.phone || '--' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="身份/范围" min-width="120">
          <template #default="{ row }">
            <div class="admin-table__inline">
              <el-tag :type="row.role === 'merchant_delivery' ? 'warning' : 'primary'" size="small">
                {{ getIdentityTypeLabel(row.identity_type) }}
              </el-tag>
              <span class="admin-table__sub">{{ getDeliveryScopeLabel(row.delivery_scope) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="乡镇" min-width="88" show-overflow-tooltip>
          <template #default="{ row }">{{ row.town_name || row.rider_town || '--' }}</template>
        </el-table-column>
        <el-table-column
          v-if="activeRole === 'merchant_delivery'"
          label="所属店铺"
          min-width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div class="admin-table__stack">
              <div class="admin-table__main">{{ row.merchant_name || '--' }}</div>
              <div class="admin-table__sub">ID {{ row.merchant_binding_code || '--' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <div class="admin-table__inline">
              <el-tag :type="getAuditStatusTagType(row.rider_audit_status)" size="small">
                {{ row.audit_status_text || getAuditStatusLabel(row.rider_audit_status) }}
              </el-tag>
              <span class="admin-table__sub">{{ Number(row.status) === 1 ? '正常' : '禁用' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="108">
          <template #default="{ row }">{{ formatCompactTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="88" align="center">
          <template #default="{ row }">
            <div class="admin-actions--compact">
              <el-button type="primary" link size="small" @click="handleViewDetail(row)">详情</el-button>
              <el-dropdown trigger="click" @command="(command) => handleRowCommand(command, row)">
                <el-button link size="small">更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-if="Number(row.rider_audit_status) === 0"
                      command="approve"
                    >
                      通过
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="Number(row.rider_audit_status) === 0"
                      command="reject"
                    >
                      拒绝
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="activeRole === 'merchant_delivery'"
                      command="delete"
                    >
                      删除
                    </el-dropdown-item>
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
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <RiderDetailDrawer
      ref="detailDrawerRef"
      :reload="loadList"
      :list="list"
      :pagination="pagination"
      :replace-route-query="replaceRouteQuery"
      :build-route-query="buildRouteQuery"
    />
  </div>
</template>

<script setup>
// 这个文件是“总后台骑手管理页”。
// 这里把平台骑手和商家自配送员放到同一个页面里按角色切换，避免总后台菜单叫“骑手管理”，结果只能看自配送员。
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchAdminRiders } from '../../api/riders'
import { getRequestErrorMessage } from '../../utils/http'
import { normalizeSearchKeyword } from '../../utils/orderNo.js'
import {
  formatCompactTime,
  getDeliveryScopeLabel,
  getAuditStatusLabel,
  getIdentityTypeLabel,
} from '../../utils/detail-display'
import { createRiderRouteQuery } from './lib/rider-route-query.js'
import RiderDetailDrawer from './RiderDetailDrawer.vue'

const route = useRoute()
const router = useRouter()

const DEFAULT_PAGE_SIZE = 10
const loading = ref(false)
const loadError = ref('')
const filters = reactive({
  nickname: '',
  phone: '',
  townName: '',
  merchantName: '',
})
const onlineStatus = ref('')
const activeRole = ref('rider')
const list = ref([])
const pagination = reactive({
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
})
const detailDrawerRef = ref(null)

// 页面副标题跟着当前角色切换，告诉你这块到底在看哪一类配送账号。
const pageSubtitle = computed(() =>
  activeRole.value === 'rider'
    ? '这里看平台骑手，能对齐骑手端的县城骑手、乡镇骑手、乡镇站长资料。待审核账号仍在审核中心处理。'
    : '这里看绑定店铺的商家自配送员，只有这一类账号支持直接删除。',
)

function resolveTotal(payload, fallbackTotal = 0) {
  const total = Number(payload?.pagination?.total ?? payload?.total ?? fallbackTotal)
  return Number.isFinite(total) ? total : fallbackTotal
}

function buildSearchParams() {
  const params = {
    role: activeRole.value,
    page: pagination.page,
    limit: pagination.pageSize,
    online_status: onlineStatus.value || undefined,
  }

  const nickname = filters.nickname.trim()
  const phone = normalizeSearchKeyword(filters.phone)
  const townName = filters.townName.trim()
  const merchantName = filters.merchantName.trim()

  if (nickname) params.nickname = nickname
  if (phone) params.phone = phone
  if (activeRole.value === 'rider') {
    if (townName) params.town_name = townName
  } else if (merchantName) {
    params.merchant_name = merchantName
  }

  return params
}

// 列表只吃后端已经开放的 admin/rider 接口，所以这里按角色、关键词、分页来请求。
async function loadList() {
  loading.value = true
  loadError.value = ''

  try {
    const payload = await fetchAdminRiders(buildSearchParams())

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

const {
  syncStateFromRoute,
  buildRouteQuery,
  replaceRouteQuery,
} = createRiderRouteQuery({
  activeRole,
  filters,
  onlineStatus,
  pagination,
  route,
  router,
  loadList,
})

async function handleSearch() {
  pagination.page = 1
  await replaceRouteQuery(buildRouteQuery())
}

async function handleReset() {
  filters.nickname = ''
  filters.phone = ''
  filters.townName = ''
  filters.merchantName = ''
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

function handleViewDetail(row) {
  detailDrawerRef.value.handleViewDetail(row)
}

function handleAudit(row, action) {
  detailDrawerRef.value.handleAudit(row, action)
}

function handleDelete(row) {
  detailDrawerRef.value.handleDelete(row)
}

function handleRowCommand(command, row) {
  detailDrawerRef.value.handleRowCommand(command, row)
}

function getAuditStatusTagType(status) {
  if (Number(status) === 1) return 'success'
  if (Number(status) === 2) return 'danger'
  return 'warning'
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
  gap: 12px;
}

.rider-toolbar {
  margin-bottom: 16px;
}
</style>
