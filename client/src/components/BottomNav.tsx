import { useNavigate, useLocation } from 'react-router-dom'
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import TaskAltRoundedIcon    from '@mui/icons-material/TaskAltRounded'
import FlagRoundedIcon       from '@mui/icons-material/FlagRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import SettingsRoundedIcon   from '@mui/icons-material/SettingsRounded'
import { useTranslation } from 'react-i18next'
import { AppRoute } from '../routes/paths'

const NAV_ITEMS = [
  { label: 'nav.dashboard', icon: <DashboardRoundedIcon />,      path: AppRoute.Dashboard },
  { label: 'nav.tasks',     icon: <TaskAltRoundedIcon />,        path: AppRoute.Tasks     },
  { label: 'nav.goals',     icon: <FlagRoundedIcon />,           path: AppRoute.Goals     },
  { label: 'nav.calendar',  icon: <CalendarMonthRoundedIcon />,  path: AppRoute.Calendar  },
  { label: 'nav.settings',  icon: <SettingsRoundedIcon />,       path: AppRoute.Settings  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()

  return (
    <Paper
      elevation={0}
      sx={{
        // Only visible on mobile; tablets/desktop use SideNav instead
        display: { xs: 'block', sm: 'none' },
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        borderTop: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation
        value={pathname}
        onChange={(_, newPath) => navigate(newPath)}
        showLabels
      >
        {NAV_ITEMS.map(({ label, icon, path }) => (
          <BottomNavigationAction
            key={path}
            label={t(label)}
            icon={icon}
            value={path}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}
