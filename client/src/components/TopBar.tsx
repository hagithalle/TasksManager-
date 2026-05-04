import { useNavigate, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import { AppRoute } from '../routes/paths'

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

  const BackIcon = isRtl ? ArrowForwardIosRoundedIcon : ArrowBackIosNewRoundedIcon

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
      <Toolbar sx={{ minHeight: 56, px: 1.5, gap: 0.5 }}>
        {/* Leading slot — back button on detail pages, empty space otherwise */}
        <Box sx={{ width: 40, flexShrink: 0 }}>
          {isDetail && (
            <IconButton
              size="small"
              onClick={() => navigate(-1)}
              aria-label={t('page.back')}
              sx={{ color: 'primary.main' }}
            >
              <BackIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Page title — centered */}
        <Typography
          variant="h4"
          component="h1"
          sx={{
            flex: 1,
            textAlign: 'center',
            color: isDetail ? 'text.primary' : 'primary.main',
            fontWeight: 700,
            fontSize: isDetail ? '1rem' : '1.125rem',
          }}
        >
          {t(titleKey)}
        </Typography>

        {/* Trailing slot — language switcher */}
        <Box sx={{ flexShrink: 0 }}>
          <LanguageSwitcher />
        </Box>
      </Toolbar>
    </AppBar>
  )
}
