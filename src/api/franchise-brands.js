// 加盟品牌只读列表（写操作另接管理页）。
import request from '../utils/request'
import { unwrapPayload } from './helpers'

export async function fetchFranchiseBrands() {
  const response = await request.get('/admin/franchise-brands')
  return unwrapPayload(response)
}
