<!-- 这个页面是“总后台权限角色页”。后端 /admin/roles 未实现；侧栏已隐藏，本页仅说明状态，禁止假造 RBAC。 -->
<template>
  <div class="page-shell">
    <h1 class="page-shell__title">权限角色</h1>

    <el-alert
      type="warning"
      show-icon
      :closable="false"
      class="page-shell__alert"
      title="接口未实现：GET/POST/PUT/DELETE /admin/roles"
      description="当前后端仅校验 users.role=admin，无多角色权限矩阵。本页不请求角色接口、无增删改。侧栏入口已隐藏；完整 RBAC 需产品确认后再补后端。"
    />

    <el-card class="page-shell__card">
      <template #header>当前登录管理员</template>
      <el-table :data="adminRows" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="nickname" label="昵称" min-width="140" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag type="primary">{{ getRoleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限范围" min-width="280">
          <template #default>
            审核、订单、通知、反馈、仪表盘（全量 admin 权限）
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="page-shell__card">
      <template #header>规划中的角色（待后端实现）</template>
      <el-table :data="plannedRoles" border>
        <el-table-column prop="name" label="角色" width="140" />
        <el-table-column prop="scope" label="权限范围" min-width="320" />
        <el-table-column label="状态" width="100">
          <template #default>
            <el-tag type="info">待建设</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
// 只读展示当前 admin 与规划角色；不调用 /admin/roles（后端无路由）。
import { computed } from 'vue'
import { useAuthStore } from '../../store/modules/auth'
import { getRoleLabel } from '../../utils/detail-display'

const authStore = useAuthStore()

const adminRows = computed(() => {
  const admin = authStore.adminInfo
  if (!admin) return []
  return [
    {
      id: admin.id,
      nickname: admin.nickname || '--',
      phone: admin.phone || '--',
      role: admin.role || 'admin',
    },
  ]
})

const plannedRoles = [
  { name: '超级管理员', scope: '全模块 + 系统配置 + 角色管理' },
  { name: '运营专员', scope: '商家/骑手审核、订单查看、通知发布' },
  { name: '财务专员', scope: '支付结算、退款仲裁、对账导出' },
  { name: '客服专员', scope: '投诉建议、订单取消/退款协助' },
]
</script>
