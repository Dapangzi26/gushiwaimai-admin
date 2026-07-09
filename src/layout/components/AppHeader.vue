<script setup>
// 总后台顶栏：面包屑、管理员信息、待接单语音开关。
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell, WarningFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '../../store/modules/auth'

const props = defineProps({
  audioUnlocked: {
    type: Boolean,
    default: false,
  },
  unlockingAudio: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['unlock-audio'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const currentTitle = computed(() => route.meta.title || '工作台')
const breadcrumbItems = computed(() => {
  const metaBreadcrumb = route.meta?.breadcrumb

  if (Array.isArray(metaBreadcrumb) && metaBreadcrumb.length) {
    return metaBreadcrumb
  }

  return [currentTitle.value]
})
const adminName = computed(() => authStore.adminName || '管理员')
const roleName = computed(() => authStore.roleName || '未设置角色')
const voiceButtonLabel = computed(() => (props.audioUnlocked ? '语音已开启' : '开启语音'))
const voiceButtonType = computed(() => (props.audioUnlocked ? 'success' : 'warning'))

async function handleCommand(command) {
  if (command !== 'logout') {
    return
  }

  await authStore.logout()
  router.replace('/login')
}

function handleUnlockAudio() {
  emit('unlock-audio')
}
</script>

<template>
  <div class="app-header">
    <div>
      <div class="app-header__title">固始县外卖平台总后台管理端</div>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>首页</el-breadcrumb-item>
        <el-breadcrumb-item v-for="item in breadcrumbItems" :key="item">{{ item }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="app-header__actions">
      <el-button
        :type="voiceButtonType"
        plain
        :loading="unlockingAudio"
        @click="handleUnlockAudio"
      >
        <el-icon class="app-header__voice-icon">
          <Bell v-if="audioUnlocked" />
          <WarningFilled v-else />
        </el-icon>
        {{ voiceButtonLabel }}
      </el-button>

      <el-dropdown @command="handleCommand">
        <div class="app-header__admin">
          <div class="app-header__admin-name">{{ adminName }}</div>
          <div class="app-header__admin-role">{{ roleName }}</div>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<style scoped>
.app-header__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-header__voice-icon {
  margin-right: 4px;
}
</style>
