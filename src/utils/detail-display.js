// 总后台详情抽屉/描述列表的统一中文展示工具，避免直接输出 JSON 或英文字段名。

export const DETAIL_LABEL_MAP = {
  id: 'ID',
  order_no: '订单号',
  store_name: '店铺名称',
  merchant_name: '店铺名称',
  merchant_nickname: '联系人',
  contact_name: '联系人',
  nickname: '昵称',
  name: '名称',
  phone: '联系电话',
  contact_phone: '联系电话',
  mobile: '手机号',
  town_code: '乡镇编码',
  town_name: '所属乡镇',
  rider_town: '所属乡镇',
  address: '地址',
  address_detail: '详细地址',
  description: '简介',
  remark: '备注',
  category: '主营类目',
  business_scope: '业务板块',
  business_label: '业务标签',
  business_type: '业务类型',
  business_badge: '业务标识',
  order_type: '订单分类',
  business_license: '营业执照',
  logo: '店铺 Logo',
  cover: '店铺封面',
  avatar: '头像',
  audit_status: '审核状态码',
  audit_status_text: '审核状态',
  apply_status: '申请状态码',
  apply_status_text: '审核状态',
  rider_audit_status: '审核状态码',
  status: '账号状态',
  status_label: '当前状态',
  created_at: '创建时间',
  submitted_at: '提交时间',
  updated_at: '更新时间',
  apply_time: '申请时间',
  audited_by_role: '审核方',
  audited_by_user_id: '审核人ID',
  audited_by_name: '审核人',
  audited_at: '审核时间',
  reject_reason: '驳回原因',
  identity_type: '身份类型',
  rider_kind: '骑手类型',
  rider_level: '骑手等级',
  delivery_scope: '配送范围',
  id_card_front: '身份证人像面',
  id_card_back: '身份证国徽面',
  id_card_hold: '手持身份证',
  health_certificate: '健康证',
  driving_license: '驾驶证',
  vehicle_license: '行驶证',
  user: '关联账号',
  user_id: '关联用户ID',
  merchant_entry_type: '入驻类型',
  franchise_brand_name: '加盟品牌',
  franchise_brand_id: '品牌ID',
  also_list_in_county_food: '同步展示在县城美食',
  supermarket_delivery_permission: '超市配送权限',
  license_no: '执照编号',
  audit_locked_reason: '审核锁定原因',
  role: '账号角色',
  paid_at: '支付时间',
  accepted_at: '接单时间',
  delivered_at: '送达时间',
  settled_at: '结算时间',
  pay_amount: '实付金额',
  total_amount: '订单金额',
  rider_fee: '配送费',
  merchant_income_amount: '商家应得',
  platform_income_amount: '平台收益',
  commission_amount: '抽佣金额',
  rider_incentive_amount: '骑手激励',
  customer_town: '用户乡镇',
  display_town_name: '展示乡镇',
  cancel_reason: '取消原因',
  payment_channel: '支付渠道',
  dispatch_center_status: '调度状态',
  refund_no: '退款单号',
  amount: '退款金额',
  reason_type: '申请类型',
  apply_source: '申请来源',
  responsibility_type: '责任归属',
  user_claim_direction: '用户申诉方向',
  responsibility_label: '责任归属',
  cancel_fee_amount: '取消扣费',
  is_full_refund: '是否全额退款',
  audit_note: '审核备注',
  audit_role: '审核角色',
  audit_role_label: '审核角色',
  audit_user_id: '审核人ID',
  bearer_user_id: '承担人ID',
  bearer_amount: '承担金额',
  merchant_audit_at: '商家处理时间',
  success_at: '退款成功时间',
  bound_merchant_id: '绑定商家ID',
  merchant_binding_code: '商家绑定码',
  action: '操作',
  operator_type: '操作方',
  operator_id: '操作人ID',
  from_status: '原状态',
  to_status: '新状态',
  is_merchant_audit_overdue: '商家处理超时',
  is_merchant_escalated: '已转平台处理',
}

export const IMAGE_FIELDS = new Set([
  'business_license',
  'logo',
  'cover',
  'avatar',
  'id_card_front',
  'id_card_back',
  'id_card_hold',
  'health_certificate',
  'driving_license',
  'vehicle_license',
])

export const COMMON_HIDDEN_FIELDS = new Set([
  'apply_status',
  'audit_status',
  'rider_audit_status',
  'store_name',
  'merchant_nickname',
  'phone',
  'user_id',
  'franchise_brand_id',
  'can_stationmaster_audit',
  'can_admin_audit',
  'audit_locked',
  'raw',
])

export const ORDER_DETAIL_HIDDEN = new Set([
  ...COMMON_HIDDEN_FIELDS,
  'status',
  'merchant',
  'buyer',
  'rider',
  'refunds',
  'logs',
  'business_badge',
])

export const MERCHANT_DETAIL_FIELD_ORDER = [
  'id',
  'merchant_name',
  'contact_name',
  'contact_phone',
  'user',
  'business_scope',
  'merchant_entry_type',
  'franchise_brand_name',
  'town_name',
  'town_code',
  'address',
  'category',
  'remark',
  'business_license',
  'logo',
  'cover',
  'apply_status_text',
  'audited_by_role',
  'audited_by_name',
  'audited_at',
  'reject_reason',
  'audit_locked_reason',
  'status',
  'submitted_at',
  'created_at',
  'updated_at',
]

export const RIDER_DETAIL_FIELD_ORDER = [
  'id',
  'nickname',
  'phone',
  'user',
  'identity_type',
  'delivery_scope',
  'rider_kind',
  'rider_level',
  'town_name',
  'town_code',
  'rider_town',
  'address',
  'merchant_name',
  'merchant_binding_code',
  'bound_merchant_id',
  'avatar',
  'id_card_front',
  'id_card_back',
  'id_card_hold',
  'health_certificate',
  'driving_license',
  'vehicle_license',
  'apply_status_text',
  'audit_status_text',
  'audited_by_role',
  'audited_by_name',
  'audited_at',
  'reject_reason',
  'status',
  'created_at',
  'updated_at',
]

export const ORDER_BASE_FIELD_ORDER = [
  'id',
  'order_no',
  'business_label',
  'business_type',
  'order_type',
  'status_label',
  'pay_amount',
  'total_amount',
  'rider_fee',
  'commission_amount',
  'platform_income_amount',
  'merchant_income_amount',
  'rider_incentive_amount',
  'payment_channel',
  'contact_name',
  'contact_phone',
  'address',
  'customer_town',
  'display_town_name',
  'remark',
  'cancel_reason',
  'dispatch_center_status',
  'created_at',
  'paid_at',
  'accepted_at',
  'delivered_at',
  'settled_at',
]

export const ORDER_PARTY_FIELD_ORDER = [
  'id',
  'name',
  'nickname',
  'phone',
  'town_name',
  'address',
  'business_scope',
  'category',
  'role',
  'identity_type',
  'delivery_scope',
]

export function getDetailLabel(key) {
  return DETAIL_LABEL_MAP[key] || key
}

export function formatTime(value) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN', { hour12: false })
}

export function formatCompactTime(value) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hours}:${minutes}`
}

export function getRoleLabel(role) {
  if (role === 'merchant') return '商家'
  if (role === 'rider') return '骑手'
  if (role === 'admin') return '管理员'
  if (role === 'user') return '用户'
  if (role === 'merchant_delivery') return '商家自配送员'
  return role || '--'
}

export const ORDER_STATUS_LABEL_MAP = {
  0: '待付款',
  1: '待接单',
  2: '备餐中',
  3: '待配送',
  4: '骑手已接单',
  5: '配送中',
  6: '已完成',
  7: '已取消',
}

export const REFUND_STATUS_LABEL_MAP = {
  0: '待后台审核',
  1: '审核通过，退款处理中',
  2: '退款成功',
  3: '后台已驳回',
  4: '用户已撤销申请',
}

export function getOrderStatusLabel(status) {
  if (status === null || status === undefined || status === '') {
    return '--'
  }

  const numericStatus = Number(status)
  if (Number.isFinite(numericStatus) && ORDER_STATUS_LABEL_MAP[numericStatus]) {
    return ORDER_STATUS_LABEL_MAP[numericStatus]
  }

  return String(status)
}

export function getRefundStatusLabel(status) {
  if (status === null || status === undefined || status === '') {
    return '--'
  }

  const numericStatus = Number(status)
  if (Number.isFinite(numericStatus) && REFUND_STATUS_LABEL_MAP[numericStatus]) {
    return REFUND_STATUS_LABEL_MAP[numericStatus]
  }

  return String(status)
}

export function getIdentityTypeLabel(type) {
  if (!type) {
    return '--'
  }

  const identityMap = {
    商家自配送员: '商家自配送员',
    乡镇站长: '乡镇站长',
    乡镇骑手: '乡镇骑手',
    县城骑手: '县城骑手',
    merchant_delivery: '商家自配送员',
    stationmaster: '乡镇站长',
    town_stationmaster: '乡镇站长',
    town_rider: '乡镇骑手',
    county_rider: '县城骑手',
    rider: '普通骑手',
    captain: '乡镇站长',
  }

  return identityMap[type] || type
}

export function getBusinessScopeLabel(scope) {
  if (scope === 'county_food') return '县城美食'
  if (scope === 'town_food') return '乡镇美食'
  return scope || '--'
}

export function getDeliveryScopeLabel(scope) {
  if (scope === 'county_delivery') return '县城配送'
  if (scope === 'town_delivery') return '乡镇配送'
  return scope || '--'
}

export function getAuditStatusLabel(status) {
  if (Number(status) === 0) return '待审核'
  if (Number(status) === 1) return '已通过'
  if (Number(status) === 2) return '已拒绝'
  return String(status ?? '--')
}

export function getAccountStatusLabel(status) {
  if (Number(status) === 1) return '正常'
  if (Number(status) === 0) return '禁用'
  return String(status ?? '--')
}

export function getApplyStatusLabel(status) {
  const normalized = String(status).toLowerCase()
  if (normalized === 'pending' || Number(status) === 0) return '待审核'
  if (normalized === 'approved' || Number(status) === 1) return '已通过'
  if (normalized === 'rejected' || Number(status) === 2) return '已驳回'
  return String(status)
}

export function getAuditedByRoleLabel(role) {
  if (role === 'stationmaster') return '乡镇站长'
  if (role === 'admin') return '总后台'
  return role || '--'
}

export function getMerchantEntryTypeLabel(entryType) {
  if (entryType === 'brand_store') return '品牌店铺'
  if (entryType === 'food') return '餐饮商家'
  if (entryType === 'supermarket') return '超市商家'
  return entryType || '--'
}

export function getApplySourceLabel(source) {
  if (source === 'after_sale') return '售后退款'
  if (source === 'cancel') return '取消申请'
  return source || '--'
}

export function getResponsibilityTypeLabel(type) {
  if (type === 'platform') return '平台'
  if (type === 'merchant') return '商家'
  if (type === 'rider') return '骑手/站长'
  if (type === 'user') return '用户'
  if (type === 'delivery') return '配送方'
  return type || '--'
}

export function getPaymentChannelLabel(channel) {
  if (channel === 'wechat') return '微信支付'
  if (channel === 'alipay') return '支付宝'
  if (channel === 'mock') return '模拟支付'
  return channel || '--'
}

export function getBusinessTypeLabel(type) {
  if (type === 'county') return '县城外卖'
  if (type === 'town') return '乡镇外卖'
  if (type === 'supermarket') return '附近超市'
  return type || '--'
}

export function getOrderTypeLabel(type) {
  if (type === 'county') return '县城订单'
  if (type === 'town') return '乡镇订单'
  if (type === 'supermarket') return '超市订单'
  return type || '--'
}

export function getOperatorTypeLabel(type) {
  if (type === 'user') return '用户'
  if (type === 'merchant') return '商家'
  if (type === 'rider') return '骑手'
  if (type === 'admin') return '管理员'
  if (type === 'system') return '系统'
  return type || '--'
}

export function getDispatchStatusLabel(status) {
  if (status === 'pending') return '待调度'
  if (status === 'assigned') return '已派单'
  if (status === 'completed') return '已完成'
  return status || '--'
}

export function getRiderKindLabel(riderKind) {
  if (riderKind === 'stationmaster') return '乡镇站长'
  if (riderKind === 'rider') return '普通骑手'
  return riderKind || '--'
}

export function formatUserSummary(user) {
  if (!user || typeof user !== 'object') {
    return '--'
  }

  const lines = [
    user.nickname ? `昵称：${user.nickname}` : '',
    user.phone ? `手机号：${user.phone}` : '',
    user.id ? `账号ID：${user.id}` : '',
    user.role ? `角色：${getRoleLabel(user.role)}` : '',
    user.status !== undefined && user.status !== null && user.status !== ''
      ? `账号状态：${getAccountStatusLabel(user.status)}`
      : '',
  ].filter(Boolean)

  return lines.length ? lines.join('\n') : '--'
}

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
    .filter((entry) => entry.value !== '--' || ['reject_reason', 'audit_locked_reason', 'remark'].includes(entry.key))
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
