/**
 * 管理端 Admin API 连通性自检（需本地后端已启动）
 * 用法：node scripts/verify-admin-api.mjs [baseUrl]
 * 默认 baseUrl = http://127.0.0.1:3000/api
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3000/api').replace(/\/$/, '')
const ADMIN_PHONE = process.env.ADMIN_PHONE || '18590332810'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456'

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let json = null
  try {
    json = await res.json()
  } catch {
    json = null
  }

  return { status: res.status, json }
}

function ok(label, result, expectStatus = 200) {
  const pass = result.status === expectStatus && result.json?.code === 200
  console.log(`${pass ? '✅' : '❌'} ${label} → HTTP ${result.status} ${result.json?.message || ''}`)
  if (!pass && result.json) {
    console.log('   ', JSON.stringify(result.json).slice(0, 200))
  }
  return pass
}

async function main() {
  console.log(`\nAdmin API 自检：${BASE}\n`)

  const health = await request('/health')
  ok('GET /health', health)

  const login = await request('/admin/auth/login', {
    method: 'POST',
    body: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
  })
  if (!ok('POST /admin/auth/login', login)) {
    console.log('\n登录失败，请确认后端已启动且管理员账号存在（18590332810 / 123456）\n')
    process.exit(1)
  }

  const token = login.json?.data?.token
  const authed = (path, opts = {}) => request(path, { ...opts, token })

  const checks = [
    ['GET /admin/auth/me', () => authed('/admin/auth/me')],
    ['GET /admin/dashboard/overview', () => authed('/admin/dashboard/overview')],
    ['GET /admin/dashboard/pending-counts', () => authed('/admin/dashboard/pending-counts?timeout_minutes=5')],
    ['GET /admin/merchant/pending（无 status）', () => authed('/admin/merchant/pending?page=1&page_size=10')],
    ['GET /admin/merchant/pending?status=approved', () => authed('/admin/merchant/pending?status=approved&page=1&page_size=10')],
    ['GET /admin/rider?role=rider', () => authed('/admin/rider?role=rider&page=1&limit=10')],
    ['GET /admin/rider/pending', () => authed('/admin/rider/pending?page=1&limit=10')],
    ['GET /admin/orders', () => authed('/admin/orders?page=1&limit=10')],
    ['GET /admin/orders/refunds', () => authed('/admin/orders/refunds?status=pending&page=1&limit=10')],
    ['GET /admin/notifications', () => authed('/admin/notifications')],
    ['GET /admin/feedback', () => authed('/admin/feedback')],
    ['GET /admin/withdraw/merchants', () => authed('/admin/withdraw/merchants?page=1&limit=10')],
    ['GET /admin/withdraw/riders', () => authed('/admin/withdraw/riders?page=1&limit=10')],
    ['GET /admin/audit-logs', () => authed('/admin/audit-logs?page=1&limit=10')],
    ['GET /admin/users', () => authed('/admin/users?page=1&limit=10')],
    ['GET /admin/town-stations', () => authed('/admin/town-stations?page=1&limit=10')],
    ['GET /admin/roles', () => authed('/admin/roles')],
    ['GET /admin/config', () => authed('/admin/config')],
    ['GET /common/service-areas', () => authed('/common/service-areas')],
    ['GET /common/merchant-primary-categories', () => authed('/common/merchant-primary-categories')],
  ]

  let passed = 0
  for (const [label, fn] of checks) {
    const result = await fn()
    if (ok(label, result)) passed += 1
  }

  console.log(`\n结果：${passed}/${checks.length + 2} 通过（含 health + login）\n`)
  process.exit(passed === checks.length ? 0 : 1)
}

main().catch((error) => {
  console.error('自检失败：', error.message)
  process.exit(1)
})
