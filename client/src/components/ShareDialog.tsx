import { useEffect, useState } from 'react'
import {
  Box, Button, CircularProgress, Dialog, DialogContent,
  DialogTitle, Divider, IconButton, Tooltip, Typography,
} from '@mui/material'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { useTranslation } from 'react-i18next'
import { shareApi } from '../../api'
import type { ShareStatus } from '../../api'

interface Props {
  open:         boolean
  onClose:      () => void
  resourceType: 'List' | 'Task' | 'Goal'
  resourceId:   string
  resourceTitle?: string
}

const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin

export default function ShareDialog({ open, onClose, resourceType, resourceId, resourceTitle }: Props) {
  const { t } = useTranslation()

  const [loading,   setLoading]   = useState(false)
  const [token,     setToken]     = useState<string | null>(null)
  const [shares,    setShares]    = useState<ShareStatus[]>([])
  const [copied,    setCopied]    = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    shareApi.getForResource(resourceType, resourceId)
      .then(setShares)
      .finally(() => setLoading(false))
  }, [open, resourceType, resourceId])

  const handleCreateLink = async () => {
    setLoading(true)
    try {
      const t2 = await shareApi.create(resourceType, resourceId)
      setToken(t2)
      const fresh = await shareApi.getForResource(resourceType, resourceId)
      setShares(fresh)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (tok: string) => {
    navigator.clipboard.writeText(`${APP_URL}/join/${tok}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async (tok: string) => {
    await shareApi.revoke(tok)
    setShares((prev) => prev.filter((s) => s.token !== tok))
    if (token === tok) setToken(null)
  }

  const typeName = t(`share.type${resourceType}`)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {t('share.title')} — {resourceTitle ?? typeName}
      </DialogTitle>

      <DialogContent>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={28} /></Box>}

        {!loading && (
          <>
            {shares.length === 0 && !token ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('share.linkInfo')}
                </Typography>
                <Button fullWidth variant="contained" onClick={handleCreateLink} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                  {t('share.copyLink')}
                </Button>
              </>
            ) : (
              <>
                {shares.map((s) => (
                  <Box key={s.token}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {s.acceptedByName ? (
                          <Typography variant="body2" fontWeight={600}>
                            {t('share.sharedWith', { name: s.acceptedByName })}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {t('share.pendingLink')}
                          </Typography>
                        )}
                      </Box>
                      <Tooltip title={copied ? t('share.copied') : t('share.copyLink')}>
                        <IconButton size="small" onClick={() => handleCopy(s.token)}>
                          {copied ? <CheckRoundedIcon sx={{ fontSize: 18, color: 'success.main' }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('share.revokeBtn')}>
                        <IconButton size="small" onClick={() => handleRevoke(s.token)}>
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 18, color: 'error.light' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Divider />
                  </Box>
                ))}
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleCreateLink}
                  sx={{ mt: 2, borderRadius: 2.5 }}
                >
                  {t('share.copyLink')} +
                </Button>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
