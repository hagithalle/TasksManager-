import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material'
import DashboardRoundedIcon     from '@mui/icons-material/DashboardRounded'
import CheckCircleRoundedIcon   from '@mui/icons-material/CheckCircleRounded'
import FlagRoundedIcon          from '@mui/icons-material/FlagRounded'
import ListRoundedIcon          from '@mui/icons-material/ListRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import { useTranslation } from 'react-i18next'
import { AppRoute } from '../routes/paths'

const NAV_ITEMS = [
  { labelKey: 'nav.dashboard', Icon: DashboardRoundedIcon,     path: AppRoute.Dashboard },
  { labelKey: 'nav.tasks',     Icon: CheckCircleRoundedIcon,   path: AppRoute.Tasks     },
  { labelKey: 'nav.goals',     Icon: FlagRoundedIcon,          path: AppRoute.Goals     },
  { labelKey: 'nav.lists',     Icon: ListRoundedIcon,          path: AppRoute.Lists     },
  { labelKey: 'nav.calendar',  Icon: CalendarMonthRoundedIcon, path: AppRoute.Calendar  },
]

/**
 * SideNav — desktop/tablet sidebar navigation.
 * Visible on sm+ (≥ 600 px). Hidden on mobile (xs), where BottomNav is used instead.
 *
 * RTL-aware: MUI + dir="rtl" places this block on the trailing (right) side automatically.
 */
export default function SideNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()

  return (
    <Box
      component="nav"
      aria-label={t('app.name')}
      sx={{
        display: { xs: 'none', sm: 'flex' },
        flexDirection: 'column',
        width: { sm: 220, md: 260 },
        flexShrink: 0,
        height: '100%',
        bgcolor: 'background.paper',
        // border on the trailing edge — stylis-plugin-rtl flips borderRight↔borderLeft
        borderRight: '1px solid',
        borderColor: 'divider',
        overflowY: 'auto',
      }}
    >
      {/* Brand name */}
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography
          variant="h3"
          component="span"
          sx={{ color: 'primary.main', fontWeight: 700, display: 'block' }}
        >
          {t('app.name')}
        </Typography>
      </Box>

      <Divider />

      {/* Navigation list */}
      <List sx={{ flex: 1, px: 1.5, pt: 1.5, pb: 2 }} disablePadding>
        {NAV_ITEMS.map(({ labelKey, Icon, path }) => {
          // Highlight if the current path starts with this nav item's base path
          const active =
            path === AppRoute.Dashboard
              ? pathname === path
              : pathname.startsWith(path)

          return (
            <ListItem key={path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(path)}
                selected={active}
                sx={{
                  borderRadius: 3,
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    color: 'primary.dark',
                    '& .MuiListItemIcon-root': { color: 'primary.dark' },
                    '&:hover': { bgcolor: 'primary.light' },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: active ? 'primary.dark' : 'text.secondary',
                  }}
                >
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={t(labelKey)}
                  primaryTypographyProps={{
                    fontWeight: active ? 700 : 400,
                    fontSize: '0.9375rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )
}
