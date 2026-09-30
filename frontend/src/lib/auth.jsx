import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from './api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('access')))

  useEffect(() => {
    if (!localStorage.getItem('access')) return
    api.get('/auth/me/').then(({ data }) => setUser(data)).catch(() => {
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const expire = () => {
      queryClient.clear()
      setUser(null)
    }
    window.addEventListener('session-expired', expire)
    return () => window.removeEventListener('session-expired', expire)
  }, [queryClient])

  async function login(credentials) {
    queryClient.clear()
    const { data } = await api.post('/auth/login/', credentials)
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    const profile = await api.get('/auth/me/')
    setUser(profile.data)
  }

  async function register(values) {
    await api.post('/auth/register/', values)
    await login({ username: values.username, password: values.password })
  }

  function logout() {
    queryClient.clear()
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}