<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../store/modules/auth'
import { unlockAudioPlayback } from '../../utils/admin-reminder-center'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)
const submitting = ref(false)

const form = reactive({
  account: '',
  password: '',
})

const rules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  if (!formRef.value) {
    return
  }

  try {
    await formRef.value.validate()
    submitting.value = true
    await authStore.login(form)
    try {
      await unlockAudioPlayback()
    } catch (error) {
      console.warn('[login] unlock audio failed:', error)
    }
    ElMessage.success('登录成功，待接单语音提醒已尝试开启')
    router.replace('/workbench')
  } catch (error) {
    if (!error?.response && error?.message && error?.message !== 'validation failed') {
      ElMessage.error(error.message)
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="login-panel__header">
        <h1 class="login-panel__title">固始县总后台管理端</h1>
        <p class="login-panel__subtitle">管理员登录</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item label="账号" prop="account">
          <el-input v-model="form.account" placeholder="请输入账号" clearable />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item class="login-form__action">
          <el-button type="primary" class="login-form__button" :loading="submitting" @click="handleLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
