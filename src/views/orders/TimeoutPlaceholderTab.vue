<script setup>
import { ref } from 'vue'
import { formatOrderNoDisplay } from '../../utils/orderNo.js'
import { formatCompactTime } from '../../utils/detail-display'

defineProps({
  filters: { type: Object, required: true },
  statusOptions: { type: Array, required: true },
})

const emit = defineEmits(['search', 'reset'])

const timeoutTableData = ref([])
</script>

<template>
  <el-alert
    type="info"
    show-icon
    :closable="false"
    class="orders-alert"
    title="商家接单超时提醒（功能占位）"
    description="用于展示商家长时间未接单的订单，便于运营跟进提醒。列表数据与提醒动作待后端接口与业务规则确定后接入。"
  />

  <el-form :inline="true" class="orders-filters" @submit.prevent>
    <el-form-item label="提醒状态">
      <el-select v-model="filters.status" class="orders-filter__select">
        <el-option
          v-for="item in statusOptions"
          :key="item.value || 'all-timeout-status'"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
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

    <el-form-item label="订单号/联系人">
      <el-input
        v-model="filters.keyword"
        placeholder="订单号、联系人、手机号"
        clearable
        class="orders-filter__input orders-filter__input--wide"
        @keyup.enter="emit('search')"
      />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="emit('search')">查询</el-button>
      <el-button @click="emit('reset')">重置</el-button>
    </el-form-item>
  </el-form>

  <el-table
    :data="timeoutTableData"
    border
    size="small"
    class="orders-table admin-table--compact"
    empty-text="暂无超时待提醒订单（接口待接入）"
  >
    <el-table-column label="订单号" width="168">
      <template #default="{ row }">
        <span class="admin-table__order-no">
          {{ formatOrderNoDisplay(row.order_no) || row.order_no || '--' }}
        </span>
      </template>
    </el-table-column>

    <el-table-column label="商家" min-width="120" show-overflow-tooltip>
      <template #default="{ row }">{{ row.merchant_name || '--' }}</template>
    </el-table-column>

    <el-table-column label="下单时间" width="108">
      <template #default="{ row }">{{ formatCompactTime(row.created_at) }}</template>
    </el-table-column>

    <el-table-column label="等待时长" width="96" align="center">
      <template #default="{ row }">
        {{ row.wait_minutes != null ? `${row.wait_minutes} 分钟` : '--' }}
      </template>
    </el-table-column>

    <el-table-column label="提醒状态" width="100" align="center">
      <template #default="{ row }">
        <el-tag type="warning" size="small">{{ row.remind_status_label || '待提醒' }}</el-tag>
      </template>
    </el-table-column>

    <el-table-column label="操作" width="120" align="center">
      <template #default>
        <el-button link type="primary" size="small" disabled>提醒商家</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
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

.orders-alert {
  margin-bottom: 16px;
}
</style>
