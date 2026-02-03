/**
 * Copy this to src/services/axios.ts or merge the interceptor logic into your existing axios instance.
 * If you don't have updateToken, remove the await updateToken() call or implement a simple refresh.
 */
import axios, { InternalAxiosRequestConfig } from 'axios'
// import updateToken from '@/services/update-token'

const _axios = axios.create()

_axios.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const exclude = ['login', 'logout', 'refresh-token']
  if (!exclude.some((action) => config.url?.includes(action))) {
    // await updateToken()  // uncomment if you have refresh-token logic
  }
  const token = localStorage.getItem('access_token')
  config.headers = config.headers ?? {}
  config.headers.Authorization = `Bearer ${token}`
  return config
})

_axios.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    return Promise.reject(error)
  },
)

export default _axios
