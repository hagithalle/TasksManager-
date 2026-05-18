import apiClient from './apiClient'

export interface CalendarSyncResult {
  created: number
  updated: number
  skipped: number
}

export const calendarApi = {
  push: (): Promise<CalendarSyncResult> =>
    apiClient.post<CalendarSyncResult>('/calendar/push').then(r => r.data),
}
