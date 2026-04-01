import axios from 'axios'

const normalizeApiUrl = (value = '') => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return ''
  }

  try {
    const parsedUrl = new URL(trimmedValue)
    const isLoopbackOrigin = ['localhost', '127.0.0.1'].includes(parsedUrl.hostname)

    if (import.meta.env.PROD && isLoopbackOrigin) {
      return ''
    }

    return parsedUrl.origin
  } catch {
    return ''
  }
}

const getApiBaseUrl = () => normalizeApiUrl(import.meta.env.VITE_API_URL || '')

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 10000,
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
    }

    return Promise.reject(error)
  },
)

export default axiosInstance;
