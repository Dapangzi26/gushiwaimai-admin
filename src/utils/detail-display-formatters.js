// 详情抽屉文案 / 时间 / get*Label。getRoleLabel 是管理员角色，不是消息页本地那份。
import { DETAIL_LABEL_MAP } from './detail-display-labels.js'

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
  4: '待取餐',
  5: '配送中',
  8: '已送达待确认',
  6: '已完成',
  7: '已取消',
}

/**
 * 订单状态展示文案：优先读接口 status_text（规则单真源），缺字段再回落本地 map。
 * @param {number|string|object} statusOrRecord - 状态码，或含 status/status_text 的对象
 */
export function getOrderStatusLabel(statusOrRecord) {
  if (statusOrRecord === null || statusOrRecord === undefined || statusOrRecord === '') {
    return '--'
  }

  if (typeof statusOrRecord === 'object' && !Array.isArray(statusOrRecord)) {
    const fromBackend = statusOrRecord.status_text || statusOrRecord.statusText
    if (fromBackend) {
      return String(fromBackend)
    }
    return getOrderStatusLabel(statusOrRecord.status)
  }

  const numericStatus = Number(statusOrRecord)
  if (Number.isFinite(numericStatus) && ORDER_STATUS_LABEL_MAP[numericStatus]) {
    return ORDER_STATUS_LABEL_MAP[numericStatus]
  }

  return String(statusOrRecord)
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
