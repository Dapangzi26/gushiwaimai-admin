// 这个文件是“总后台公共查询接口封装”。
// 读取服务区域、商家主营类目等公共配置，供运营配置页只读展示。
import request from '../utils/request'

/** 服务区域列表（县城/乡镇） */
export async function fetchServiceAreas(params = {}) {
  const response = await request.get('/common/service-areas', { params })
  return unwrapPayload(response)
}

/** 商家主营类目（静态配置） */
export async function fetchMerchantPrimaryCategories() {
  const response = await request.get('/common/merchant-primary-categories')
  return unwrapPayload(response)
}

function unwrapPayload(response) {
  return response?.data ?? response
}
