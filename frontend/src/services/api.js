import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Request interceptor - add auth token and origin header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (!originalRequest) {
      return Promise.reject(error)
    }

    if (originalRequest.url?.includes('/auth/refresh-token')) {
      return Promise.reject(error)
    }

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh-token`,
            { refreshToken },
            {
              withCredentials: true,
            }
          )

          const refreshedAccessToken = response.data?.data?.accessToken
          const refreshedRefreshToken = response.data?.data?.refreshToken

          if (!refreshedAccessToken) {
            throw new Error('No access token returned from refresh endpoint')
          }

          localStorage.setItem('accessToken', refreshedAccessToken)
          if (refreshedRefreshToken) {
            // Keep original refresh token in storage so session naturally expires after ~7 days from login
          }

          originalRequest.headers.Authorization = `Bearer ${refreshedAccessToken}`
          return api(originalRequest)
        }

        throw new Error('No refresh token available')
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api

