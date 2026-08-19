<script setup>
import { formatOrderNoDisplay } from '../../utils/orderNo.js'
import { formatCompactTime } from '../../utils/detail-display'

const props = defineProps({
  filters: { type: Object, required: true },
  businessOptions: { type: Array, required: true },
  statusOptions: { type: Array, required: true },
  exceptionOptions: { type: Array, required: true },
  listState: { type: Object, required: true },
  highlightOrderId: { type: [String, Number], default: '' },
})

const emit = defineEmits(['search', 'reset', 'reload', 'view-order', 'order-no-click', 'contact'])

function formatWaitMinutes(value) {
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes < 0) {
    return '--'
  }

  if (minutes < 60) {
    return `${minutes} 分钟`
  }

  const hour = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hour} 小时 ${rest} 分钟` : `${hour} 小时`
}

function resolveExceptionTags(row) {
  const tags = []
  if (row.primary_exception_label) {
    tags.push(row.primary_exception_label)
  }

  for (const item of row.exception_tags) {
    const label = typeof item === 'string' ? item : item?.label
    if (label && !tags.includes(label)) {
      tags.push(label)
    }
  }

  return tags
}

function getBusinessTagType(label) {
  if (label.includes('乡镇')) return 'success'
  return 'primary'
}

function getOrderStatusTagType(label) {
  if (label.includes('完成')) return 'success'
  if (label.includes('取消')) return 'info'
  if (label.includes('配送') || label.includes('备餐')) return 'warning'
  if (label.includes('待')) return 'danger'
  return ''
}

function getOrderRowClassName({ row }) {
  if (props.highlightOrderId && String(row.id) === String(props.highlightOrderId)) {
    return 'orders-table__row--highlight'
  }
  return ''
}
</script>

<template>
  <el-form :inline="true" class="orders-filters" @submit.prevent>
    <el-form-item label="业务类型">
      <el-select v-model="filters.business_type" class="orders-filter__select">
        <el-option
          v-for="item in businessOptions"
          :key="item.value || 'all-business'"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="订单状态">
      <el-select v-model="filters.status" class="orders-filter__select">
        <el-option
          v-for="item in statusOptions"
          :key="item.value || 'all-status'"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="异常筛选">
      <el-select v-model="filters.exception_type" class="orders-filter__select">
        <el-option
          v-for="item in exceptionOptions"
          :key="item.value || 'all-exception'"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="时间范围">
      <el-date-picker
        v-model="filters.time_range"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        value-format="YYYY-MM-DD HH:mm:ss"
        class="orders-filter__range"
      />
    </el-form-item>

    <el-form-item label="订单号/联系人">
      <el-input
        v-model="filters.keyword"
        placeholder="可搜订单号、联系人、手机号（点击列表订单号可一键搜索）"
        clearable
        class="orders-filter__input orders-filter__input--wide"
        @keyup.enter="emit('search')"
      />
    </el-form-item>

    <el-form-item label="商家名称">
      <el-input
        v-model="filters.merchant_name"
        placeholder="请输入商家名称"
        clearable
        class="orders-filter__input"
        @keyup.enter="emit('search')"
      />
    </el-form-item>

    <el-form-item label="乡镇名称">
      <el-input
        v-model="filters.town_name"
        placeholder="请输入乡镇名称"
        clearable
        class="orders-filter__input"
        @keyup.enter="emit('search')"
      />
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
    empty-text="暂无订单数据"
    :row-class-name="getOrderRowClassName"
  >
    <el-table-column label="业务" width="72" align="center">
      <template #default="{ row }">
        <el-tag :type="getBusinessTagType(row.business_label)" effect="dark" size="small">
          {{ row.business_label === '县城外卖' ? '县城' : row.business_label === '乡镇外卖' ? '乡镇' : row.business_label }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column label="订单号" width="168">
      <template #default="{ row }">
        <button type="button" class="orders-order-no admin-table__order-no" @click="emit('order-no-click', row)">
          {{ formatOrderNoDisplay(row.order_no) || row.order_no || '--' }}
        </button>
      </template>
    </el-table-column>

    <el-table-column label="商家" min-width="100" show-overflow-tooltip>
      <template #default="{ row }">
        {{ row.merchant_name }}
      </template>
    </el-table-column>

    <el-table-column label="用户" min-width="108" show-overflow-tooltip>
      <template #default="{ row }">
        <div class="admin-table__stack">
          <div class="admin-table__main">{{ row.user_name }}</div>
          <div class="admin-table__sub">{{ row.user_phone || '--' }}</div>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="乡镇" min-width="80" show-overflow-tooltip>
      <template #default="{ row }">
        {{ row.town_name || row.area_name || '--' }}
      </template>
    </el-table-column>

    <el-table-column label="状态" min-width="108">
      <template #default="{ row }">
        <div class="admin-table__inline">
          <el-tag :type="getOrderStatusTagType(row.status_label)" size="small">{{ row.status_label }}</el-tag>
          <span v-if="formatWaitMinutes(row.wait_minutes) !== '--'" class="admin-table__sub">
            {{ formatWaitMinutes(row.wait_minutes) }}
          </span>
        </div>
        <div v-if="resolveExceptionTags(row).length" class="admin-table__warn">
          {{ resolveExceptionTags(row)[0] }}
        </div>
      </template>
    </el-table-column>

    <el-table-column label="下单/金额" width="108">
      <template #default="{ row }">
        <div class="admin-table__stack">
          <div class="admin-table__main">{{ formatCompactTime(row.created_at) }}</div>
          <div class="admin-table__sub">¥ {{ row.amount }}</div>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="操作" width="92" align="center">
      <template #default="{ row }">
        <div class="admin-actions--compact">
          <el-button link type="primary" size="small" @click="emit('view-order', row)">详情</el-button>
          <el-dropdown trigger="click" @command="(type) => emit('contact', type, row)">
            <el-button link size="small">联系</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="merchant">联系商家</el-dropdown-item>
                <el-dropdown-item command="rider">联系骑手</el-dropdown-item>
                <el-dropdown-item command="user">联系用户</el-dropdown-item>
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

.orders-filter__input {
  width: 220px;
}

.orders-filter__input--wide {
  width: 320px;
}

.orders-filter__range {
  width: 360px;
}

.orders-alert {
  margin-bottom: 16px;
}

.orders-order-no {
  padding: 0;
  border: 0;
  background: transparent;
  color: #409eff;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  text-align: left;
  display: inline-block;
  max-width: 100%;
}

.orders-order-no:hover {
  text-decoration: underline;
}
</style>
