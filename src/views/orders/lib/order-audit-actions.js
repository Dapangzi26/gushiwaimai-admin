import { ElMessage, ElMessageBox } from 'element-plus'
import { auditAdminOrderCancel, auditAdminRefund } from '../../../api/orders'
import { REFUND_TAB } from './order-route-query.js'
import { canAdminArbitrateRefund } from './can-admin-arbitrate-refund.js'

export function createOrderAuditActions({
  detailData,
  refundApproveDialog,
  auditLoading,
  loadOrderDetail,
  loadOrders,
  loadRefunds,
  activeTab,
}) {
  // refund 由详情抽屉在点“通过取消”时把 pendingCancelRefund 一并 emit 上来
  async function handleApproveCancel(refund) {
    const currentOrderId = detailData.value?.id
    if (!currentOrderId || !refund) {
      ElMessage.warning('当前没有待审核的取消申请')
      return
    }

    try {
      const { value } = await ElMessageBox.prompt(
        '这里填后台最终同意退款的金额。填全额就是无责取消，少于实付金额就是按人工审核结果扣除取消费用。',
        '通过取消申请',
        {
          confirmButtonText: '确认通过',
          cancelButtonText: '取消',
          inputValue: refund.amount || detailData.value?.pay_amount || '0.00',
          inputPattern: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
          inputErrorMessage: '请输入合法的退款金额',
        },
      )

      auditLoading.value = true
      await auditAdminOrderCancel(currentOrderId, {
        action: 'approve',
        refund_amount: value,
        responsibility_type: 'platform',
        audit_note: '后台人工审核通过取消申请',
      })
      ElMessage.success('已通过取消申请')
      await refreshAfterAudit(currentOrderId)
    } catch (error) {
      if (error !== 'cancel') {
        throw error
      }
    } finally {
      auditLoading.value = false
    }
  }

  // refund 同样来自详情抽屉的 emit；这里只用它判断“确实有待审核的取消申请”
  async function handleRejectCancel(refund) {
    const currentOrderId = detailData.value?.id
    if (!currentOrderId || !refund) {
      ElMessage.warning('当前没有待审核的取消申请')
      return
    }

    try {
      const { value } = await ElMessageBox.prompt(
        '这里填写驳回原因，用户端会直接看到这条说明。',
        '驳回取消申请',
        {
          confirmButtonText: '确认驳回',
          cancelButtonText: '取消',
          inputPattern: /^.{2,255}$/,
          inputErrorMessage: '驳回原因至少写 2 个字',
        },
      )

      auditLoading.value = true
      await auditAdminOrderCancel(currentOrderId, {
        action: 'reject',
        reject_reason: value,
        audit_note: '后台人工审核驳回取消申请',
      })
      ElMessage.success('已驳回取消申请')
      await refreshAfterAudit(currentOrderId)
    } catch (error) {
      if (error !== 'cancel') {
        throw error
      }
    } finally {
      auditLoading.value = false
    }
  }

  // targetRow 可能来自退款 Tab 的表格行，也可能来自详情抽屉 emit 的 pendingAfterSaleRefund
  async function handleApproveRefund(targetRow = null) {
    const row = targetRow
    const currentOrderId = targetRow?.order_id || detailData.value?.id
    if (!currentOrderId) {
      ElMessage.warning('当前没有待处理的退款申请')
      return
    }

    if (row && !canAdminArbitrateRefund(row)) {
      ElMessage.warning('该退款尚在商家或站长审核阶段，平台暂不可仲裁')
      return
    }

    refundApproveDialog.orderId = currentOrderId
    refundApproveDialog.responsibilityType = 'rider'
    refundApproveDialog.visible = true
  }

  async function submitRefundApprove() {
    const currentOrderId = refundApproveDialog.orderId
    if (!currentOrderId) {
      return
    }

    auditLoading.value = true
    try {
      await auditAdminRefund(currentOrderId, {
        action: 'approve',
        responsibility_type: refundApproveDialog.responsibilityType,
        audit_note: `总后台通过售后退款申请（责任：${refundApproveDialog.responsibilityType === 'merchant' ? '商家' : '配送'}）`,
      })
      refundApproveDialog.visible = false
      ElMessage.success('已通过退款申请')
      await refreshAfterAudit(currentOrderId)
    } finally {
      auditLoading.value = false
    }
  }

  // 同 handleApproveRefund：targetRow 来自退款 Tab 表格行或详情抽屉 emit
  async function handleRejectRefund(targetRow = null) {
    const row = targetRow
    const currentOrderId = targetRow?.order_id || detailData.value?.id
    if (!currentOrderId) {
      ElMessage.warning('当前没有待处理的退款申请')
      return
    }

    if (row && !canAdminArbitrateRefund(row)) {
      ElMessage.warning('该退款尚在商家或站长审核阶段，平台暂不可仲裁')
      return
    }

    try {
      const { value } = await ElMessageBox.prompt(
        '这里填写驳回原因，用户端会直接看到这条说明。',
        '驳回退款申请',
        {
          confirmButtonText: '确认驳回',
          cancelButtonText: '取消',
          inputPattern: /^.{2,255}$/,
          inputErrorMessage: '驳回原因至少写 2 个字',
        },
      )

      auditLoading.value = true
      await auditAdminRefund(currentOrderId, {
        action: 'reject',
        reject_reason: value,
        audit_note: '总后台驳回售后退款申请',
      })
      ElMessage.success('已驳回退款申请')
      await refreshAfterAudit(currentOrderId)
    } catch (error) {
      if (error !== 'cancel') {
        throw error
      }
    } finally {
      auditLoading.value = false
    }
  }

  // 审核结束后，当前详情和列表都要一起刷新。
  // 不然你会看到详情已变，但列表还是旧状态，容易误以为没成功。
  async function refreshAfterAudit(currentOrderId) {
    if (currentOrderId) {
      await loadOrderDetail(currentOrderId)
    }

    if (activeTab.value === REFUND_TAB) {
      await loadRefunds()
      return
    }

    await loadOrders()
  }

  return {
    handleApproveCancel,
    handleRejectCancel,
    handleApproveRefund,
    submitRefundApprove,
    handleRejectRefund,
    refreshAfterAudit,
  }
}
