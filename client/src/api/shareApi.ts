import apiClient from './apiClient'

export interface ShareInviteInfo {
  token:         string
  resourceType:  'List' | 'Task' | 'Goal'
  resourceId:    string
  ownerName:     string
  resourceTitle: string | null
}

export interface ShareStatus {
  token:           string
  acceptedByName:  string | null
  createdAt:       string
}

export const shareApi = {
  /** Create an invite link for a resource */
  create: async (resourceType: 'List' | 'Task' | 'Goal', resourceId: string): Promise<string> => {
    const { data } = await apiClient.post<{ token: string }>('/share', { resourceType, resourceId })
    return data.token
  },

  /** Get info about an invite (for the join page) */
  getInfo: async (token: string): Promise<ShareInviteInfo> => {
    const { data } = await apiClient.get<ShareInviteInfo>(`/share/${token}`)
    return data
  },

  /** Accept an invite */
  accept: async (token: string): Promise<{ resourceType: string; resourceId: string }> => {
    const { data } = await apiClient.post(`/share/${token}/accept`, {})
    return data
  },

  /** Revoke an invite (owner only) */
  revoke: async (token: string): Promise<void> => {
    await apiClient.delete(`/share/${token}`)
  },

  /** Get all active share invites for a resource */
  getForResource: async (
    resourceType: 'List' | 'Task' | 'Goal',
    resourceId: string
  ): Promise<ShareStatus[]> => {
    const { data } = await apiClient.get<ShareStatus[]>(`/share/resource/${resourceType}/${resourceId}`)
    return data
  },
}
