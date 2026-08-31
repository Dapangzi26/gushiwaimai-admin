<script setup>
// 这个组件是“通过售后退款申请”的二次确认弹窗。
// 职责单一：让操作员先选一下这笔退款的责任归属（配送责 / 商家责），点“确认通过”后把 submit 事件抛回父页。
//
// 关键边界（为什么这么拆）：
// 真正调后端结算、关弹窗、刷新列表都在 index.vue 里做，这里只管收集责任类型 + 抛出 submit。
// dialog 对象由父页透传进来（沿用本目录 OrderListTab/RefundAuditTab 直接 v-model 绑 prop 对象的既有风格），
// 弹窗内直接 v-model 它的 visible / responsibilityType，改起来直观、不额外绕一层。
defineProps({
  // 父页的 refundApproveDialog 响应式对象：{ visible, orderId, responsibilityType }
  dialog: { type: Object, required: true },
  // 确认按钮 loading，避免重复提交
  auditLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['submit'])
</script>

<template>
  <el-dialog
    v-model="dialog.visible"
    title="通过退款申请"
    width="460px"
    :close-on-click-modal="false"
  >
    <p class="orders-dialog__tip">请选择本次退款的责任归属，系统将按选定口径完成结算。</p>
    <el-radio-group v-model="dialog.responsibilityType" class="orders-dialog__radio-group">
      <el-radio value="rider">配送责（商家照常结算，配送方承担商品赔偿）</el-radio>
      <el-radio value="merchant">商家责（商家承担损失，已送达时补骑手配送费）</el-radio>
    </el-radio-group>
    <template #footer>
      <el-button @click="dialog.visible = false">取消</el-button>
      <el-button type="primary" :loading="auditLoading" @click="emit('submit')">确认通过</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.orders-dialog__tip {
  margin: 0 0 16px;
  color: #606266;
  line-height: 1.6;
}

.orders-dialog__radio-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
</style>
