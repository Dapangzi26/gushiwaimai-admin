// 总后台详情抽屉/描述列表的统一中文展示工具，避免直接输出 JSON 或英文字段名。
// 本文件是 barrel：现有 import 仍走这一路径，禁止改调用方路径。

export {
  DETAIL_LABEL_MAP,
  IMAGE_FIELDS,
  COMMON_HIDDEN_FIELDS,
  ORDER_DETAIL_HIDDEN,
  MERCHANT_DETAIL_FIELD_ORDER,
  RIDER_DETAIL_FIELD_ORDER,
  ORDER_BASE_FIELD_ORDER,
  ORDER_PARTY_FIELD_ORDER,
} from './detail-display-labels.js'

export {
  getDetailLabel,
  formatTime,
  formatCompactTime,
  getRoleLabel,
  ORDER_STATUS_LABEL_MAP,
  getOrderStatusLabel,
  getIdentityTypeLabel,
  getBusinessScopeLabel,
  getDeliveryScopeLabel,
  getAuditStatusLabel,
  getAccountStatusLabel,
  getApplyStatusLabel,
  getAuditedByRoleLabel,
  getMerchantEntryTypeLabel,
  getApplySourceLabel,
  getResponsibilityTypeLabel,
  getPaymentChannelLabel,
  getBusinessTypeLabel,
  getOrderTypeLabel,
  getOperatorTypeLabel,
  getDispatchStatusLabel,
  getRiderKindLabel,
  formatUserSummary,
} from './detail-display-formatters.js'

export {
  formatDetailField,
  buildDetailEntries,
  buildAssetUrl,
  buildDetailEntry,
} from './detail-display-entries.js'
