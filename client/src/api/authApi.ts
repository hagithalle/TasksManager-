import apiClient from './apiClient'
import type { User } from '../types'

export interface AuthResponse {
  token: string
  user: User
}

export const authApi = {
  register: (data: {
    displayName: string
    email: string
    password: string
    language?: string
  }) => apiClient.post<AuthResponse>('/auth/register', data).then(r => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', data).then(r => r.data),

  googleLogin: (code: string) =>
    apiClient.post<AuthResponse>('/auth/google', { code }).then(r => r.data),

  me: () => apiClient.get<User>('/auth/me').then(r => r.data),
}
