import { normalizeOrderNoDigits } from '../../../utils/orderNo.js'

export function createDefaultOrderFilters() {
  return {
    business_type: '',
    status: '',
    exception_type: '',
    timeout_minutes: '',
    time_range: [],
    keyword: '',
    merchant_name: '',
    town_name: '',
  }
}

export function createDefaultRefundFilters() {
  return {
    status: 'pending',
  }
}

export function resolveList(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.list)) {
    return payload.list
  }

  if (Array.isArray(payload?.items)) {
    return payload.items
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  return []
}

export function resolveTotal(payload, itemsLength) {
  const candidates = [payload?.total, payload?.count, payload?.total_count, payload?.meta?.total, payload?.pagination?.total]
  for (const value of candidates) {
    const total = Number(value)
    if (Number.isFinite(total)) {
      return total
    }
  }
  return itemsLength
}

export function normalizeOrderRecord(item) {
  return {
    id: item?.id ?? '',
    order_no: normalizeOrderNoDigits(item?.order_no) || String(item?.order_no || '').trim() || '--',
    business_label: item?.business_label || '--',
    business_badge: item?.business_badge || '',
    merchant_name: item?.merchant?.name || '--',
    merchant_phone: item?.merchant?.phone || '',
    user_name: item?.buyer?.nickname || item?.contact_name || '--',
    user_phone: item?.buyer?.phone || item?.contact_phone || '',
    rider_name: item?.rider?.nickname || '--',
    rider_phone: item?.rider?.phone || '',
    area_name: item?.display_town_name || item?.customer_town || item?.merchant?.town_name || '--',
    town_name: item?.customer_town || item?.merchant?.town_name || '--',
    status_label: item?.status_label || '--',
    created_at: item?.created_at || '',
    wait_minutes: item?.wait_minutes,
    amount: item?.pay_amount || '--',
    // 每单利润列（D-P22）：后端 formatOrderSummary 已补这些字段，订单列表原来只映射 amount=pay_amount。
    // 镇上单 platform_income_amount 常为 0（商品 15% 计入 rider_fee），展示利润需并列 rider_fee（D-P30）。
    merchant_income_amount: item?.merchant_income_amount ?? '--',
    platform_income_amount: item?.platform_income_amount ?? '--',
    rider_fee: item?.rider_fee ?? '--',
    settled_at: item?.settled_at || '',
    latest_cancel_refund: item?.latest_cancel_refund || null,
    primary_exception_label: item?.primary_exception_label || '',
    exception_tags: Array.isArray(item?.exception_tags) ? item.exception_tags : [],
    raw: item,
  }
}

export function normalizeRefundRecord(item) {
  return {
    id: item?.id ?? '',
    order_id: item?.order_id ?? '',
    refund_no: item?.refund_no || '--',
    order_no: normalizeOrderNoDigits(item?.order_no) || String(item?.order_no || '').trim() || '--',
    amount: item?.amount || '--',
    pay_amount: item?.pay_amount || '--',
    merchant_income_amount: item?.merchant_income_amount ?? '--',
    status: Number(item?.status),
    status_label: item?.status_label || '--',
    reason_type: item?.reason_type || '--',
    description: item?.description || '--',
    reject_reason: item?.reject_reason || '',
    user_claim_direction: item?.user_claim_direction || '',
    responsibility_type: item?.responsibility_type || '',
    responsibility_label: item?.responsibility_label || '',
    apply_source: item?.apply_source || '',
    audit_role: item?.audit_role || '',
    audit_role_label: item?.audit_role_label || '',
    audit_note: item?.audit_note || '',
    merchant_notified_at: item?.merchant_notified_at || '',
    merchant_audit_deadline_at: item?.merchant_audit_deadline_at || '',
    is_merchant_audit_overdue: Boolean(item?.is_merchant_audit_overdue),
    is_merchant_escalated: Boolean(item?.is_merchant_escalated),
    success_at: item?.success_at || '',
    customer_town: item?.customer_town || item?.merchant?.town_name || '--',
    buyer_name: item?.buyer?.nickname || '--',
    buyer_phone: item?.buyer?.phone || '',
    merchant_name: item?.merchant?.name || '--',
    merchant_town_name: item?.merchant?.town_name || '--',
    order_type: item?.order_type || '',
    // B-8：平台能否仲裁，只读后端 can_admin_arbitrate，不在前端镜像 audit_role 规则
    can_admin_arbitrate: typeof item?.can_admin_arbitrate === 'boolean'
      ? item.can_admin_arbitrate
      : null,
    raw: item,
  }
}

export function parseTimeRange(range) {
  if (!Array.isArray(range) || range.length !== 2) {
    return {}
  }

  const [start, end] = range
  return {
    start_time: start || undefined,
    end_time: end || undefined,
  }
}
