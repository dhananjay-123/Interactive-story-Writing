import axios from 'axios'

// In dev, requests to /api are proxied to the backend (see vite.config.js).
// In production, set VITE_API_URL to the deployed backend origin.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

const TOKEN_KEY = 'inkwell_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

// Attach the auth token to every request when present.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
