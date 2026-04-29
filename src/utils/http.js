export function getRequestErrorMessage(error, fallback = '请求失败') {
  const status = error?.response?.status
  const responseMessage = error?.response?.data?.message

  if (status === 401) {
    return responseMessage || '请先登录'
  }

  if (status === 404) {
    return responseMessage || '接口不存在'
  }

  if (status >= 500) {
    return responseMessage || '服务器开小差了，请稍后重试'
  }

  return responseMessage || error?.message || fallback
}
