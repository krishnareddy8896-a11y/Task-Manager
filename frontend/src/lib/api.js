import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

let refreshRequest

api.interceptors.request.use((config) => {
  const access = localStorage.getItem('access')
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config
  const isAuthRequest = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register')
  if (error.response?.status !== 401 || !original || original._retry || isAuthRequest) throw error
  const refresh = localStorage.getItem('refresh')
  if (!refresh) {
    window.dispatchEvent(new Event('session-expired'))
    throw error
  }
  original._retry = true
  try {
    refreshRequest ??= axios.post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh })
    const { data } = await refreshRequest
    localStorage.setItem('access', data.access)
    if (data.refresh) localStorage.setItem('refresh', data.refresh)
    original.headers.Authorization = `Bearer ${data.access}`
    return api(original)
  } catch (refreshError) {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    window.dispatchEvent(new Event('session-expired'))
    throw refreshError
  } finally {
    refreshRequest = undefined
  }
})

export default api