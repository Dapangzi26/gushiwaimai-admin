<script setup>
// 这个文件是“总后台审核中心”。
// 这里同时承接商家审核和骑手审核，并且支持从工作台按 query 直接跳到对应审核页签。
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveMerchant,
  approveRider,
  fetchMerchantDetail,
  fetchPendingMerchants,
  fetchPendingRiders,
  fetchRiderDetail,
  rejectMerchant,
  rejectRider,
} from '../../api/review'

const route = useRoute()
const router = useRouter()

const activeTab = ref('merchant')
const detailVisible = ref(false)
const detailLoading = ref(false)
const actionLoading = ref(false)
const detailTitle = ref('审核详情')
const detailData = ref(null)
const detailType = ref('merchant')

const BACKEND_ORIGIN = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')

const DETAIL_LABEL_MAP = {
  id: 'ID',
  store_name: '店铺名称',
  merchant_nickname: '商家昵称',
  nickname: '昵称',
  name: '名称',
  phone: '手机号',
  mobile: '手机号',
  town_code: '乡镇编码',
  town_name: '所属乡镇',
  address: '地址',
  description: '简介',
  category: '分类',
  business_scope: '业务线',
  business_license: '营业执照',
  logo: '店铺 Logo',
  cover: '店铺封面',
  avatar: '头像',
  audit_status: '审核状态',
  audit_status_text: '审核状态',
  status: '账号状态',
  created_at: '提交时间',
  updated_at: '更新时间',
  apply_time: '申请时间',
  audited_by_role: '审核角色',
  audited_by_user_id: '审核人ID',
  audited_by_name: '审核人',
  audited_at: '审核时间',
  reject_reason: '驳回原因',
  identity_type: '身份类型',
  rider_kind: '骑手类型',
  rider_level: '骑手等级',
  delivery_scope: '配送范围',
  id_card_front: '身份证人像面',
  id_card_back: '身份证国徽面',
  id_card_hold: '手持身份证',
  health_certificate: '健康证',
  driving_license: '驾驶证',
  vehicle_license: '行驶证',
  user: '关联账号',
}

const IMAGE_FIELDS = new Set([
  'business_license',
  'logo',
  'cover',
  'avatar',
  'id_card_front',
  'id_card_back',
  'id_card_hold',
  'health_certificate',
  'driving_license',
  'vehicle_license',
])

const DETAIL_FIELD_ORDER = {
  merchant: [
    'id',
    'store_name',
    'merchant_nickname',
    'phone',
    'business_scope',
    'town_name',
    'address',
    'category',
    'description',
    'business_license',
    'logo',
    'cover',
    'audit_status',
    'audited_by_role',
    'audited_by_name',
    'audited_at',
    'reject_reason',
    'status',
    'created_at',
    'updated_at',
    'user',
  ],
  rider: [
    'id',
    'nickname',
    'phone',
    'town_name',
    'identity_type',
    'address',
    'rider_kind',
    'rider_level',
    'delivery_scope',
    'avatar',
    'id_card_front',
    'id_card_back',
    'id_card_hold',
    'health_certificate',
    'driving_license',
    'vehicle_license',
    'audit_status',
    'audited_by_role',
    'audited_by_name',
    'audited_at',
    'reject_reason',
    'status',
    'created_at',
    'updated_at',
    'user',
  ],
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
  pagination: { page: 1, pageSize: 10, total: 0 },
})

const currentState = computed(() => (activeTab.value === 'merchant' ? merchantState : riderState))

const currentColumns = computed(() =>
  activeTab.value === 'merchant'
    ? [
        { key: 'id', label: 'ID', width: 90 },
        { key: 'name', label: '名称' },
        { key: 'phone', label: '手机号' },
        { key: 'town', label: '所属乡镇' },
        { key: 'submittedAt', label: '提交时间' },
        { key: 'statusText', label: '当前审核状态' },
      ]
    : [
        { key: 'id', label: 'ID', width: 90 },
        { key: 'nickname', label: '昵称' },
        { key: 'phone', label: '手机号' },
        { key: 'identityType', label: '身份类型' },
        { key: 'town', label: '所属乡镇' },
        { key: 'submittedAt', label: '提交时间' },
        { key: 'statusText', label: '当前审核状态' },
      ],
)

const detailEntries = computed(() => {
  if (!detailData.value || detailData.value.errorMessage) {
    return []
  }

  const schema = DETAIL_FIELD_ORDER[detailType.value] || []
  const matchedEntries = schema
    .filter((key) => key in detailData.value)
    .map((key) => createDetailEntry(key, detailData.value[key]))

  const remainingEntries = Object.entries(detailData.value)
    .filter(([key]) => !schema.includes(key))
    .map(([key, value]) => createDetailEntry(key, value))

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
    identityType: record?.identity_type || '--',
    submittedAt: record?.submitted_at || record?.created_at || record?.apply_time || '--',
    statusText: record?.status_text || record?.audit_status_text || record?.status || '待审核',
    type,
  }
}

function createDetailEntry(key, value) {
  const normalizedValue = normalizeDetailValue(key, value)

  return {
    key,
    label: DETAIL_LABEL_MAP[key] || key,
    isImage: IMAGE_FIELDS.has(key) && Boolean(buildAssetUrl(value)),
    imageUrl: buildAssetUrl(value),
    value: normalizedValue,
  }
}

function normalizeDetailValue(key, value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  if (key === 'audit_status') {
    return getAuditStatusLabel(value)
  }

  if (key === 'status') {
    return getAccountStatusLabel(value)
  }

  if (key === 'business_scope') {
    return getBusinessScopeLabel(value)
  }

  if (key === 'rider_kind') {
    return getRiderKindLabel(value)
  }

  if (key === 'delivery_scope') {
    return getDeliveryScopeLabel(value)
  }

  if (key === 'created_at' || key === 'updated_at' || key === 'apply_time') {
    return formatTime(value)
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return value
}

function buildAssetUrl(value) {
  if (!value || typeof value !== 'string') {
    return ''
  }

  if (/^https?:\/\//.test(value)) {
    return value
  }

  if (!BACKEND_ORIGIN) {
    return value
  }

  return `${BACKEND_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`
}

function formatTime(value) {
  if (!value) {
    return '--'
  }

  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function getAuditStatusLabel(status) {
  if (Number(status) === 0) return '待审核'
  if (Number(status) === 1) return '已通过'
  if (Number(status) === 2) return '已拒绝'
  return String(status)
}

function getAccountStatusLabel(status) {
  if (Number(status) === 1) return '正常'
  if (Number(status) === 0) return '禁用'
  return String(status)
}

function getBusinessScopeLabel(scope) {
  if (scope === 'county_food') return '县城'
  if (scope === 'town_food') return '乡镇'
  return scope || '--'
}

function getDeliveryScopeLabel(scope) {
  if (scope === 'county_delivery') return '县城配送'
  if (scope === 'town_delivery') return '乡镇配送'
  return scope || '--'
}

function getRiderKindLabel(riderKind) {
  if (riderKind === 'stationmaster') return '乡镇站长'
  if (riderKind === 'rider') return '普通骑手'
  return riderKind || '--'
}

async function loadMerchantList() {
  merchantState.loading = true
  merchantState.error = ''

  try {
    const result = await fetchPendingMerchants({
      status: merchantState.status,
      page: merchantState.pagination.page,
      page_size: merchantState.pagination.pageSize,
    })
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
    const result = await fetchPendingRiders({
      page: riderState.pagination.page,
      limit: riderState.pagination.pageSize,
    })
    riderState.list = resolveList(result).map((item) => normalizeRecord(item, 'rider'))
    riderState.pagination.total = result?.pagination?.total ?? 0
  } catch (error) {
    riderState.error = error?.response?.data?.message || error?.message || '骑手待审核列表加载失败'
    riderState.list = []
    riderState.pagination.total = 0
  } finally {
    riderState.loading = false
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

function handleRiderPageChange(page) {
  riderState.pagination.page = page
  loadRiderList()
}

function canAuditRow(row) {
  if (row.type === 'merchant') {
    return merchantState.status === 'pending'
  }
  return true
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
      >
        <el-table-column
          v-for="column in currentColumns"
          :key="column.key"
          :prop="column.key"
          :label="column.label"
          :width="column.width"
          min-width="140"
          show-overflow-tooltip
        />

        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="review-page__actions">
              <el-button link type="primary" @click="handleView(row)">查看</el-button>
              <template v-if="canAuditRow(row)">
                <el-button link type="success" @click="handleAudit(row, 'approve')">通过</el-button>
                <el-button link type="danger" @click="handleAudit(row, 'reject')">拒绝</el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="page-shell__pagination">
        <el-pagination
          v-if="activeTab === 'merchant'"
          background
          layout="total, prev, pager, next"
          :current-page="merchantState.pagination.page"
          :page-size="merchantState.pagination.pageSize"
          :total="merchantState.pagination.total"
          @current-change="handleMerchantPageChange"
        />
        <el-pagination
          v-else
          background
          layout="total, prev, pager, next"
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
            <pre v-else-if="typeof item.value === 'string' && item.value.startsWith('{')" class="review-detail__json">{{ item.value }}</pre>
            <span v-else>{{ item.value }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>
