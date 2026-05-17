import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Tab,
  Tabs,
  Divider,
  Alert,
  CircularProgress,
  Avatar,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { authApi } from '../api/authApi'
import { useAuth } from '../contexts/AuthContext'
import { AppRoute } from '../routes/paths'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const [tab, setTab]           = useState<0 | 1>(0) // 0 = login, 1 = register
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Login form
  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [regName, setRegName]         = useState('')
  const [regEmail, setRegEmail]       = useState('')
  const [regPassword, setRegPassword] = useState('')

  const handleSuccess = (token: string, user: Parameters<typeof setAuth>[1]) => {
    setAuth(token, user)
    navigate(AppRoute.Dashboard, { replace: true })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await authApi.login({ email: loginEmail, password: loginPassword })
      handleSuccess(res.token, res.user)
    } catch {
      setError(t('auth.errorInvalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await authApi.register({
        displayName: regName,
        email: regEmail,
        password: regPassword,
        language: 'he',
      })
      handleSuccess(res.token, res.user)
    } catch {
      setError(t('auth.errorEmailTaken'))
    } finally {
      setLoading(false)
    }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async tokenResponse => {
      setError(null)
      setLoading(true)
      try {
        // exchange the access_token for an id_token via userinfo endpoint
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        if (!userInfoRes.ok) throw new Error('Google userinfo failed')
        // use the access_token as a credential via backend's own verification
        const res = await authApi.googleLogin(tokenResponse.access_token)
        handleSuccess(res.token, res.user)
      } catch {
        setError(t('auth.errorGoogle'))
      } finally {
        setLoading(false)
      }
    },
    onError: () => setError(t('auth.errorGoogle')),
  })

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
        py: 4,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }} elevation={3}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Logo / App name */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'primary.main',
                mx: 'auto',
                mb: 1.5,
                fontSize: '1.5rem',
              }}
            >
              ✓
            </Avatar>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              {t('app.name')}
            </Typography>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={(_, v) => { setTab(v); setError(null) }}
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab label={t('auth.loginTab')} />
            <Tab label={t('auth.registerTab')} />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Google button */}
          <Button
            fullWidth
            variant="outlined"
            size="large"
            onClick={() => googleLogin()}
            disabled={loading}
            startIcon={
              <Box
                component="img"
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                sx={{ width: 20, height: 20 }}
              />
            }
            sx={{ mb: 2, borderRadius: 2, textTransform: 'none', fontWeight: 500 }}
          >
            {t('auth.continueWithGoogle')}
          </Button>

          <Divider sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('auth.or')}
            </Typography>
          </Divider>

          {/* Login form */}
          {tab === 0 && (
            <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={t('auth.email')}
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                fullWidth
                size="small"
              />
              <TextField
                label={t('auth.password')}
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                fullWidth
                size="small"
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                fullWidth
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : t('auth.loginBtn')}
              </Button>
            </Box>
          )}

          {/* Register form */}
          {tab === 1 && (
            <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={t('auth.displayName')}
                value={regName}
                onChange={e => setRegName(e.target.value)}
                required
                fullWidth
                size="small"
              />
              <TextField
                label={t('auth.email')}
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                required
                fullWidth
                size="small"
              />
              <TextField
                label={t('auth.password')}
                type="password"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                required
                inputProps={{ minLength: 6 }}
                fullWidth
                size="small"
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                fullWidth
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : t('auth.registerBtn')}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
