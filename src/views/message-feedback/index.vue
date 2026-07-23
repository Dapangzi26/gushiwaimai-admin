<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchFeedbackDetail, fetchFeedbackList, updateFeedbackStatus } from '../../api/feedback'
import { getRequestErrorMessage } from '../../utils/http'
import { normalizeSearchKeyword } from '../../utils/orderNo.js'
import { formatCompactTime } from '../../utils/detail-display'

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

const filterState = reactive({
  status: '',
  submitter_name: '',
  contact_phone: '',
  content: '',
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
    contact: item?.contact_phone || item?.contact || item?.submitter_phone || item?.phone || item?.mobile || '--',
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
    const result = await fetchFeedbackList({
      status: filterState.status || undefined,
      submitter_name: filterState.submitter_name.trim() || undefined,
      contact_phone: normalizeSearchKeyword(filterState.contact_phone) || undefined,
      content: filterState.content.trim() || undefined,
    })
    listState.items = resolveList(result).map((item) => normalizeRecord(item))
  } catch (error) {
    listState.error = getRequestErrorMessage(error, '投诉建议列表加载失败')
    listState.items = []
  } finally {
    listState.loading = false
  }
}

function handleFilterSearch() {
  loadFeedbackList()
}

function handleFilterReset() {
  filterState.status = ''
  filterState.submitter_name = ''
  filterState.contact_phone = ''
  filterState.content = ''
  loadFeedbackList()
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
      <div class="feedback-toolbar">
        <el-select v-model="filterState.status" placeholder="处理状态" clearable class="feedback-toolbar__status">
          <el-option v-for="item in STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-input
          v-model="filterState.submitter_name"
          placeholder="投诉人"
          clearable
          class="feedback-toolbar__input"
          @keyup.enter="handleFilterSearch"
        />
        <el-input
          v-model="filterState.contact_phone"
          placeholder="投诉人电话"
          clearable
          class="feedback-toolbar__input"
          @keyup.enter="handleFilterSearch"
        />
        <el-input
          v-model="filterState.content"
          placeholder="投诉内容"
          clearable
          class="feedback-toolbar__input feedback-toolbar__input--wide"
          @keyup.enter="handleFilterSearch"
        />
        <el-button type="primary" :loading="listState.loading" @click="handleFilterSearch">查询</el-button>
        <el-button @click="handleFilterReset">重置</el-button>
      </div>

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
        size="small"
        class="admin-table--compact feedback-table"
      >
        <el-table-column label="提交人" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="admin-table__stack">
              <div class="admin-table__main">{{ row.submitter_name || '--' }}</div>
              <div class="admin-table__sub">{{ row.contact || '--' }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="内容摘要" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ getContentSummary(row.content) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="提交时间" width="108">
          <template #default="{ row }">
            <span>{{ formatCompactTime(row.created_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="处理状态" width="88">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="72" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
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
            <el-descriptions-item label="投诉人">{{ currentItem.submitter_name || '--' }}</el-descriptions-item>
            <el-descriptions-item label="投诉人电话">{{ currentItem.contact || '--' }}</el-descriptions-item>
            <el-descriptions-item label="投诉内容">{{ currentItem.content || '--' }}</el-descriptions-item>
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

<style scoped>
.feedback-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.feedback-toolbar__status {
  width: 140px;
}

.feedback-toolbar__input {
  width: 140px;
}

.feedback-toolbar__input--wide {
  width: 200px;
}

.feedback-alert {
  margin-bottom: 12px;
}

.feedback-detail__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.feedback-detail__label {
  color: #606266;
  font-size: 14px;
}

.feedback-detail__select {
  width: 160px;
}
</style>
