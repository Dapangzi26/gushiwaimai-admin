<script setup>
// 这个文件是“总后台订单中心”。
// 这里现在同时承接两条链路：
// 1. 用户取消订单后，进入后台人工审核的“取消申请”
// 2. 用户申请售后退款后，进入平台处理的“售后退款 / 平台介入”
// 这样你在总后台里就不用再分散到别的页面找处理入口了。
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RefundAuditTab from './RefundAuditTab.vue'
import OrderListTab from './OrderListTab.vue'
// D-1：订单详情抽屉、退款责任弹窗都拆成同目录子组件，父页只做“取数 + 编排”
import OrderDetailDrawer from './OrderDetailDrawer.vue'
import RefundApproveDialog from './RefundApproveDialog.vue'
import { getBackendOrigin } from '../../utils/backend-origin'
import {
  createDefaultOrderFilters,
  createDefaultRefundFilters,
} from './lib/order-list-normalize.js'
import {
  DEFAULT_PAGE_SIZE,
  ORDER_TAB,
  REFUND_TAB,
  createOrderRouteQuery,
  normalizeQueryObject,
} from './lib/order-route-query.js'
import { createOrderListLoad } from './lib/order-list-load.js'
import { createOrderAuditActions } from './lib/order-audit-actions.js'

const route = useRoute()
const router = useRouter()
const backendOrigin = getBackendOrigin()

const TAB_OPTIONS = [
  { label: '订单列表', value: ORDER_TAB },
  { label: '售后退款 / 平台介入', value: REFUND_TAB },
]

const BUSINESS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '县城外卖', value: 'county_takeout' },
  { label: '乡镇外卖', value: 'town_takeout' },
]

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待接单', value: '1' },
  { label: '备餐中', value: '2' },
  { label: '待配送', value: '3' },
  { label: '待取餐', value: '4' },
  { label: '配送中', value: '5' },
  { label: '已送达待确认', value: '8' },
  { label: '已完成', value: '6' },
  { label: '已取消', value: '7' },
]

const EXCEPTION_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待接单预警', value: 'timeout_unaccepted' },
  { label: '待补账', value: 'settlement_pending' },
]

const REFUND_STATUS_OPTIONS = [
  { label: '待处理', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '全部', value: 'all' },
]

const activeTab = ref(ORDER_TAB)
const highlightOrderId = ref('')

const orderListState = reactive({
  loading: false,
  error: '',
  items: [],
  total: 0,
})

const refundListState = reactive({
  loading: false,
  error: '',
  items: [],
  total: 0,
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailData = ref(null)
const auditLoading = ref(false)
const refundApproveDialog = reactive({
  visible: false,
  orderId: null,
  responsibilityType: 'rider',
})

const orderFilters = reactive(createDefaultOrderFilters())
const refundFilters = reactive(createDefaultRefundFilters())

const orderPagination = reactive({
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
})

const refundPagination = reactive({
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
})

const {
  getOrderQueryParams,
  getRefundQueryParams,
  syncStateFromRoute,
  buildCurrentRouteQuery,
} = createOrderRouteQuery({
  orderFilters,
  refundFilters,
  orderPagination,
  refundPagination,
  activeTab,
  highlightOrderId,
})

async function replaceCurrentRouteQuery() {
  const nextQuery = buildCurrentRouteQuery()
  const currentQuery = normalizeQueryObject(route.query)

  if (JSON.stringify(nextQuery) === JSON.stringify(currentQuery)) {
    if (activeTab.value === REFUND_TAB) {
      await loadRefunds()
    } else if (activeTab.value === ORDER_TAB) {
      await loadOrders()
    }
    return
  }

  await router.replace({ path: route.path, query: nextQuery })
}

const {
  loadOrders,
  loadRefunds,
  handleTabChange,
  relaxFiltersForOrderNumberSearch,
  handleOrderNoClick,
  handleSearch,
  handleReset,
  handleCurrentChange,
  handleSizeChange,
  loadOrderDetail,
  handleViewOrder,
  handleViewRefund,
  handleContact,
  scrollToHighlightedOrder,
} = createOrderListLoad({
  orderListState,
  refundListState,
  orderFilters,
  refundFilters,
  orderPagination,
  refundPagination,
  activeTab,
  highlightOrderId,
  detailVisible,
  detailLoading,
  detailError,
  detailData,
  getOrderQueryParams,
  getRefundQueryParams,
  replaceCurrentRouteQuery,
})

const {
  handleApproveCancel,
  handleRejectCancel,
  handleApproveRefund,
  submitRefundApprove,
  handleRejectRefund,
} = createOrderAuditActions({
  detailData,
  refundApproveDialog,
  auditLoading,
  loadOrderDetail,
  loadOrders,
  loadRefunds,
  activeTab,
})

watch(
  () => route.query,
  async (query) => {
    syncStateFromRoute(query)

    if (activeTab.value === ORDER_TAB && relaxFiltersForOrderNumberSearch()) {
      await replaceCurrentRouteQuery()
      return
    }

    if (activeTab.value === REFUND_TAB) {
      await loadRefunds()
    } else if (activeTab.value === ORDER_TAB) {
      await loadOrders()
      await scrollToHighlightedOrder()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="page-shell">
    <h1 class="page-shell__title">订单中心</h1>

    <el-card class="page-shell__card orders-page">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane
          v-for="item in TAB_OPTIONS"
          :key="item.value"
          :label="item.label"
          :name="item.value"
        />
      </el-tabs>

      <OrderListTab
        v-if="activeTab === ORDER_TAB"
        :filters="orderFilters"
        :business-options="BUSINESS_OPTIONS"
        :status-options="STATUS_OPTIONS"
        :exception-options="EXCEPTION_OPTIONS"
        :list-state="orderListState"
        :highlight-order-id="highlightOrderId"
        @search="handleSearch"
        @reset="handleReset"
        @reload="loadOrders"
        @view-order="handleViewOrder"
        @order-no-click="handleOrderNoClick"
        @contact="handleContact"
      />

      <RefundAuditTab
        v-else-if="activeTab === REFUND_TAB"
        :filters="refundFilters"
        :status-options="REFUND_STATUS_OPTIONS"
        :list-state="refundListState"
        :audit-loading="auditLoading"
        @search="handleSearch"
        @reset="handleReset"
        @reload="loadRefunds"
        @view-refund="handleViewRefund"
        @approve="handleApproveRefund"
        @reject="handleRejectRefund"
      />

      <div class="orders-pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :current-page="activeTab === REFUND_TAB ? refundPagination.page : orderPagination.page"
          :page-size="activeTab === REFUND_TAB ? refundPagination.pageSize : orderPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="activeTab === REFUND_TAB ? refundListState.total : orderListState.total"
          @current-change="handleCurrentChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 订单详情抽屉：只展示，用户点的通过/驳回/拨号动作通过事件回传给本页处理 -->
    <OrderDetailDrawer
      v-model:visible="detailVisible"
      :detail-data="detailData"
      :detail-loading="detailLoading"
      :detail-error="detailError"
      :audit-loading="auditLoading"
      :backend-origin="backendOrigin"
      @approve-cancel="handleApproveCancel"
      @reject-cancel="handleRejectCancel"
      @approve-refund="handleApproveRefund"
      @reject-refund="handleRejectRefund"
      @contact="handleContact"
    />

    <!-- 通过退款前选责任归属的弹窗；确认后回到本页 submitRefundApprove 调后端结算 -->
    <RefundApproveDialog
      :dialog="refundApproveDialog"
      :audit-loading="auditLoading"
      @submit="submitRefundApprove"
    />
  </div>
</template>

<style scoped>
.orders-table__row--highlight > td {
  background: #fff7e6 !important;
}

.orders-page {
  border-radius: 12px;
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

.orders-table__main {
  font-size: 12px;
  line-height: 1.35;
}

.orders-table__sub {
  margin-top: 2px;
  color: #909399;
  font-size: 11px;
  line-height: 1.3;
}

.orders-table__exception {
  margin-top: 2px;
  color: #f56c6c;
  font-size: 11px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orders-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
