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
  buildDetailEntries,
  getApplySourceLabel,
  ORDER_BASE_FIELD_ORDER,
  ORDER_DETAIL_HIDDEN,
  ORDER_PARTY_FIELD_ORDER,
} from '../../utils/detail-display'
import OrderDetailAuditBars from './OrderDetailAuditBars.vue'
import OrderDetailGoods from './OrderDetailGoods.vue'

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
function isConservationAbnormalLog(item) {
  return item?.action === CONSERVATION_ABNORMAL_ACTION
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
        <OrderDetailAuditBars
          :detail-data="detailData"
          :audit-loading="auditLoading"
          @approve-cancel="emit('approve-cancel', $event)"
          @reject-cancel="emit('reject-cancel', $event)"
          @approve-refund="emit('approve-refund', $event)"
          @reject-refund="emit('reject-refund', $event)"
        />

        <OrderDetailGoods
          :detail-data="detailData"
          :backend-origin="backendOrigin"
        />

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

.orders-detail__timeline-title--abnormal {
  color: #e53935;
  font-weight: 600;
}
</style>
