// 列表接口响应解包与路由分页参数解析（全站统一 limit，兼容旧 page_size）。

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

  return []
}

export function resolveTotal(payload, fallbackTotal = 0) {
  const total = Number(payload?.pagination?.total ?? payload?.total ?? fallbackTotal)
  return Number.isFinite(total) ? total : fallbackTotal
}

export function parseRoutePage(query, defaultPage = 1) {
  const page = Number.parseInt(query?.page, 10)
  return Number.isFinite(page) && page > 0 ? page : defaultPage
}

export function parseRouteLimit(query, defaultLimit = 10, maxLimit = 50) {
  const raw = query?.limit ?? query?.page_size ?? query?.pageSize
  const limit = Number.parseInt(raw, 10)

  if (!Number.isFinite(limit) || limit <= 0) {
    return defaultLimit
  }

  return Math.min(limit, maxLimit)
}

export function isApiNotFound(error) {
  return error?.response?.status === 404
}
