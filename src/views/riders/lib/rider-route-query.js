// 骑手页路由 query：活键 + 遗留 keyword/town。URL 不写 limit。
// 父页 /riders 还在。watch 仍 immediate。已删的 formatTime 不要接回去。
import { normalizeSearchKeyword } from '../../../utils/orderNo.js'

export function createRiderRouteQuery({
  activeRole,
  filters,
  onlineStatus,
  pagination,
  route,
  router,
  loadList,
}) {
  function normalizeRole(value) {
    return value === 'merchant_delivery' ? 'merchant_delivery' : 'rider'
  }

  function normalizePage(value) {
    const page = Number.parseInt(value, 10)
    return Number.isFinite(page) && page > 0 ? page : 1
  }

  function getKeywordValue(value) {
    return String(value || '').trim()
  }

  function syncStateFromRoute(query) {
    activeRole.value = normalizeRole(query.role)
    filters.nickname = getKeywordValue(query.nickname)
    filters.phone = getKeywordValue(query.phone)
    filters.townName = getKeywordValue(query.town_name || query.town)
    filters.merchantName = getKeywordValue(query.merchant_name)

    const legacyKeyword = getKeywordValue(query.keyword)
    if (legacyKeyword && !filters.nickname && !filters.phone && !filters.townName && !filters.merchantName) {
      filters.townName = legacyKeyword
    }

    onlineStatus.value = getKeywordValue(query.online_status)
    pagination.page = normalizePage(query.page)
  }

  function buildRouteQuery() {
    const nextQuery = {
      role: activeRole.value,
      page: String(pagination.page),
    }

    const nickname = filters.nickname.trim()
    const phone = normalizeSearchKeyword(filters.phone)
    const townName = filters.townName.trim()
    const merchantName = filters.merchantName.trim()

    if (nickname) nextQuery.nickname = nickname
    if (phone) nextQuery.phone = phone
    if (activeRole.value === 'rider') {
      if (townName) nextQuery.town_name = townName
    } else if (merchantName) {
      nextQuery.merchant_name = merchantName
    }

    if (onlineStatus.value) {
      nextQuery.online_status = onlineStatus.value
    }

    return nextQuery
  }

  function isSameQuery(nextQuery) {
    const currentRole = normalizeRole(route.query.role)
    const currentNickname = getKeywordValue(route.query.nickname)
    const currentPhone = getKeywordValue(route.query.phone)
    const currentTownName = getKeywordValue(route.query.town_name || route.query.town || route.query.keyword)
    const currentMerchantName = getKeywordValue(route.query.merchant_name)
    const currentOnlineStatus = getKeywordValue(route.query.online_status)
    const currentPage = String(normalizePage(route.query.page))

    const nextNickname = getKeywordValue(nextQuery.nickname)
    const nextPhone = getKeywordValue(nextQuery.phone)
    const nextTownName = getKeywordValue(nextQuery.town_name)
    const nextMerchantName = getKeywordValue(nextQuery.merchant_name)

    return (
      currentRole === normalizeRole(nextQuery.role) &&
      currentNickname === nextNickname &&
      currentPhone === nextPhone &&
      currentTownName === nextTownName &&
      currentMerchantName === nextMerchantName &&
      currentOnlineStatus === getKeywordValue(nextQuery.online_status) &&
      currentPage === String(normalizePage(nextQuery.page))
    )
  }

  async function replaceRouteQuery(nextQuery) {
    if (isSameQuery(nextQuery)) {
      await loadList()
      return
    }

    await router.replace({
      path: route.path,
      query: nextQuery,
    })
  }

  return {
    normalizeRole,
    normalizePage,
    getKeywordValue,
    syncStateFromRoute,
    buildRouteQuery,
    isSameQuery,
    replaceRouteQuery,
  }
}
