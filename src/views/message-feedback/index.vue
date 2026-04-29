<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchFeedbackDetail, fetchFeedbackList, updateFeedbackStatus } from '../../api/feedback'
import { getRequestErrorMessage } from '../../utils/http'

const STATUS_OPTIONS = [
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已处理', value: 'resolved' },
]

const listState = reactive({
  loading: false,
  error: '',
  items: [],
})

const detailVisible = ref(false)
const currentItem = ref(null)
const detailLoading = ref(false)
const detailError = ref('')
const statusSaving = ref(false)
const currentStatus = ref('pending')
const tableData = computed(() => listState.items)

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

function normalizeRecord(item) {
  return {
    id: item?.id ?? '',
    submitter_name: item?.submitter_name || item?.nickname || item?.username || item?.name || '--',
    contact: item?.contact || item?.phone || item?.mobile || '--',
    content: item?.content || item?.description || '',
    created_at: item?.created_at || item?.submit_time || item?.createdAt || '',
    status: item?.status || 'pending',
  }
}

function getContentSummary(content) {
  const text = String(content || '').trim()
  if (!text) {
    return '--'
  }

  return text.length > 36 ? `${text.slice(0, 36)}...` : text
}

async function loadFeedbackList() {
  listState.loading = true
  listState.error = ''

  try {
    const result = await fetchFeedbackList()
    listState.items = resolveList(result).map((item) => normalizeRecord(item))
  } catch (error) {
    listState.error = getRequestErrorMessage(error, '投诉建议列表加载失败')
    listState.items = []
  } finally {
    listState.loading = false
  }
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status || '--'
}

function getStatusTagType(status) {
  if (status === 'processing') return 'warning'
  if (status === 'resolved') return 'success'
  return 'info'
}

function formatTime(value) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', { hour12: false })
}

async function handleView(row) {
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  currentItem.value = null

  try {
    const result = await fetchFeedbackDetail(row.id)
    currentItem.value = normalizeRecord(result)
    currentStatus.value = currentItem.value.status || 'pending'
  } catch (error) {
    detailError.value = getRequestErrorMessage(error, '投诉建议详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

async function handleStatusUpdate() {
  if (!currentItem.value?.id) {
    return
  }

  statusSaving.value = true

  try {
    await updateFeedbackStatus(currentItem.value.id, currentStatus.value)
    ElMessage.success('处理状态更新成功')
    detailVisible.value = false
    await loadFeedbackList()
  } finally {
    statusSaving.value = false
  }
}

onMounted(() => {
  loadFeedbackList()
})
</script>

<template>
  <div class="page-shell">
    <h1 class="page-shell__title">投诉建议</h1>

    <el-card class="page-shell__card feedback-page">
      <el-alert
        v-if="listState.error"
        :title="listState.error"
        type="error"
        show-icon
        :closable="false"
        class="feedback-alert"
      >
        <template #default>
          <el-button type="danger" link @click="loadFeedbackList">重新加载</el-button>
        </template>
      </el-alert>

      <el-table
        v-loading="listState.loading"
        :data="tableData"
        border
        class="feedback-table"
      >
        <el-table-column prop="submitter_name" label="提交人" min-width="120" />
        <el-table-column prop="contact" label="联系方式" min-width="160" />

        <el-table-column label="内容摘要" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ getContentSummary(row.content) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="提交时间" min-width="170">
          <template #default="{ row }">
            <span>{{ formatTime(row.created_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="处理状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看详情</el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty
            :description="listState.error ? '投诉建议列表加载失败' : '暂无投诉建议数据'"
            class="feedback-empty"
          />
        </template>
      </el-table>
    </el-card>

    <el-drawer v-model="detailVisible" title="投诉建议详情" size="520px">
      <div v-loading="detailLoading">
        <el-alert
          v-if="detailError"
          :title="detailError"
          type="error"
          show-icon
          :closable="false"
        />
        <template v-else-if="currentItem">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="提交人">{{ currentItem.submitter_name || '--' }}</el-descriptions-item>
            <el-descriptions-item label="联系方式">{{ currentItem.contact || '--' }}</el-descriptions-item>
            <el-descriptions-item label="用户提交内容">{{ currentItem.content || '--' }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ formatTime(currentItem.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="当前状态">
              <el-tag :type="getStatusTagType(currentStatus)">{{ getStatusLabel(currentStatus) }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <div class="feedback-detail__actions">
            <span class="feedback-detail__label">更新处理状态</span>
            <el-select v-model="currentStatus" class="feedback-detail__select">
              <el-option
                v-for="item in STATUS_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-button type="primary" :loading="statusSaving" @click="handleStatusUpdate">保存状态</el-button>
          </div>
        </template>
        <el-empty v-else description="暂无详情数据" />
      </div>
    </el-drawer>
  </div>
</template>
