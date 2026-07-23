<!-- 这个页面是“总后台站长乡镇管理页”，基于骑手列表接口筛选乡镇站长，并按乡镇聚合展示管辖关系。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">站长乡镇管理</h1>
        <p class="page-shell__subtitle">
          站长是骑手账号的字段组合（乡镇配送 + 站长身份）。搜索与分页由 GET /admin/town-stations 服务端处理。
        </p>
      </div>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="page-shell__alert"
      title="数据来源说明"
      :description="dataSource === 'api'
        ? '数据来自 GET /admin/town-stations 专用接口。'
        : '后端 /admin/town-stations 尚未就绪，当前复用 /admin/rider 在前端筛选乡镇站长。'"
    />

    <div class="town-stats">
      <el-card v-for="item in statCards" :key="item.key" class="town-stat-card" shadow="never">
        <div class="town-stat-card__label">{{ item.label }}</div>
        <div class="town-stat-card__value">{{ item.value }}</div>
      </el-card>
    </div>

    <el-card class="page-shell__card">
      <el-form class="town-station-toolbar" inline @submit.prevent="handleSearch">
        <el-form-item label="站长昵称">
          <el-input
            v-model="filters.nickname"
            placeholder="请输入站长昵称"
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
          <el-button type="danger" link @click="loadAllRiders">重新加载</el-button>
        </template>
      </el-alert>

      <el-table :data="stationList" v-loading="loading" border size="small" class="admin-table--compact" empty-text="暂无站长数据">
        <el-table-column label="站长" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="admin-table__stack">
              <div class="admin-table__main">{{ row.nickname || '--' }}</div>
              <div class="admin-table__sub">{{ row.phone || '--' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="负责乡镇" min-width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.town_name || row.rider_town || '--' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <div class="admin-table__inline">
              <el-tag :type="Number(row.rider_audit_status) === 1 ? 'success' : 'warning'" size="small">
                {{ row.audit_status_text || '--' }}
              </el-tag>
              <span class="admin-table__sub">{{ Number(row.status) === 1 ? '正常' : '禁用' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="下属骑手" width="80" align="center">
          <template #default="{ row }">{{ getTownRiderCount(row) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="108">
          <template #default="{ row }">{{ formatCompactTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <div class="admin-actions--compact">
              <el-button type="primary" link size="small" @click="handleViewDetail(row)">详情</el-button>
              <el-button type="primary" link size="small" @click="goRiders(row)">骑手</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="dataSource === 'api'" class="page-shell__pagination">
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

    <el-drawer v-model="detailVisible" title="站长详情" size="480px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-descriptions v-if="detailData" :column="1" border>
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

<script setup>
// 这个文件是“总后台站长乡镇管理页”逻辑。
// 站长乡镇管理：优先 GET /admin/town-stations；404 时从骑手列表前端筛选兜底。
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchTownStations, isTownStationsApiUnavailable } from '../../api/town-stations'
import { fetchAdminRiders, fetchRiderDetail } from '../../api/riders'
import { getRequestErrorMessage } from '../../utils/http'
import { buildDetailEntries, formatCompactTime, RIDER_DETAIL_FIELD_ORDER } from '../../utils/detail-display'
import { getBackendOrigin } from '../../utils/backend-origin'
import { matchesLocalSearchKeyword, normalizeSearchKeyword } from '../../utils/orderNo.js'
import { resolveList, resolveTotal } from '../../utils/list'

const router = useRouter()
const route = useRoute()

const BACKEND_ORIGIN = getBackendOrigin()

const DEFAULT_PAGE_SIZE = 10
const loading = ref(false)
const loadError = ref('')
const filters = reactive({
  nickname: '',
  phone: '',
  townName: '',
})
const allRiders = ref([])
const stationList = ref([])
const dataSource = ref('fallback')
const pagination = reactive({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref(null)

const detailEntries = computed(() => buildDetailEntries(detailData.value, {
  fieldOrder: RIDER_DETAIL_FIELD_ORDER,
  backendOrigin: BACKEND_ORIGIN,
}))

const statCards = computed(() => {
  const towns = new Set(stationList.value.map((item) => item.town_name || item.rider_town).filter(Boolean))
  const townRiders = allRiders.value.filter(
    (item) =>
      item.delivery_scope === 'town_delivery' &&
      item.rider_kind !== 'stationmaster' &&
      item.rider_level !== 'captain' &&
      item.identity_type !== '乡镇站长',
  )

  return [
    { key: 'stations', label: '乡镇站长数', value: stationList.value.length },
    { key: 'towns', label: '覆盖乡镇数', value: towns.size },
    { key: 'town_riders', label: '乡镇骑手总数', value: townRiders.length },
  ]
})

function isStationMaster(row) {
  return (
    row?.rider_kind === 'stationmaster' ||
    row?.rider_level === 'captain' ||
    row?.identity_type === '乡镇站长'
  )
}

function normalizeTownName(row) {
  return String(row?.town_name || row?.rider_town || '').trim()
}

function getTownRiderCount(stationRow) {
  const town = normalizeTownName(stationRow)
  if (!town) return 0

  return allRiders.value.filter((item) => {
    if (isStationMaster(item)) return false
    if (item.delivery_scope !== 'town_delivery') return false
    return normalizeTownName(item) === town
  }).length
}

function applyFilter() {
  let stations = allRiders.value.filter(isStationMaster)

  const nickname = filters.nickname.trim()
  const phone = filters.phone.trim()
  const townName = filters.townName.trim()

  if (nickname) {
    stations = stations.filter((item) => matchesLocalSearchKeyword(nickname, [item.nickname]))
  }

  if (phone) {
    stations = stations.filter((item) => matchesLocalSearchKeyword(phone, [item.phone]))
  }

  if (townName) {
    stations = stations.filter((item) =>
      matchesLocalSearchKeyword(townName, [item.town_name, item.rider_town, item.town_code]),
    )
  }

  stationList.value = stations
  pagination.total = stations.length
}

function buildSearchParams() {
  const params = {
    page: pagination.page,
    limit: pagination.pageSize,
  }

  const nickname = filters.nickname.trim()
  const phone = normalizeSearchKeyword(filters.phone)
  const townName = filters.townName.trim()

  if (nickname) params.nickname = nickname
  if (phone) params.phone = phone
  if (townName) params.town_name = townName

  return params
}

function syncRouteQuery() {
  const query = {
    page: String(pagination.page),
  }

  const nickname = filters.nickname.trim()
  const phone = normalizeSearchKeyword(filters.phone)
  const townName = filters.townName.trim()

  if (nickname) query.nickname = nickname
  if (phone) query.phone = phone
  if (townName) query.town_name = townName

  router.replace({ query })
}

function initFromRoute() {
  filters.nickname = String(route.query.nickname || '').trim()
  filters.phone = String(route.query.phone || '').trim()
  filters.townName = String(route.query.town_name || route.query.town || '').trim()
  pagination.page = Math.max(parseInt(route.query.page, 10) || 1, 1)
}

async function fetchAllRiderPages() {
  const merged = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const result = await fetchAdminRiders({ role: 'rider', page, limit: 50 })
    const batch = Array.isArray(result?.list) ? result.list : []
    merged.push(...batch)

    totalPages = result?.pagination?.total_pages || 1
    page += 1

    if (batch.length === 0) break
  }

  return merged
}

async function loadAllRidersFallback(forceRefresh = false) {
  if (forceRefresh || !allRiders.value.length) {
    allRiders.value = await fetchAllRiderPages()
  }
  dataSource.value = 'fallback'
  applyFilter()
}

async function loadStations(forceRefreshFallback = false) {
  loading.value = true
  loadError.value = ''

  try {
    const result = await fetchTownStations(buildSearchParams())
    const stations = resolveList(result)
    stationList.value = stations
    allRiders.value = Array.isArray(result?.riders) ? result.riders : stations
    pagination.total = resolveTotal(result, stations.length)
    dataSource.value = 'api'
  } catch (error) {
    if (isTownStationsApiUnavailable(error)) {
      try {
        await loadAllRidersFallback(forceRefreshFallback)
        return
      } catch (fallbackError) {
        loadError.value = getRequestErrorMessage(fallbackError, '站长数据加载失败')
        allRiders.value = []
        stationList.value = []
        pagination.total = 0
        return
      }
    }

    loadError.value = getRequestErrorMessage(error, '站长数据加载失败')
    allRiders.value = []
    stationList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

async function loadAllRiders() {
  await loadStations(true)
}

function handleSearch() {
  pagination.page = 1
  syncRouteQuery()
}

function handleReset() {
  filters.nickname = ''
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
  detailData.value = null

  try {
    detailData.value = await fetchRiderDetail(row.id)
  } catch {
    detailData.value = row
  } finally {
    detailLoading.value = false
  }
}

function goRiders(row) {
  const town = normalizeTownName(row)
  router.push({
    path: '/riders',
    query: {
      role: 'rider',
      town_name: town || undefined,
      page: '1',
    },
  })
}

watch(
  () => route.query,
  async () => {
    initFromRoute()
    await loadStations()
  },
  { immediate: true },
)
</script>

<style scoped>
.town-station-toolbar {
  margin-bottom: 16px;
}

.town-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.town-stat-card__label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}

.town-stat-card__value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}
</style>
