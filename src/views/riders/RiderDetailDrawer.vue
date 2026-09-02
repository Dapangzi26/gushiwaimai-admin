<!-- 骑手管理页的详情抽屉 + 页内通过/拒绝/删除。 -->
<!-- 父页 /riders 还在。列表「详情 / 更多」仍叫 handleViewDetail / handleRowCommand，这里干活。 -->
<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { approveRider, deleteDeliveryAgent, fetchRiderDetail, rejectRider } from '../../api/riders'
import { getRequestErrorMessage } from '../../utils/http'
import { getBackendOrigin } from '../../utils/backend-origin'
import { buildDetailEntries, RIDER_DETAIL_FIELD_ORDER } from '../../utils/detail-display'

const props = defineProps({
  reload: { type: Function, required: true },
  list: { type: Object, required: true },
  pagination: { type: Object, required: true },
  replaceRouteQuery: { type: Function, required: true },
  buildRouteQuery: { type: Function, required: true },
})

const BACKEND_ORIGIN = getBackendOrigin()

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref(null)
const detailTitle = ref('骑手详情')
const actionLoading = ref(false)

const detailEntries = computed(() => buildDetailEntries(detailData.value, {
  fieldOrder: RIDER_DETAIL_FIELD_ORDER,
  backendOrigin: BACKEND_ORIGIN,
}))

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
    await props.reload()
  } catch (error) {
    ElMessage.error(getRequestErrorMessage(error, `${actionText}失败`))
  } finally {
    actionLoading.value = false
  }
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

  if (props.list.length === 1 && props.pagination.page > 1) {
    props.pagination.page -= 1
    await props.replaceRouteQuery(props.buildRouteQuery())
    return
  }

  await props.reload()
}

function handleRowCommand(command, row) {
  if (command === 'approve') {
    handleAudit(row, 'approve')
    return
  }
  if (command === 'reject') {
    handleAudit(row, 'reject')
    return
  }
  if (command === 'delete') {
    handleDelete(row)
  }
}

defineExpose({
  handleViewDetail,
  handleAudit,
  handleDelete,
  handleRowCommand,
})
</script>

<template>
  <el-drawer v-model="detailVisible" :title="detailTitle" size="480px" destroy-on-close>
    <div v-loading="detailLoading">
      <el-alert v-if="detailError" :title="detailError" type="error" show-icon :closable="false" />
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
      <template v-if="Number(detailData?.rider_audit_status) === 0">
        <el-button type="success" :loading="actionLoading" @click="handleAudit(detailData, 'approve')">通过</el-button>
        <el-button type="danger" :loading="actionLoading" @click="handleAudit(detailData, 'reject')">拒绝</el-button>
      </template>
      <el-button @click="detailVisible = false">关闭</el-button>
    </template>
  </el-drawer>
</template>
