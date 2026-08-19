// 语音提醒 Outbox 监控（只读）。
import request from '../utils/request'
import { unwrapPayload } from './helpers'

export async function fetchNotifyDeliveryStats(params = {}) {
  const response = await request.get('/admin/notify-delivery/stats', { params })
  return unwrapPayload(response)
}

export async function fetchRecentUnackedNotifyDeliveries(params = {}) {
  const response = await request.get('/admin/notify-delivery/unacked', { params })
  return unwrapPayload(response)
}
