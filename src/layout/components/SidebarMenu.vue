﻿﻿﻿﻿<script setup>
import { Bell, Checked, Compass, CreditCard, House, Lock, Management, Menu, OfficeBuilding, Operation, Setting, ShoppingCart, User, Van } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.path)
const defaultOpeneds = computed(() => (route.path.startsWith('/messages/') ? ['messages-group'] : []))

const menuItems = [
  { path: '/workbench', title: '工作台', icon: House },
  { path: '/platform-users', title: '平台用户', icon: User },
  { path: '/roles', title: '权限角色', icon: Lock },
  { path: '/merchants', title: '商家管理', icon: OfficeBuilding },
  { path: '/riders', title: '骑手管理', icon: Van },
  { path: '/town-stations', title: '站长乡镇管理', icon: Management },
  { path: '/orders', title: '订单中心', icon: ShoppingCart },
  { path: '/payments', title: '支付结算', icon: CreditCard },
  { path: '/reviews', title: '审核中心', icon: Checked },
  { path: '/dispatch', title: '调度总览', icon: Compass },
  { path: '/operations', title: '运营配置', icon: Operation },
  {
    path: '/messages',
    title: '消息通知',
    icon: Bell,
    children: [
      { path: '/messages/system-notifications', title: '系统通知' },
      { path: '/messages/feedback', title: '投诉建议' },
    ],
  },
  { path: '/audit-logs', title: '日志审计', icon: Menu },
  { path: '/settings', title: '系统设置', icon: Setting },
]
</script>

<template>
  <div class="sidebar-menu">
    <div class="sidebar-menu__brand">固始县总后台</div>
    <el-scrollbar>
      <el-menu
        router
        :default-active="activeMenu"
        :default-openeds="defaultOpeneds"
        class="sidebar-menu__nav"
        background-color="#001529"
        text-color="rgba(255, 255, 255, 0.75)"
        active-text-color="#ffffff"
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-sub-menu v-if="item.children?.length" index="messages-group">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
              <span>{{ child.title }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
  </div>
</template>
