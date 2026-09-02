<script setup>
// 系统通知的新建 / 编辑抽屉。
// 父页「新建系统通知 / 编辑」仍叫 openCreateDialog / openEditDialog，这里只负责填表、校验、提交。
// 提交成功后关抽屉，再等父页传入的 reload 刷列表。目标角色文案用父页那份 ROLE_OPTIONS，不是 detail-display 的管理员角色。
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createNotification, updateNotification } from '../../api/notification'

const props = defineProps({
  mode: { type: String, default: 'create' },
  editingId: { type: [String, Number], default: null },
  initialRow: { type: Object, default: null },
  roleOptions: { type: Array, required: true },
  statusOptions: { type: Array, required: true },
  reload: { type: Function, required: true },
})

const visible = defineModel('visible', { type: Boolean, default: false })

const submitLoading = ref(false)
const formRef = ref(null)
const form = reactive(createDefaultForm())

const dialogTitle = computed(() => (props.mode === 'create' ? '新建系统通知' : '编辑系统通知'))

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

function fillForm(data) {
  form.title = data?.title || ''
  form.content = data?.content || ''
  form.target_role = data?.target_role || 'all'
  form.status = data?.status || 'draft'
  form.is_pinned = Boolean(data?.is_pinned)
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

    if (props.mode === 'create') {
      await createNotification(payload)
      ElMessage.success('系统通知创建成功')
    } else {
      await updateNotification(props.editingId, payload)
      ElMessage.success('系统通知更新成功')
    }

    visible.value = false
    await props.reload()
  } finally {
    submitLoading.value = false
  }
}

watch(
  () => visible.value,
  (open) => {
    if (!open) return
    if (props.mode === 'create') {
      fillForm(createDefaultForm())
    } else {
      fillForm(props.initialRow)
    }
  },
)
</script>

<template>
  <el-drawer
    v-model="visible"
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
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option
              v-for="item in statusOptions"
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
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ mode === 'create' ? '创建通知' : '保存修改' }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>
