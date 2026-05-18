import apiClient from './apiClient'

export interface CalendarSyncResult {
  created: number
  updated: number
  skipped: number
}

export const calendarApi = {
  push: (accessToken: string): Promise<CalendarSyncResult> =>
    apiClient.post<CalendarSyncResult>('/calendar/push', { accessToken }).then(r => r.data),
}
