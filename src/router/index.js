import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layout/index.vue'
import pinia from '../store'
import { useAuthStore } from '../store/modules/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { title: '管理员登录', public: true },
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/workbench',
    children: [
      { path: 'workbench', name: 'Workbench', component: () => import('../views/workbench/index.vue'), meta: { title: '工作台' } },
      { path: 'platform-users', name: 'PlatformUsers', component: () => import('../views/platform-users/index.vue'), meta: { title: '平台用户' } },
      { path: 'roles', name: 'Roles', component: () => import('../views/roles/index.vue'), meta: { title: '权限角色' } },
      { path: 'merchants', name: 'Merchants', component: () => import('../views/merchants/index.vue'), meta: { title: '商家管理' } },
      { path: 'riders', name: 'Riders', component: () => import('../views/riders/index.vue'), meta: { title: '骑手管理' } },
      { path: 'town-stations', name: 'TownStations', component: () => import('../views/town-stations/index.vue'), meta: { title: '站长乡镇管理' } },
      { path: 'orders', name: 'Orders', component: () => import('../views/orders/index.vue'), meta: { title: '订单中心' } },
      { path: 'payments', name: 'Payments', component: () => import('../views/payments/index.vue'), meta: { title: '支付结算' } },
      { path: 'reviews', name: 'Reviews', component: () => import('../views/reviews/index.vue'), meta: { title: '审核中心' } },
      { path: 'dispatch', name: 'Dispatch', component: () => import('../views/dispatch/index.vue'), meta: { title: '调度总览' } },
      { path: 'operations', name: 'Operations', component: () => import('../views/operations/index.vue'), meta: { title: '运营配置' } },
      { path: 'messages', redirect: '/messages/system-notifications' },
      {
        path: 'messages/system-notifications',
        name: 'SystemNotifications',
        component: () => import('../views/messages/index.vue'),
        meta: { title: '系统通知', breadcrumb: ['消息通知', '系统通知'] },
      },
      {
        path: 'messages/feedback',
        name: 'MessageFeedback',
        component: () => import('../views/message-feedback/index.vue'),
        meta: { title: '投诉建议', breadcrumb: ['消息通知', '投诉建议'] },
      },
      { path: 'audit-logs', name: 'AuditLogs', component: () => import('../views/audit-logs/index.vue'), meta: { title: '日志审计' } },
      { path: 'settings', name: 'Settings', component: () => import('../views/settings/index.vue'), meta: { title: '系统设置' } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const authStore = useAuthStore(pinia)
  return handleRouteGuard(to, authStore)
})

async function handleRouteGuard(to, authStore) {
  await authStore.ensureAuthReady()

  if (to.meta.public) {
    if (authStore.isLoggedIn && to.path === '/login') {
      return '/workbench'
    }

    return true
  }

  if (!authStore.isLoggedIn) {
    return '/login'
  }

  return true
}

export default router
