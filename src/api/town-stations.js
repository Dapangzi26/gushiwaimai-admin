// 站长 / 乡镇管理接口。
import request from '../utils/request'
import { unwrapPayload } from './helpers'
import { isApiNotFound } from '../utils/list'

export { isApiNotFound as isTownStationsApiUnavailable }

/**
 * 乡镇站长列表
 * @param {object} params
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {string} [params.nickname] - 站长昵称
 * @param {string} [params.phone] - 手机号
 * @param {string} [params.town_name] - 乡镇名
 * @param {string} [params.town_code] - 乡镇编码
 * @param {string} [params.keyword] - 兼容旧版单框搜索
 */
export async function fetchTownStations(params = {}) {
  const response = await request.get('/admin/town-stations', {
    params,
    skipErrorToast: true,
  })
  return unwrapPayload(response)
}
