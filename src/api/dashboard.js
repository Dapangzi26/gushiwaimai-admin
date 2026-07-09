import request from '../utils/request'

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

function unwrapPayload(response) {
  return response?.data ?? response
}
