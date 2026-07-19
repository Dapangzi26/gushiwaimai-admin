// 审核中心接口：复用商家 / 骑手模块，避免重复维护路径。
export {
  fetchAdminMerchants as fetchPendingMerchants,
  fetchAdminMerchantDetail as fetchMerchantDetail,
  approveMerchant,
  rejectMerchant,
} from './merchant'

export {
  fetchPendingRiders,
  fetchAdminRiders,
  fetchRiderDetail,
  approveRider,
  rejectRider,
} from './riders'
