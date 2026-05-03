export interface User {
  id: string

  /** Display name shown in the UI */
  displayName: string

  /** Optional avatar URL or data-URL */
  avatarUrl?: string

  /** Preferred UI language code, e.g. 'he' | 'en' */
  language: string

  createdAt: string
  updatedAt: string
}
