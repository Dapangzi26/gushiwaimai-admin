// 总后台公共查询接口封装（只读配置）。
import request from '../utils/request'
import { unwrapPayload } from './helpers'

export async function fetchServiceAreas(params = {}) {
  const response = await request.get('/common/service-areas', { params })
  return unwrapPayload(response)
}

export async function fetchMerchantPrimaryCategories() {
  const response = await request.get('/common/merchant-primary-categories')
  return unwrapPayload(response)
}
