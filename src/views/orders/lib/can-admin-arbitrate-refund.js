/**
 * 平台是否可仲裁该笔售后退款（C3：只读后端 can_admin_arbitrate）。
 * 缺字段时不猜业务规则，默认不可操作，避免与 policy 漂移。
 */
export function canAdminArbitrateRefund(row) {
  if (!row || Number(row.status) !== 0) {
    return false
  }

  if (row.apply_source && row.apply_source !== 'after_sale') {
    return false
  }

  if (typeof row.can_admin_arbitrate === 'boolean') {
    return row.can_admin_arbitrate
  }
  if (typeof row.raw?.can_admin_arbitrate === 'boolean') {
    return row.raw.can_admin_arbitrate
  }

  return false
}
