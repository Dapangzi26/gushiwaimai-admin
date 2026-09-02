<!-- 订单详情抽屉里的取消条 / 等待条 / 售后可审条。只展示 + emit，不调审核 API。 -->
<!-- 父页仍只认 OrderDetailDrawer。getRefundAuditChannelLabel 与 RefundAuditTab 各一份，禁止合成。 -->
<script setup>
import { computed } from 'vue'
import { getResponsibilityTypeLabel } from '../../utils/detail-display'
import { canAdminArbitrateRefund } from './lib/can-admin-arbitrate-refund.js'

const props = defineProps({
  detailData: { type: Object, default: null },
  auditLoading: { type: Boolean, default: false },
})

const emit = defineEmits([
  'approve-cancel',
  'reject-cancel',
  'approve-refund',
  'reject-refund',
])

const pendingCancelRefund = computed(() => {
  const refund = props.detailData?.latest_cancel_refund
  if (refund?.apply_source === 'cancel' && Number(refund.status) === 0) {
    return refund
  }

  const refunds = Array.isArray(props.detailData?.refunds) ? props.detailData.refunds : []
  return refunds.find((item) => item?.apply_source === 'cancel' && Number(item.status) === 0) || null
})

const pendingAfterSaleRefund = computed(() => {
  const refunds = Array.isArray(props.detailData?.refunds) ? props.detailData.refunds : []
  const pending = refunds.find((item) => item?.apply_source === 'after_sale' && Number(item.status) === 0) || null
  if (!pending) return null
  return canAdminArbitrateRefund({
    ...pending,
    order_type: pending.order_type || props.detailData?.order_type || '',
  }) ? pending : null
})

const waitingExternalAfterSaleRefund = computed(() => {
  const refunds = Array.isArray(props.detailData?.refunds) ? props.detailData.refunds : []
  const pending = refunds.find((item) => item?.apply_source === 'after_sale' && Number(item.status) === 0) || null
  if (!pending || pendingAfterSaleRefund.value) return null
  return pending
})

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

function getRefundAuditBannerTitle(refund) {
  if (!refund) {
    return ''
  }

  return getRefundAuditChannelLabel(refund) === '站长拒绝后转平台'
    ? '这笔订单的退款申请已转入平台仲裁'
    : '这笔订单有待处理的售后退款申请'
}

function getRefundAuditBannerDescription(refund) {
  if (!refund) {
    return ''
  }

  const reason = refund.description || refund.reason_type || '未填写'
  const baseText = `退款原因：${reason}，退款金额：¥${refund.amount || '--'}`

  if (refund.audit_role === 'admin' && String(refund.audit_note || '').includes('转平台')) {
    return `${baseText}。站长已拒绝，现由平台最终处理。`
  }

  return `${baseText}。当前这笔售后退款由平台处理。`
}
</script>

<template>
  <div>
    <div v-if="pendingCancelRefund" class="orders-detail__audit-bar">
      <div class="orders-detail__audit-title">这笔订单有待审核的取消申请</div>
      <div class="orders-detail__audit-desc">
        用户原因：{{ pendingCancelRefund.description || pendingCancelRefund.reason_type || '未填写' }}
        ，申请退款：¥{{ pendingCancelRefund.amount || '--' }}
      </div>
      <div class="orders-detail__audit-actions">
        <el-button type="primary" :loading="auditLoading" @click="emit('approve-cancel', pendingCancelRefund)">通过取消</el-button>
        <el-button type="danger" plain :loading="auditLoading" @click="emit('reject-cancel', pendingCancelRefund)">驳回申请</el-button>
      </div>
    </div>

    <div v-if="waitingExternalAfterSaleRefund" class="orders-detail__audit-bar orders-detail__audit-bar--waiting">
      <div class="orders-detail__audit-title">{{ getRefundAuditChannelLabel(waitingExternalAfterSaleRefund) }}</div>
      <div class="orders-detail__audit-desc">
        {{ getRefundAuditBannerDescription(waitingExternalAfterSaleRefund) }}
      </div>
      <div class="orders-detail__audit-desc orders-detail__audit-desc--muted">
        平台需等商家或站长处理完毕（或转交平台）后才能仲裁。
      </div>
    </div>

    <div v-if="pendingAfterSaleRefund" class="orders-detail__audit-bar orders-detail__audit-bar--refund">
      <div class="orders-detail__audit-title">{{ getRefundAuditBannerTitle(pendingAfterSaleRefund) }}</div>
      <div class="orders-detail__audit-desc">
        {{ getRefundAuditBannerDescription(pendingAfterSaleRefund) }}
      </div>
      <div class="orders-detail__audit-extra">
        <span>处理来源：{{ getRefundAuditChannelLabel(pendingAfterSaleRefund) }}</span>
        <span>用户申诉：{{ pendingAfterSaleRefund.responsibility_label || getResponsibilityTypeLabel(pendingAfterSaleRefund.user_claim_direction || pendingAfterSaleRefund.responsibility_type) }}</span>
      </div>
      <div class="orders-detail__audit-actions">
        <el-button type="primary" :loading="auditLoading" @click="emit('approve-refund', pendingAfterSaleRefund)">通过退款</el-button>
        <el-button type="danger" plain :loading="auditLoading" @click="emit('reject-refund', pendingAfterSaleRefund)">驳回退款</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orders-detail__audit-bar {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid #f5c27b;
  border-radius: 12px;
  background: #fff7e6;
}

.orders-detail__audit-bar--refund {
  border-color: #91caff;
  background: #f0f7ff;
}

.orders-detail__audit-bar--waiting {
  border-color: #ffd591;
  background: #fff7e6;
}

.orders-detail__audit-bar--waiting .orders-detail__audit-title {
  color: #d46b08;
}

.orders-detail__audit-desc--muted {
  color: #8c8c8c;
  font-size: 13px;
}

.orders-detail__audit-title {
  font-size: 15px;
  font-weight: 600;
  color: #d46b08;
}

.orders-detail__audit-bar--refund .orders-detail__audit-title {
  color: #0958d9;
}

.orders-detail__audit-desc {
  margin-top: 8px;
  color: #8c5300;
  line-height: 1.6;
}

.orders-detail__audit-bar--refund .orders-detail__audit-desc {
  color: #1d39c4;
}

.orders-detail__audit-extra {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #5b6b8a;
  font-size: 13px;
}

.orders-detail__audit-actions {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}
</style>
