import axios from 'axios'
import { ElMessage } from 'element-plus'
import { clearStoredAuth, getStoredAuth } from './auth'
import { getRequestErrorMessage } from './http'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
})

request.interceptors.request.use(
  (config) => {
    const { token } = getStoredAuth()

    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error?.response?.status === 401) {
      clearStoredAuth()

      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }

    const message = getRequestErrorMessage(error, '请求失败')
    if (!error?.config?.skipErrorToast) {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  },
)

export default request
