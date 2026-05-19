import { useNavigate, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Tooltip } from '@mui/material'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import { AppRoute } from '../routes/paths'
import { useAuth } from '../contexts/AuthContext'

/** Map every route pattern to its translation key */
const TITLE_MAP: { pattern: string; key: string; isDetail?: boolean }[] = [
  { pattern: AppRoute.GoalDetail, key: 'nav.goalDetail', isDetail: true },
  { pattern: AppRoute.ListDetail, key: 'nav.listDetail', isDetail: true },
  { pattern: AppRoute.Dashboard,  key: 'nav.dashboard'  },
  { pattern: AppRoute.Tasks,      key: 'nav.tasks'       },
  { pattern: AppRoute.Goals,      key: 'nav.goals'       },
  { pattern: AppRoute.Lists,      key: 'nav.lists'       },
  { pattern: AppRoute.Calendar,   key: 'nav.calendar'    },
]

function useTopBarMeta() {
  const { pathname } = useLocation()
  for (const { pattern, key, isDetail } of TITLE_MAP) {
    // Convert enum pattern like /goals/:id to a simple prefix check for details
    if (isDetail) {
      const base = pattern.replace(/\/:.*$/, '/')
      if (pathname.startsWith(base) && pathname !== base.slice(0, -1)) {
        return { titleKey: key, isDetail: true }
      }
    } else if (pathname === pattern) {
      return { titleKey: key, isDetail: false }
    }
  }
  return { titleKey: 'app.name', isDetail: false }
}

export default function TopBar() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { titleKey, isDetail } = useTopBarMeta()
  const isRtl = i18n.dir() === 'rtl'
  const { user, logout } = useAuth()
  const isDashboard = titleKey === 'nav.dashboard'

  const BackIcon = isRtl ? ArrowForwardIosRoundedIcon : ArrowBackIosNewRoundedIcon

  const handleLogout = () => {
    logout()
    navigate(AppRoute.Login, { replace: true })
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  // Time-based greeting
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'auth.morning' : hour < 17 ? 'auth.afternoon' : 'auth.evening'
  const firstName   = user?.displayName?.split(' ')[0] ?? ''

  // Localized date for dashboard
  const todayLabel = new Date().toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ minHeight: isDashboard ? 64 : 56, px: 1.5, gap: 0.5 }}>

        {/* Left/Right: avatar + language */}
        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {user && (
            <Tooltip title={user.displayName}>
              <Avatar
                src={user.avatarUrl}
                onClick={() => {}}
                sx={{ width: 34, height: 34, fontSize: '0.75rem', bgcolor: 'primary.main', cursor: 'pointer' }}
              >
                {initials}
              </Avatar>
            </Tooltip>
          )}
          <LanguageSwitcher />
        </Box>

        {/* Center: greeting on dashboard, page title elsewhere */}
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          {isDashboard ? (
            <>
              <Typography variant="body1" fontWeight={700} lineHeight={1.2}>
                {t(greetingKey, { name: firstName })} &nbsp;🩷
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {todayLabel}
              </Typography>
            </>
          ) : (
            <Typography
              variant="h4"
              component="h1"
              sx={{
                color: isDetail ? 'text.primary' : 'primary.main',
                fontWeight: 700,
                fontSize: isDetail ? '1rem' : '1.125rem',
              }}
            >
              {t(titleKey)}
            </Typography>
          )}
        </Box>

        {/* Right/Left: notification bell + menu (dashboard) or back button (detail) */}
        <Box sx={{ width: 72, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 0.25 }}>
          {isDashboard ? (
            <>
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <NotificationsNoneRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
                <LogoutRoundedIcon fontSize="small" />
              </IconButton>
            </>
          ) : isDetail ? (
            <IconButton
              size="small"
              onClick={() => navigate(-1)}
              aria-label={t('page.back')}
              sx={{ color: 'primary.main' }}
            >
              <BackIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>
      </Toolbar>
    </AppBar>
  )
}
