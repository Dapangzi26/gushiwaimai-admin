// 详情抽屉条目组装。依赖 labels / formatters，不复制一份。
import { COMMON_HIDDEN_FIELDS, IMAGE_FIELDS } from './detail-display-labels.js'
import {
  formatTime,
  formatUserSummary,
  getAccountStatusLabel,
  getApplySourceLabel,
  getApplyStatusLabel,
  getAuditedByRoleLabel,
  getBusinessScopeLabel,
  getBusinessTypeLabel,
  getDeliveryScopeLabel,
  getDetailLabel,
  getDispatchStatusLabel,
  getIdentityTypeLabel,
  getMerchantEntryTypeLabel,
  getOperatorTypeLabel,
  getOrderStatusLabel,
  getOrderTypeLabel,
  getPaymentChannelLabel,
  getResponsibilityTypeLabel,
  getRiderKindLabel,
  getRoleLabel,
} from './detail-display-formatters.js'

function formatGenericObject(value) {
  const lines = Object.entries(value)
    .filter(([, itemValue]) => itemValue !== null && itemValue !== undefined && itemValue !== '')
    .map(([itemKey, itemValue]) => {
      const label = getDetailLabel(itemKey)
      const text =
        typeof itemValue === 'object'
          ? formatGenericObject(itemValue)
          : formatDetailField(itemKey, itemValue)
      return `${label}：${text}`
    })

  return lines.length ? lines.join('\n') : '--'
}

export function formatDetailField(key, value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  if (key === 'user') {
    return formatUserSummary(value)
  }

  if (key === 'audit_status' || key === 'apply_status' || key === 'rider_audit_status') {
    return getApplyStatusLabel(value)
  }

  if (key === 'apply_status_text' || key === 'audit_status_text' || key === 'status_label') {
    return String(value)
  }

  if (key === 'status') {
    return getAccountStatusLabel(value)
  }

  if (key === 'business_scope') {
    return getBusinessScopeLabel(value)
  }

  if (key === 'rider_kind') {
    return getRiderKindLabel(value)
  }

  if (key === 'delivery_scope') {
    return getDeliveryScopeLabel(value)
  }

  if (key === 'audited_by_role' || key === 'audit_role') {
    return getAuditedByRoleLabel(value)
  }

  if (key === 'merchant_entry_type') {
    return getMerchantEntryTypeLabel(value)
  }

  if (key === 'role') {
    return getRoleLabel(value)
  }

  if (key === 'identity_type') {
    return getIdentityTypeLabel(value)
  }

  if (key === 'apply_source') {
    return getApplySourceLabel(value)
  }

  if (key === 'responsibility_type' || key === 'user_claim_direction') {
    return getResponsibilityTypeLabel(value)
  }

  if (key === 'payment_channel') {
    return getPaymentChannelLabel(value)
  }

  if (key === 'business_type') {
    return getBusinessTypeLabel(value)
  }

  if (key === 'order_type') {
    return getOrderTypeLabel(value)
  }

  if (key === 'operator_type') {
    return getOperatorTypeLabel(value)
  }

  if (key === 'from_status' || key === 'to_status') {
    return getOrderStatusLabel(value)
  }

  if (key === 'dispatch_center_status') {
    return getDispatchStatusLabel(value)
  }

  if (
    key === 'also_list_in_county_food'
    || key === 'is_full_refund'
    || key === 'is_merchant_audit_overdue'
    || key === 'is_merchant_escalated'
  ) {
    return value ? '是' : '否'
  }

  if (
    key === 'created_at'
    || key === 'updated_at'
    || key === 'apply_time'
    || key === 'submitted_at'
    || key === 'audited_at'
    || key === 'paid_at'
    || key === 'accepted_at'
    || key === 'delivered_at'
    || key === 'settled_at'
    || key === 'merchant_audit_at'
    || key === 'success_at'
  ) {
    return formatTime(value)
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  if (Array.isArray(value)) {
    return value.length ? value.map((item) => String(item)).join('、') : '--'
  }

  if (typeof value === 'object') {
    return formatGenericObject(value)
  }

  if (typeof value === 'number' && /amount|fee|income|commission/.test(key)) {
    return `¥${value}`
  }

  return value
}

export function buildDetailEntries(data, options = {}) {
  const {
    fieldOrder = [],
    hiddenFields = COMMON_HIDDEN_FIELDS,
    backendOrigin = '',
  } = options

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return []
  }

  const keys = fieldOrder.length
    ? fieldOrder.filter((key) => key in data && !hiddenFields.has(key))
    : Object.keys(data).filter((key) => !hiddenFields.has(key))

  return keys
    .map((key) => (
      backendOrigin || IMAGE_FIELDS.has(key)
        ? buildDetailEntry(key, data[key], backendOrigin)
        : {
            key,
            label: getDetailLabel(key),
            value: formatDetailField(key, data[key]),
          }
    ))
    // settled_at 加入“空值也保留”名单（D-P12）：未结算单结算时间为空会显示「--」，
    // 保留后才能看出「已完成但还没入账」，而不是被静默滤掉当作没这回事。
    .filter((entry) => entry.value !== '--' || ['reject_reason', 'audit_locked_reason', 'remark', 'settled_at'].includes(entry.key))
}

export function buildAssetUrl(value, backendOrigin = '') {
  if (!value || typeof value !== 'string') {
    return ''
  }

  if (/^https?:\/\//.test(value)) {
    return value
  }

  if (!backendOrigin) {
    return value
  }

  return `${backendOrigin}${value.startsWith('/') ? value : `/${value}`}`
}

export function buildDetailEntry(key, value, backendOrigin = '') {
  return {
    key,
    label: getDetailLabel(key),
    isImage: IMAGE_FIELDS.has(key) && Boolean(buildAssetUrl(value, backendOrigin)),
    imageUrl: buildAssetUrl(value, backendOrigin),
    value: formatDetailField(key, value),
  }
}

