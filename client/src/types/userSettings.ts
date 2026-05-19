export interface UserSettings {
  goalCategories: string[]
  coachTone: 'encouraging' | 'direct' | 'strict'
  coachFrequency: 'daily' | 'weekly' | 'asNeeded'
  workStartHour: number
  workEndHour: number
  firstDayOfWeek: 0 | 1
  language: string
  defaultReminderMinutes: number
  pushNotificationsEnabled: boolean
}
