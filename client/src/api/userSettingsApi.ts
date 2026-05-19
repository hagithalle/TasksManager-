import apiClient from './apiClient'
import type { UserSettings } from '../types'

const userSettingsApi = {
  get: () =>
    apiClient.get<UserSettings>('/user-settings').then((r) => r.data),

  update: (data: Partial<UserSettings>) =>
    apiClient.put<UserSettings>('/user-settings', data).then((r) => r.data),
}

export default userSettingsApi
