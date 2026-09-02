// 站长页 API 失败后的骑手翻页 + 前端筛站长。
// 父页 /town-stations 还在。loadStations 404 时转调这里。goRiders 仍在父页。
import { fetchAdminRiders } from '../../../api/riders'
import { matchesLocalSearchKeyword } from '../../../utils/orderNo.js'

export function createTownStationsFallback({
  allRiders,
  stationList,
  pagination,
  dataSource,
  filters,
}) {
  function isStationMaster(row) {
    return (
      row?.rider_kind === 'stationmaster' ||
      row?.rider_level === 'captain' ||
      row?.identity_type === '乡镇站长'
    )
  }

  function normalizeTownName(row) {
    return String(row?.town_name || row?.rider_town || '').trim()
  }

  function getTownRiderCount(stationRow) {
    if (Number.isFinite(Number(stationRow?.town_rider_count))) {
      return Number(stationRow.town_rider_count)
    }

    const town = normalizeTownName(stationRow)
    if (!town) return 0

    return allRiders.value.filter((item) => {
      if (isStationMaster(item)) return false
      if (item.delivery_scope !== 'town_delivery') return false
      return normalizeTownName(item) === town
    }).length
  }

  function applyFilter() {
    let stations = allRiders.value.filter(isStationMaster)

    const nickname = filters.nickname.trim()
    const phone = filters.phone.trim()
    const townName = filters.townName.trim()

    if (nickname) {
      stations = stations.filter((item) => matchesLocalSearchKeyword(nickname, [item.nickname]))
    }

    if (phone) {
      stations = stations.filter((item) => matchesLocalSearchKeyword(phone, [item.phone]))
    }

    if (townName) {
      stations = stations.filter((item) =>
        matchesLocalSearchKeyword(townName, [item.town_name, item.rider_town, item.town_code]),
      )
    }

    stationList.value = stations
    pagination.total = stations.length
  }

  async function fetchAllRiderPages() {
    const merged = []
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const result = await fetchAdminRiders({ role: 'rider', page, limit: 50 })
      const batch = Array.isArray(result?.list) ? result.list : []
      merged.push(...batch)

      totalPages = result?.pagination?.total_pages || 1
      page += 1

      if (batch.length === 0) break
    }

    return merged
  }

  async function loadAllRidersFallback(forceRefresh = false) {
    if (forceRefresh || !allRiders.value.length) {
      allRiders.value = await fetchAllRiderPages()
    }
    dataSource.value = 'fallback'
    applyFilter()
  }

  return {
    isStationMaster,
    normalizeTownName,
    getTownRiderCount,
    applyFilter,
    fetchAllRiderPages,
    loadAllRidersFallback,
  }
}
