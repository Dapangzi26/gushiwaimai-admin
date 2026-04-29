<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRequestErrorMessage } from '../../utils/http'
import {
  createNotification,
  deleteNotification,
  fetchNotifications,
  offlineNotification,
  publishNotification,
  toggleNotificationPin,
  updateNotification,
} from '../../api/notification'

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
const submitLoading = ref(false)
const actionLoadingId = ref(null)
const formRef = ref(null)
const editingId = ref(null)

const form = reactive(createDefaultForm())

const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新建系统通知' : '编辑系统通知'))
const hasActiveFilters = computed(() => Boolean(filters.status || filters.target_role || filters.keyword.trim()))
const tableData = computed(() => listState.items)

const formRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文', trigger: 'blur' }],
  target_role: [{ required: true, message: '请选择目标角色', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

function createDefaultForm() {
  return {
    title: '',
    content: '',
    target_role: 'all',
    status: 'draft',
    is_pinned: false,
  }
}

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

  const keyword = filters.keyword.trim()
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

function fillForm(data) {
  form.title = data?.title || ''
  form.content = data?.content || ''
  form.target_role = data?.target_role || 'all'
  form.status = data?.status || 'draft'
  form.is_pinned = Boolean(data?.is_pinned)
}

function openCreateDialog() {
  dialogMode.value = 'create'
  editingId.value = null
  fillForm(createDefaultForm())
  dialogVisible.value = true
}

function openEditDialog(row) {
  dialogMode.value = 'edit'
  editingId.value = row.id
  fillForm(row)
  dialogVisible.value = true
}

function handleDialogClosed() {
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!formRef.value) {
    return
  }

  try {
    await formRef.value.validate()
    submitLoading.value = true
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      target_role: form.target_role,
      status: form.status,
      is_pinned: form.is_pinned,
    }

    if (dialogMode.value === 'create') {
      await createNotification(payload)
      ElMessage.success('系统通知创建成功')
    } else {
      await updateNotification(editingId.value, payload)
      ElMessage.success('系统通知更新成功')
    }

    dialogVisible.value = false
    await loadNotifications()
  } finally {
    submitLoading.value = false
  }
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
        class="notification-table"
      >
        <el-table-column label="标题" min-width="280">
          <template #default="{ row }">
            <div class="notification-title-cell">
              <div class="notification-title-row">
                <span class="notification-title-text">{{ row.title }}</span>
                <el-tag v-if="row.is_pinned" type="danger" effect="plain" size="small">置顶</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="目标角色" min-width="120">
          <template #default="{ row }">
            <el-tag effect="plain">{{ getRoleLabel(row.target_role) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="是否置顶" min-width="100">
          <template #default="{ row }">
            <span>{{ row.is_pinned ? '是' : '否' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="发布时间" min-width="170">
          <template #default="{ row }">
            <span>{{ formatTime(row.published_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="更新时间" min-width="170">
          <template #default="{ row }">
            <span>{{ formatTime(row.updated_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <div class="notification-actions">
              <el-button link type="primary" :disabled="actionLoadingId === row.id" @click="openEditDialog(row)">编辑</el-button>
              <el-button
                link
                type="success"
                :disabled="row.status === 'published' || actionLoadingId === row.id"
                @click="handlePublish(row)"
              >
                发布
              </el-button>
              <el-button
                link
                type="warning"
                :disabled="row.status === 'offline' || actionLoadingId === row.id"
                @click="handleOffline(row)"
              >
                下线
              </el-button>
              <el-button
                link
                :type="row.is_pinned ? 'info' : 'danger'"
                :disabled="actionLoadingId === row.id"
                @click="handleTogglePin(row)"
              >
                {{ row.is_pinned ? '取消置顶' : '置顶' }}
              </el-button>
              <el-button
                link
                type="danger"
                :disabled="actionLoadingId === row.id"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
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

    <el-drawer
      v-model="dialogVisible"
      :title="dialogTitle"
      size="560px"
      destroy-on-close
      @closed="handleDialogClosed"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top" class="notification-form">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="100" show-word-limit placeholder="请输入通知标题" />
        </el-form-item>

        <el-form-item label="正文" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="10"
            maxlength="5000"
            show-word-limit
            placeholder="请输入通知正文"
          />
        </el-form-item>

        <div class="notification-form__grid">
          <el-form-item label="目标角色" prop="target_role">
            <el-select v-model="form.target_role" placeholder="请选择目标角色">
              <el-option
                v-for="item in ROLE_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="状态" prop="status">
            <el-select v-model="form.status" placeholder="请选择状态">
              <el-option
                v-for="item in STATUS_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="是否置顶">
          <el-switch v-model="form.is_pinned" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="notification-drawer__footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
            {{ dialogMode === 'create' ? '创建通知' : '保存修改' }}
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>
