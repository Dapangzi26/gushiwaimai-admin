<script setup>
// 这个组件是“总后台订单详情抽屉”。
// 职责单一：把父页传进来的一笔订单详情（detailData）渲染成抽屉里的各个区块——
// 待审核的取消申请条、售后退款处理条、商品明细，以及订单/商家/用户/骑手/退款/日志分区。
//
// 关键边界（为什么这么拆）：
// 这里只负责“展示 + 把用户点的动作抛回父页”，本身不调后端、不改列表状态。
// 审核通过/驳回、拨打电话这些真正的业务动作，一律通过 emit 交回 index.vue 处理，
// 这样详情 UI 和审核链路解耦，后期改样式不会碰到审核逻辑，反之亦然。
import { computed } from 'vue'
import {
  buildAssetUrl,
  buildDetailEntries,
  getApplySourceLabel,
  getResponsibilityTypeLabel,
  ORDER_BASE_FIELD_ORDER,
  ORDER_DETAIL_HIDDEN,
  ORDER_PARTY_FIELD_ORDER,
} from '../../utils/detail-display'

const props = defineProps({
  // 抽屉显隐，配合父页 v-model:visible 使用
  visible: { type: Boolean, default: false },
  // 一笔订单的完整详情，加载中/加载失败时可能为 null
  detailData: { type: Object, default: null },
  // 详情本身的加载态
  detailLoading: { type: Boolean, default: false },
  // 详情加载失败的错误文案
  detailError: { type: String, default: '' },
  // 审核按钮的 loading（由父页统一控制，避免重复点）
  auditLoading: { type: Boolean, default: false },
  // 后端资源前缀，用于把商品图片相对路径拼成绝对地址
  backendOrigin: { type: String, default: '' },
})

const emit = defineEmits([
  'update:visible',
  'approve-cancel',
  'reject-cancel',
  'approve-refund',
  'reject-refund',
  'contact',
])

// —— 取消申请：只挑“取消来源(cancel) + 待审核(status=0)”的那一笔，避免和售后退款混审 ——
const pendingCancelRefund = computed(() => {
  const refund = props.detailData?.latest_cancel_refund
  if (refund?.apply_source === 'cancel' && Number(refund.status) === 0) {
    return refund
  }

  const refunds = Array.isArray(props.detailData?.refunds) ? props.detailData.refunds : []
  return refunds.find((item) => item?.apply_source === 'cancel' && Number(item.status) === 0) || null
})

// —— 售后退款：只有平台此刻确实有权仲裁时，才在详情里给出操作区 ——
const pendingAfterSaleRefund = computed(() => {
  const refunds = Array.isArray(props.detailData?.refunds) ? props.detailData.refunds : []
  const pending = refunds.find((item) => item?.apply_source === 'after_sale' && Number(item.status) === 0) || null
  if (!pending) return null
  return canAdminArbitrateRefund({
    ...pending,
    order_type: pending.order_type || props.detailData?.order_type || '',
  }) ? pending : null
})

// —— 售后退款还轮不到平台（在商家/站长手里）：只提示、不给操作按钮 ——
const waitingExternalAfterSaleRefund = computed(() => {
  const refunds = Array.isArray(props.detailData?.refunds) ? props.detailData.refunds : []
  const pending = refunds.find((item) => item?.apply_source === 'after_sale' && Number(item.status) === 0) || null
  if (!pending || pendingAfterSaleRefund.value) return null
  return pending
})

// —— 详情分区：基础/商家/用户/骑手/退款/日志；空分区（除了固定几块）自动隐藏 ——
const detailSections = computed(() => {
  if (!props.detailData) {
    return []
  }

  const sections = [
    { key: 'base', title: '订单基础信息', items: buildDetailEntries(props.detailData, { fieldOrder: ORDER_BASE_FIELD_ORDER, hiddenFields: ORDER_DETAIL_HIDDEN }) },
    { key: 'merchant', title: '商家信息', items: buildDetailEntries(props.detailData?.merchant, { fieldOrder: ORDER_PARTY_FIELD_ORDER }) },
    { key: 'buyer', title: '用户信息', items: buildDetailEntries(props.detailData?.buyer, { fieldOrder: ORDER_PARTY_FIELD_ORDER }) },
    { key: 'rider', title: '骑手信息', items: buildDetailEntries(props.detailData?.rider, { fieldOrder: ORDER_PARTY_FIELD_ORDER }) },
    { key: 'refund', title: '退款记录', items: Array.isArray(props.detailData?.refunds) ? props.detailData.refunds : [] },
    { key: 'logs', title: '订单日志', items: Array.isArray(props.detailData?.logs) ? props.detailData.logs : [] },
  ]

  return sections.filter((section) => section.key === 'base' || section.key === 'refund' || section.key === 'logs' || section.items.length > 0)
})

// 商品明细列表
const orderItems = computed(() => {
  const list = props.detailData?.order_items
  return Array.isArray(list) ? list : []
})

// 本单资金/退款流水（D-P40 / S-06）：只读后端 wallet_logs（全角色 by order_id）。
// 金额只信后端、恒为绝对值，方向看 direction（in=进账 / out=扣回）。
// 说明：用户侧退款走支付通道原路退、不进 wallet_logs，用户实退看「退款记录」支付退款单。
const walletLogs = computed(() => {
  return Array.isArray(props.detailData?.wallet_logs) ? props.detailData.wallet_logs : []
})

// 结算守恒异常（D-P26 / S-08 · A 先可见）：后端确认收货结算时若「分账之和 ≠ 实付」，
// 会写一条 action='结算守恒异常' 的 OrderLog（不阻断入账，见 order-receipt-settlement.service）。
// 这里只读筛出这类日志，用于顶部告警条 + 日志时间线标红。只做「看得见」，不改入账逻辑。
const CONSERVATION_ABNORMAL_ACTION = '结算守恒异常'
const conservationAbnormalLogs = computed(() => {
  const logs = Array.isArray(props.detailData?.logs) ? props.detailData.logs : []
  return logs.filter((log) => log?.action === CONSERVATION_ABNORMAL_ACTION)
})
function isConservationAbnormalLog(item) {
  return item?.action === CONSERVATION_ABNORMAL_ACTION
}

// 拼商品图片的绝对地址（缩略图优先，逐级兜底）
function resolveOrderItemImage(item) {
  const raw = item?.image_thumb || item?.image || item?.image_detail || ''
  return buildAssetUrl(raw, props.backendOrigin)
}

// 时间戳格式化；坏值直接原样返回，空值给占位符
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

// 售后退款“现在卡在谁手里”的中文说明（纯展示；与 RefundAuditTab 同口径，属既有约定）
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

/**
 * 平台是否可仲裁该笔售后退款（C3：只读后端 can_admin_arbitrate）。
 * 缺字段时不猜业务规则，默认不可操作，避免与后端 policy 漂移。
 * 说明：index.vue / RefundAuditTab.vue 也各有一份同逻辑，这里是展示层就近使用，属既有约定，本刀不做合并。
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

// 售后退款提示条的标题（转平台仲裁 vs 普通待处理）
function getRefundAuditBannerTitle(refund) {
  if (!refund) {
    return ''
  }

  return getRefundAuditChannelLabel(refund) === '站长拒绝后转平台'
    ? '这笔订单的退款申请已转入平台仲裁'
    : '这笔订单有待处理的售后退款申请'
}

// 售后退款提示条的说明文案（拼原因 + 金额，站长驳回后追加一句）
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
  <el-drawer
    :model-value="visible"
    title="订单详情"
    size="680px"
    @update:model-value="(value) => emit('update:visible', value)"
  >
    <div v-loading="detailLoading">
      <el-alert v-if="detailError" :title="detailError" type="error" show-icon :closable="false" />

      <template v-else-if="detailData">
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

        <div v-if="conservationAbnormalLogs.length" class="orders-detail__conservation">
          <el-alert
            type="error"
            :closable="false"
            show-icon
            title="本单结算守恒异常：分账之和 ≠ 用户实付，请核对分账"
          >
            <div
              v-for="(log, index) in conservationAbnormalLogs"
              :key="log.id || index"
              class="orders-detail__conservation-line"
            >
              {{ log.remark || '分账之和不等于实付' }}
              <span v-if="log.created_at" class="orders-detail__conservation-time">（{{ formatTime(log.created_at) }}）</span>
            </div>
            <div class="orders-detail__conservation-hint">说明：后端已放行入账（不阻断收货），此为对账告警，请人工复核该单分账。</div>
          </el-alert>
        </div>

        <div v-if="orderItems.length" class="orders-detail__section">
          <div class="orders-detail__title">商品明细</div>
          <div class="orders-detail__goods-list">
            <div
              v-for="(item, index) in orderItems"
              :key="`${item.product_id || item.name || 'item'}-${index}`"
              class="orders-detail__goods-item"
            >
              <el-image
                class="orders-detail__goods-image"
                :src="resolveOrderItemImage(item)"
                fit="cover"
                :preview-src-list="resolveOrderItemImage(item) ? [resolveOrderItemImage(item)] : []"
                preview-teleported
              >
                <template #error>
                  <div class="orders-detail__goods-image-fallback">暂无图片</div>
                </template>
              </el-image>

              <div class="orders-detail__goods-meta">
                <div class="orders-detail__goods-name">{{ item.name || '未知商品' }}</div>
                <div v-if="item.spec_text" class="orders-detail__goods-spec">规格：{{ item.spec_text }}</div>
                <div v-if="item.description" class="orders-detail__goods-desc">{{ item.description }}</div>
                <div class="orders-detail__goods-price">
                  <span>单价 ¥{{ item.unit_price || '0.00' }} × {{ item.quantity || 0 }}</span>
                  <span class="orders-detail__goods-subtotal">小计 ¥{{ item.line_amount || '0.00' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-for="section in detailSections" :key="section.key" class="orders-detail__section">
          <div class="orders-detail__title">{{ section.title }}</div>

          <el-empty v-if="!section.items.length" description="暂无数据" :image-size="60" />

          <el-descriptions v-else-if="section.key !== 'refund' && section.key !== 'logs'" :column="1" border>
            <el-descriptions-item v-for="item in section.items" :key="item.key" :label="item.label">
              <span class="detail-display__text">{{ item.value }}</span>
            </el-descriptions-item>
          </el-descriptions>

          <div
            v-if="section.key === 'merchant' && detailData.merchant?.phone"
            class="orders-detail__merchant-actions"
          >
            <el-button type="primary" @click="emit('contact', 'merchant', { merchant_phone: detailData.merchant.phone })">
              拨打商家 {{ detailData.merchant.phone }}
            </el-button>
          </div>

          <el-timeline v-else class="orders-detail__timeline">
            <el-timeline-item
              v-for="(item, index) in section.items"
              :key="item.id || item.refund_no || item.created_at || index"
              :timestamp="formatTime(item.created_at || item.merchant_audit_at || item.success_at)"
              :type="section.key === 'logs' && isConservationAbnormalLog(item) ? 'danger' : undefined"
            >
              <div
                class="orders-detail__timeline-title"
                :class="{ 'orders-detail__timeline-title--abnormal': section.key === 'logs' && isConservationAbnormalLog(item) }"
              >
                {{
                  section.key === 'refund'
                    ? `${getApplySourceLabel(item.apply_source)} - ${item.status_label || '--'}`
                    : item.action || section.title
                }}
              </div>
              <div class="orders-detail__timeline-content">
                {{
                  section.key === 'refund'
                    ? item.description || item.reject_reason || item.audit_note || '无附加说明'
                    : item.remark || '无备注'
                }}
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <div v-if="walletLogs.length" class="orders-detail__section">
          <div class="orders-detail__title">本单资金流水</div>
          <el-timeline class="orders-detail__timeline">
            <el-timeline-item
              v-for="(log, index) in walletLogs"
              :key="log.id || index"
              :timestamp="formatTime(log.created_at)"
              :type="log.direction === 'in' ? 'success' : 'danger'"
            >
              <div class="orders-detail__timeline-title orders-detail__wallet-title">
                <span>{{ log.role_label }} · {{ log.title || log.type_label }}</span>
                <span :class="log.direction === 'in' ? 'orders-detail__wallet-amount--in' : 'orders-detail__wallet-amount--out'">
                  {{ log.direction === 'in' ? '+' : '-' }}¥{{ log.amount }}
                </span>
              </div>
              <div class="orders-detail__timeline-content">
                {{ (log.direction === 'in' ? '进账' : '扣回') + '·' + log.type_label }}{{ log.remark ? ' · ' + log.remark : '' }}
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </template>

      <el-empty v-else description="暂无详情数据" />
    </div>
  </el-drawer>
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

.orders-detail__goods-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.orders-detail__goods-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}

.orders-detail__goods-image {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: #f2f3f5;
}

.orders-detail__goods-image-fallback {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
  background: #f2f3f5;
}

.orders-detail__goods-meta {
  flex: 1;
  min-width: 0;
}

.orders-detail__goods-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  line-height: 1.5;
}

.orders-detail__goods-spec,
.orders-detail__goods-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.orders-detail__goods-price {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
}

.orders-detail__goods-subtotal {
  font-weight: 600;
  color: #f56c6c;
}

.orders-detail__merchant-actions {
  margin-top: 12px;
}

.orders-detail__section + .orders-detail__section {
  margin-top: 20px;
}

.orders-detail__title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
}

.orders-detail__wallet-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.orders-detail__wallet-amount--in {
  color: #2e7d32;
  font-weight: 600;
}

.orders-detail__wallet-amount--out {
  color: #e53935;
  font-weight: 600;
}

.orders-detail__conservation {
  margin-bottom: 16px;
}

.orders-detail__conservation-line {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-all;
}

.orders-detail__conservation-time {
  color: #a8071a;
}

.orders-detail__conservation-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8c5300;
}

.orders-detail__timeline-title--abnormal {
  color: #e53935;
  font-weight: 600;
}
</style>
