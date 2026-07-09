<!-- 这个页面是“总后台站长乡镇管理页”，基于骑手列表接口筛选乡镇站长，并按乡镇聚合展示管辖关系。 -->
<template>
  <div class="page-shell">
    <div class="page-shell__header">
      <div>
        <h1 class="page-shell__title">站长乡镇管理</h1>
        <p class="page-shell__subtitle">
          站长不是独立表，而是骑手账号的字段组合（乡镇配送 + 站长身份）。此处基于骑手列表聚合展示，完整 CRUD 需后端专用接口。
        </p>
      </div>
      <div class="page-shell__actions">
        <el-input
          v-model="keyword"
          placeholder="搜索站长昵称、手机号、乡镇名"
          clearable
          style="width: 260px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="page-shell__alert"
      title="数据来源说明"
      description="当前复用 /admin/rider 接口，在前端筛选 identity_type=乡镇站长 的账号。乡镇骑手归属、站长发薪等高级能力待后端 /admin/town-station 接口建设。"
    />

    <div class="town-stats">
      <el-card v-for="item in statCards" :key="item.key" class="town-stat-card" shadow="never">
        <div class="town-stat-card__label">{{ item.label }}</div>
        <div class="town-stat-card__value">{{ item.value }}</div>
      </el-card>
    </div>

    <el-card class="page-shell__card">
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

      <el-table :data="stationList" v-loading="loading" border empty-text="暂无站长数据">
        <el-table-column prop="id" label="站长ID" width="90" />
        <el-table-column prop="nickname" label="站长昵称" min-width="130" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="town_name" label="负责乡镇" min-width="140" show-overflow-tooltip />
        <el-table-column label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="Number(row.rider_audit_status) === 1 ? 'success' : 'warning'">
              {{ row.audit_status_text || '--' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="账号状态" width="100">
          <template #default="{ row }">
            <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'">
              {{ Number(row.status) === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下属乡镇骑手" width="120">
          <template #default="{ row }">
            {{ getTownRiderCount(row) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewDetail(row)">详情</el-button>
            <el-button type="primary" link @click="goRiders(row)">看本乡镇骑手</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="detailVisible" title="站长详情" size="480px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-descriptions v-if="detailData" :column="1" border>
          <el-descriptions-item label="站长ID">{{ detailData.id }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ detailData.nickname || '--' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detailData.phone || '--' }}</el-descriptions-item>
          <el-descriptions-item label="身份类型">{{ detailData.identity_type || '乡镇站长' }}</el-descriptions-item>
          <el-descriptions-item label="负责乡镇">{{ detailData.town_name || detailData.rider_town || '--' }}</el-descriptions-item>
          <el-descriptions-item label="乡镇编码">{{ detailData.town_code || '--' }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">{{ detailData.audit_status_text || '--' }}</el-descriptions-item>
          <el-descriptions-item label="审核人">{{ detailData.audited_by_name || '--' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(detailData.created_at) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
// 这个文件是“总后台站长乡镇管理页”逻辑。
// 拉取 role=rider 的全量骑手后，前端筛选乡镇站长并按乡镇名统计下属骑手数量。
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAdminRiders, fetchRiderDetail } from '../../api/riders'
import { getRequestErrorMessage } from '../../utils/http'

const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const keyword = ref('')
const allRiders = ref([])
const stationList = ref([])

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref(null)

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

function formatTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

function applyFilter() {
  const key = keyword.value.trim().toLowerCase()
  let stations = allRiders.value.filter(isStationMaster)

  if (key) {
    stations = stations.filter((item) => {
      const haystack = [
        item.nickname,
        item.phone,
        item.town_name,
        item.rider_town,
        item.town_code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(key)
    })
  }

  stationList.value = stations
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

async function loadAllRiders() {
  loading.value = true
  loadError.value = ''

  try {
    allRiders.value = await fetchAllRiderPages()
    applyFilter()
  } catch (error) {
    loadError.value = getRequestErrorMessage(error, '站长数据加载失败')
    allRiders.value = []
    stationList.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  applyFilter()
}

function handleReset() {
  keyword.value = ''
  applyFilter()
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
    query: { role: 'rider', keyword: town || undefined, page: '1' },
  })
}

onMounted(() => {
  loadAllRiders()
})
</script>

<style scoped>
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
