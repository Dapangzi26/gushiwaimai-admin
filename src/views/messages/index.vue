<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRequestErrorMessage } from '../../utils/http'
import {
  deleteNotification,
  fetchNotifications,
  offlineNotification,
  publishNotification,
  toggleNotificationPin,
} from '../../api/notification'
import { normalizeSearchKeyword } from '../../utils/orderNo.js'
import { formatCompactTime } from '../../utils/detail-display'
import NotificationEditDrawer from './NotificationEditDrawer.vue'

const ROLE_OPTIONS = [
  { label: '全部角色', value: 'all' },
  { label: '用户', value: 'user' },
  { label: '商家', value: 'merchant' },
  { label: '骑手', value: 'rider' },
]

const FILTER_ROLE_OPTIONS = [
  { label: '全部', value: '' },
  ...ROLE_OPTIONS,
]

const STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已下线', value: 'offline' },
]

const FILTER_STATUS_OPTIONS = [
  { label: '全部状态', value: '' },
  ...STATUS_OPTIONS,
]

const filters = reactive({
  status: '',
  target_role: '',
  keyword: '',
})

const listState = reactive({
  loading: false,
  error: '',
  items: [],
})

const dialogVisible = ref(false)
const dialogMode = ref('create')
const actionLoadingId = ref(null)
const editingId = ref(null)
const editingRow = ref(null)

const hasActiveFilters = computed(() => Boolean(filters.status || filters.target_role || filters.keyword.trim()))
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
    title: item?.title || '--',
    content: item?.content || '',
    target_role: item?.target_role || 'all',
    status: item?.status || 'draft',
    is_pinned: Boolean(item?.is_pinned),
    published_at: item?.published_at || '',
    created_at: item?.created_at || '',
    updated_at: item?.updated_at || '',
  }
}

function getQueryParams() {
  const params = {}

  if (filters.status) {
    params.status = filters.status
  }

  if (filters.target_role) {
    params.target_role = filters.target_role
  }

  const keyword = normalizeSearchKeyword(filters.keyword)
  if (keyword) {
    params.keyword = keyword
  }

  return params
}

async function loadNotifications() {
  listState.loading = true
  listState.error = ''

  try {
    const result = await fetchNotifications(getQueryParams())
    listState.items = resolveList(result).map((item) => normalizeRecord(item))
  } catch (error) {
    listState.error = getRequestErrorMessage(error, '系统通知列表加载失败')
    listState.items = []
  } finally {
    listState.loading = false
  }
}

function handleSearch() {
  loadNotifications()
}

function handleReset() {
  filters.status = ''
  filters.target_role = ''
  filters.keyword = ''
  loadNotifications()
}

function openCreateDialog() {
  dialogMode.value = 'create'
  editingId.value = null
  editingRow.value = null
  dialogVisible.value = true
}

function openEditDialog(row) {
  dialogMode.value = 'edit'
  editingId.value = row.id
  editingRow.value = row
  dialogVisible.value = true
}

async function handlePublish(row) {
  await ElMessageBox.confirm(`确认发布通知“${row.title}”吗？`, '发布确认', {
    type: 'warning',
  })

  actionLoadingId.value = row.id

  try {
    await publishNotification(row.id)
    ElMessage.success('通知已发布')
    await loadNotifications()
  } finally {
    actionLoadingId.value = null
  }
}

async function handleOffline(row) {
  await ElMessageBox.confirm(`确认下线通知“${row.title}”吗？`, '下线确认', {
    type: 'warning',
  })

  actionLoadingId.value = row.id

  try {
    await offlineNotification(row.id)
    ElMessage.success('通知已下线')
    await loadNotifications()
  } finally {
    actionLoadingId.value = null
  }
}

async function handleTogglePin(row) {
  const nextPinned = !row.is_pinned
  const actionText = nextPinned ? '置顶' : '取消置顶'

  actionLoadingId.value = row.id

  try {
    await toggleNotificationPin(row.id, nextPinned)
    ElMessage.success(`${actionText}成功`)
    await loadNotifications()
  } finally {
    actionLoadingId.value = null
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除系统通知“${row.title}”吗？删除后不可恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      },
    )
  } catch (error) {
    return
  }

  actionLoadingId.value = row.id

  try {
    await deleteNotification(row.id)
    ElMessage.success('系统通知删除成功')
    await loadNotifications()
  } finally {
    actionLoadingId.value = null
  }
}

function handleNotificationCommand(command, row) {
  if (command === 'edit') {
    openEditDialog(row)
    return
  }
  if (command === 'publish') {
    handlePublish(row)
    return
  }
  if (command === 'offline') {
    handleOffline(row)
    return
  }
  if (command === 'pin') {
    handleTogglePin(row)
    return
  }
  if (command === 'delete') {
    handleDelete(row)
  }
}

function getStatusTagType(status) {
  if (status === 'published') return 'success'
  if (status === 'offline') return 'info'
  return 'warning'
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status || '--'
}

function getRoleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || role || '--'
}

onMounted(() => {
  loadNotifications()
})
</script>

<template>
  <div class="page-shell">
    <h1 class="page-shell__title">系统通知</h1>

    <el-card class="page-shell__card notification-page">
      <div class="notification-toolbar">
        <el-form :inline="true" class="notification-filters" @submit.prevent>
          <el-form-item label="状态">
            <el-select v-model="filters.status" placeholder="全部状态" clearable class="notification-filter__select">
              <el-option
                v-for="item in FILTER_STATUS_OPTIONS"
                :key="item.value || 'all-status'"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="目标角色">
            <el-select v-model="filters.target_role" placeholder="全部角色" clearable class="notification-filter__select">
              <el-option
                v-for="item in FILTER_ROLE_OPTIONS"
                :key="item.value || 'all-role'"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="标题搜索">
            <el-input
              v-model="filters.keyword"
              placeholder="请输入标题关键词"
              clearable
              class="notification-filter__keyword"
              @keyup.enter="handleSearch"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>

        <el-button type="primary" @click="openCreateDialog">新建系统通知</el-button>
      </div>

      <el-alert
        v-if="listState.error"
        :title="listState.error"
        type="error"
        show-icon
        :closable="false"
        class="notification-alert"
      >
        <template #default>
          <el-button type="danger" link @click="loadNotifications">重新加载</el-button>
        </template>
      </el-alert>

      <el-table
        v-if="tableData.length"
        v-loading="listState.loading"
        :data="tableData"
        border
        size="small"
        class="admin-table--compact notification-table"
      >
        <el-table-column label="标题" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="admin-table__inline">
              <span class="admin-table__main">{{ row.title }}</span>
              <el-tag v-if="row.is_pinned" type="danger" effect="plain" size="small">置顶</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="目标/状态" min-width="110">
          <template #default="{ row }">
            <div class="admin-table__inline">
              <span class="admin-table__main">{{ getRoleLabel(row.target_role) }}</span>
              <el-tag :type="getStatusTagType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="发布时间" min-width="120">
          <template #default="{ row }">
            <div class="admin-table__stack">
              <div class="admin-table__main">{{ formatCompactTime(row.published_at) }}</div>
              <div class="admin-table__sub">更新 {{ formatCompactTime(row.updated_at) }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="88" align="center">
          <template #default="{ row }">
            <div class="admin-actions--compact">
              <el-button
                link
                type="primary"
                size="small"
                :disabled="actionLoadingId === row.id"
                @click="openEditDialog(row)"
              >
                编辑
              </el-button>
              <el-dropdown trigger="click" @command="(command) => handleNotificationCommand(command, row)">
                <el-button link size="small" :disabled="actionLoadingId === row.id">更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="publish" :disabled="row.status === 'published' || actionLoadingId === row.id">
                      发布
                    </el-dropdown-item>
                    <el-dropdown-item command="offline" :disabled="row.status === 'offline' || actionLoadingId === row.id">
                      下线
                    </el-dropdown-item>
                    <el-dropdown-item command="pin" :disabled="actionLoadingId === row.id">
                      {{ row.is_pinned ? '取消置顶' : '置顶' }}
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" :disabled="actionLoadingId === row.id" divided>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-else-if="listState.loading" class="notification-state">
        <el-skeleton :rows="6" animated />
      </div>

      <el-empty
        v-else-if="!listState.error"
        :description="hasActiveFilters ? '没有符合条件的通知' : '暂无通知数据'"
        class="notification-empty"
      />
    </el-card>

    <NotificationEditDrawer
      v-model:visible="dialogVisible"
      :mode="dialogMode"
      :editing-id="editingId"
      :initial-row="editingRow"
      :role-options="ROLE_OPTIONS"
      :status-options="STATUS_OPTIONS"
      :reload="loadNotifications"
    />
  </div>
</template>
