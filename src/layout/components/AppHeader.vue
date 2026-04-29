<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../store/modules/auth'

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

async function handleCommand(command) {
  if (command !== 'logout') {
    return
  }

  await authStore.logout()
  router.replace('/login')
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
</template>
