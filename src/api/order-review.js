import request from '../utils/request'

export function fetchOrderReviewList(params = {}) {
  return request.get('/admin/order-reviews', { params })
}

export function fetchOrderReviewDetail(id) {
  return request.get(`/admin/order-reviews/${id}`)
}

export function approveOrderReview(id) {
  return request.put(`/admin/order-reviews/${id}/approve`)
}

export function rejectOrderReview(id, data = {}) {
  return request.put(`/admin/order-reviews/${id}/reject`, data)
}
