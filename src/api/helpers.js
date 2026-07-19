// 总后台 API 响应解包：request 拦截器已返回 response.data，此处再取业务 data 字段。
export function unwrapPayload(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data
  }
  return response
}
