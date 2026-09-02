<script setup>
// 这个文件是“总后台审核中心”。
// 这里同时承接商家审核和骑手审核，并且支持从工作台按 query 直接跳到对应审核页签。
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveMerchant,
  approveRider,
  fetchMerchantDetail,
  fetchRiderDetail,
  rejectMerchant,
  rejectRider,
} from '../../api/review'
import MerchantReviewPanel from './MerchantReviewPanel.vue'
import RiderReviewPanel from './RiderReviewPanel.vue'
import OrderReviewTab from './OrderReviewTab.vue'
import { getBackendOrigin } from '../../utils/backend-origin'
import {
  buildDetailEntry,
  COMMON_HIDDEN_FIELDS,
  MERCHANT_DETAIL_FIELD_ORDER,
  RIDER_DETAIL_FIELD_ORDER,
} from '../../utils/detail-display'

const route = useRoute()
const router = useRouter()

const activeTab = ref('merchant')
const merchantPanelRef = ref(null)
const riderPanelRef = ref(null)
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

function normalizeReviewTab(value) {
  if (value === 'order-review') return 'order-review'
  return value === 'rider' ? 'rider' : 'merchant'
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

      await merchantPanelRef.value.loadMerchantList()
    } else {
      if (action === 'approve') {
        await approveRider(row.id)
      } else {
        await rejectRider(row.id, payload)
      }

      await riderPanelRef.value.loadRiderList()
    }

    ElMessage.success(`审核${actionText}成功`)
  } finally {
    actionLoading.value = false
  }
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
</script>

<template>
  <div class="page-shell">
    <h1 class="page-shell__title">审核中心</h1>

    <el-card class="page-shell__card review-page">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="商家审核" name="merchant" />
        <el-tab-pane label="骑手审核" name="rider" />
        <el-tab-pane label="评价审核" name="order-review" />
      </el-tabs>

      <OrderReviewTab v-if="activeTab === 'order-review'" />

      <MerchantReviewPanel
        v-show="activeTab === 'merchant'"
        ref="merchantPanelRef"
        :action-loading="actionLoading"
        @view="handleView"
        @row-command="handleRowCommand"
      />

      <RiderReviewPanel
        v-show="activeTab === 'rider'"
        ref="riderPanelRef"
        :action-loading="actionLoading"
        @view="handleView"
        @row-command="handleRowCommand"
      />
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
