<script setup>
// 站长乡镇管理页的详情抽屉。
// 父页 /town-stations 还在。列表「详情」仍叫 handleViewDetail。接口失败时用列表行当详情（现况）。
import { computed, ref } from 'vue'
import { fetchRiderDetail } from '../../api/riders'
import { getBackendOrigin } from '../../utils/backend-origin'
import { buildDetailEntries, RIDER_DETAIL_FIELD_ORDER } from '../../utils/detail-display'

const BACKEND_ORIGIN = getBackendOrigin()

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref(null)

const detailEntries = computed(() => buildDetailEntries(detailData.value, {
  fieldOrder: RIDER_DETAIL_FIELD_ORDER,
  backendOrigin: BACKEND_ORIGIN,
}))

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

defineExpose({
  handleViewDetail,
})
</script>

<template>
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
</template>
