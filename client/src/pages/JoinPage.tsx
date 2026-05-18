import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { useTranslation } from 'react-i18next'
import { shareApi } from '../api'
import type { ShareInviteInfo } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { AppRoute } from '../routes/paths'

export default function JoinPage() {
  const { token }    = useParams<{ token: string }>()
  const { t }        = useTranslation()
  const navigate     = useNavigate()
  const { isAuthenticated } = useAuth()

  const [info,    setInfo]    = useState<ShareInviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [joined,  setJoined]  = useState(false)

  useEffect(() => {
    if (!token) return
    shareApi.getInfo(token)
      .then(setInfo)
      .catch(() => setError('הקישור לא נמצא או פג תוקפו'))
      .finally(() => setLoading(false))
  }, [token])

  const handleJoin = async () => {
    if (!isAuthenticated) {
      // Save token to redirect after login
      sessionStorage.setItem('pendingJoinToken', token!)
      navigate(AppRoute.Login)
      return
    }
    try {
      setLoading(true)
      const result = await shareApi.accept(token!)
      setJoined(true)
      setTimeout(() => {
        const route = result.resourceType === 'List'
          ? AppRoute.Lists
          : result.resourceType === 'Goal'
            ? AppRoute.Goals
            : AppRoute.Tasks
        navigate(route)
      }, 1500)
    } catch (e: any) {
      setError(e?.response?.data || 'שגיאה בהצטרפות')
    } finally {
      setLoading(false)
    }
  }

  const typeLabel = info ? t(`share.type${info.resourceType}`) : ''

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F7F5FF',
        p: 3,
      }}
    >
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 4,
          p: 4,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(124,92,255,0.12)',
        }}
      >
        {loading && <CircularProgress />}

        {!loading && error && (
          <>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>שגיאה</Typography>
            <Typography color="text.secondary">{error}</Typography>
            <Button sx={{ mt: 3 }} variant="contained" onClick={() => navigate('/')}>
              לדף הבית
            </Button>
          </>
        )}

        {!loading && !error && joined && (
          <>
            <CheckCircleRoundedIcon sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" fontWeight={700}>הצטרפת בהצלחה!</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>מועבר/ת...</Typography>
          </>
        )}

        {!loading && !error && !joined && info && (
          <>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
              {info.resourceTitle ?? typeLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {info.ownerName} שיתף/ה איתך {typeLabel}
            </Typography>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleJoin}
              sx={{ borderRadius: 2.5, fontWeight: 700, py: 1.5 }}
            >
              {isAuthenticated ? `הצטרף ל${typeLabel}` : 'התחבר והצטרף'}
            </Button>
          </>
        )}
      </Box>
    </Box>
  )
}
