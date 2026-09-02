<!-- 订单详情抽屉里的商品明细 + 顶部结算守恒告警。 -->
<!-- 父页仍只认 OrderDetailDrawer。backendOrigin 继续往下传。时间线标红仍在抽屉。 -->
<script setup>
import { computed } from 'vue'
import { buildAssetUrl } from '../../utils/detail-display'

const props = defineProps({
  detailData: { type: Object, default: null },
  backendOrigin: { type: String, default: '' },
})

const orderItems = computed(() => {
  const list = props.detailData?.order_items
  return Array.isArray(list) ? list : []
})

const CONSERVATION_ABNORMAL_ACTION = '结算守恒异常'
const conservationAbnormalLogs = computed(() => {
  const logs = Array.isArray(props.detailData?.logs) ? props.detailData.logs : []
  return logs.filter((log) => log?.action === CONSERVATION_ABNORMAL_ACTION)
})

function resolveOrderItemImage(item) {
  const raw = item?.image_thumb || item?.image || item?.image_detail || ''
  return buildAssetUrl(raw, props.backendOrigin)
}

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
  <div>
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
  </div>
</template>

<style scoped>
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

.orders-detail__section + .orders-detail__section {
  margin-top: 20px;
}

.orders-detail__title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
}

.orders-detail__section {
  margin-bottom: 20px;
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
</style>
