<script setup>
import { formatOrderNoDisplay } from '../../utils/orderNo.js'
import { getApplySourceLabel } from '../../utils/detail-display'

defineProps({
  filters: { type: Object, required: true },
  statusOptions: { type: Array, required: true },
  listState: { type: Object, required: true },
  auditLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['search', 'reset', 'reload', 'view-refund', 'approve', 'reject'])

function getRefundStatusTagType(status) {
  if (Number(status) === 2) return 'success'
  if (Number(status) === 3) return 'danger'
  if (Number(status) === 4) return 'info'
  return 'warning'
}

function getRefundAuditChannelLabel(refund) {
  if (!refund) {
    return '--'
  }

  if (refund.apply_source !== 'after_sale') {
    return '后台取消审核'
  }

  if (refund.audit_role === 'merchant') {
    return refund.is_merchant_audit_overdue ? '待商家处理（已超时）' : '待商家处理'
  }

  if (refund.audit_role === 'station') {
    return '待站长审核'
  }

  if (refund.is_merchant_escalated || String(refund.audit_note || '').includes('商家超时')) {
    return '商家超时转平台'
  }

  if (refund.audit_role === 'admin' && String(refund.audit_note || '').includes('转平台')) {
    return '站长拒绝后转平台'
  }

  return '平台直接处理'
}

function isRefundRowHighlighted(row) {
  return Boolean(row?.is_merchant_audit_overdue || row?.is_merchant_escalated)
}

/**
 * 平台是否可仲裁该笔售后退款（C3：只读后端 can_admin_arbitrate）。
 * 缺字段时不猜业务规则，默认不可操作，避免与 policy 漂移。
 */
function canAdminArbitrateRefund(row) {
  if (!row || Number(row.status) !== 0) {
    return false
  }

  if (row.apply_source && row.apply_source !== 'after_sale') {
    return false
  }

  if (typeof row.can_admin_arbitrate === 'boolean') {
    return row.can_admin_arbitrate
  }
  if (typeof row.raw?.can_admin_arbitrate === 'boolean') {
    return row.raw.can_admin_arbitrate
  }

  return false
}

function getRefundRowClassName({ row }) {
  return isRefundRowHighlighted(row) ? 'orders-table__row--highlight' : ''
}
</script>

<template>
  <el-form :inline="true" class="orders-filters" @submit.prevent>
    <el-form-item label="退款状态">
      <el-select v-model="filters.status" class="orders-filter__select">
        <el-option
          v-for="item in statusOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="emit('search')">查询</el-button>
      <el-button @click="emit('reset')">重置</el-button>
    </el-form-item>
  </el-form>

  <el-alert
    v-if="listState.error"
    :title="listState.error"
    type="error"
    show-icon
    :closable="false"
    class="orders-alert"
  >
    <template #default>
      <el-button type="danger" link @click="emit('reload')">重新加载</el-button>
    </template>
  </el-alert>

  <el-table
    v-loading="listState.loading"
    :data="listState.items"
    border
    size="small"
    class="orders-table admin-table--compact"
    empty-text="暂无退款数据"
    :row-class-name="getRefundRowClassName"
  >
    <el-table-column label="订单号" width="168">
      <template #default="{ row }">
        <div class="admin-table__order-no admin-table__main">
          {{ formatOrderNoDisplay(row.order_no) || row.order_no || '--' }}
        </div>
        <div class="admin-table__sub">{{ row.refund_no || '--' }}</div>
      </template>
    </el-table-column>

    <el-table-column label="用户" width="108" show-overflow-tooltip>
      <template #default="{ row }">
        <div class="admin-table__main">{{ row.buyer_name }}</div>
        <div class="admin-table__sub">{{ row.buyer_phone || '--' }}</div>
      </template>
    </el-table-column>

    <el-table-column label="商家" min-width="88" show-overflow-tooltip>
      <template #default="{ row }">
        <div class="admin-table__main">{{ row.merchant_name }}</div>
        <div class="admin-table__sub">{{ row.customer_town || row.merchant_town_name || '--' }}</div>
      </template>
    </el-table-column>

    <el-table-column label="来源/处理" width="108">
      <template #default="{ row }">
        <el-tag type="warning" size="small">{{ getApplySourceLabel(row.apply_source) }}</el-tag>
        <div class="admin-table__sub">{{ getRefundAuditChannelLabel(row) }}</div>
      </template>
    </el-table-column>

    <el-table-column label="退款/实付" width="88">
      <template #default="{ row }">
        <div class="admin-table__main">¥ {{ row.amount }}</div>
        <div class="admin-table__sub">实付 ¥ {{ row.pay_amount }}</div>
      </template>
    </el-table-column>

    <el-table-column label="状态/原因" min-width="120" show-overflow-tooltip>
      <template #default="{ row }">
        <el-tag :type="getRefundStatusTagType(row.status)" size="small">{{ row.status_label }}</el-tag>
        <div class="admin-table__sub">{{ row.description || row.reject_reason || '--' }}</div>
      </template>
    </el-table-column>

    <el-table-column label="操作" width="92" align="center">
      <template #default="{ row }">
        <div class="admin-actions--compact">
          <el-button link type="primary" size="small" @click="emit('view-refund', row)">详情</el-button>
          <el-dropdown
            v-if="Number(row.status) === 0 && canAdminArbitrateRefund(row)"
            trigger="click"
            @command="(action) => (action === 'approve' ? emit('approve', row) : emit('reject', row))"
          >
            <el-button link type="primary" size="small" :loading="auditLoading">审核</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="approve">通过退款</el-dropdown-item>
                <el-dropdown-item command="reject">驳回退款</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.orders-table__row--highlight > td {
  background: #fff7e6 !important;
}

.orders-filters {
  margin-bottom: 12px;
}

.orders-filter__select {
  width: 140px;
}

.orders-alert {
  margin-bottom: 16px;
}
</style>
