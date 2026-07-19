import request from '../utils/request'
import { unwrapPayload } from './helpers'

export async function fetchDashboardOverview() {
  const response = await request.get('/admin/dashboard/overview')
  return unwrapPayload(response)
}

export async function fetchDashboardPendingCounts() {
  const response = await request.get('/admin/dashboard/pending-counts', {
    params: { timeout_minutes: 5 },
  })
  return unwrapPayload(response)
}
