<script setup>
// 商家管理页的详情抽屉 + 页内通过/拒绝。
// 父页 /merchants 还在。列表「详情 / 通过」仍叫 handleViewDetail / handleAudit，这里干活。
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { approveMerchant, fetchAdminMerchantDetail, rejectMerchant } from '../../api/merchant'
import { getRequestErrorMessage } from '../../utils/http'
import { getBackendOrigin } from '../../utils/backend-origin'
import { buildDetailEntries, MERCHANT_DETAIL_FIELD_ORDER } from '../../utils/detail-display'

const props = defineProps({
  reload: { type: Function, required: true },
})

const BACKEND_ORIGIN = getBackendOrigin()

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
    await props.reload()
  } catch (error) {
    ElMessage.error(getRequestErrorMessage(error, `${actionText}失败`))
  } finally {
    actionLoading.value = false
  }
}

defineExpose({
  handleViewDetail,
  handleAudit,
})
</script>

<template>
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
</template>
