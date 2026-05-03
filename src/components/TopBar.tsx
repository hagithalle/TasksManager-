import { AppBar, Toolbar, Typography, Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'

/**
 * Sticky top bar: app name on the leading side, language switcher on the trailing side.
 * Uses `flexDirection: row` in LTR and MUI automatically flips it to row-reverse in RTL
 * because the theme direction is propagated via the Toolbar's flex container.
 */
export default function TopBar() {
  const { t } = useTranslation()

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
      <Toolbar sx={{ minHeight: 56, px: 2 }}>
        <Typography
          variant="h4"
          component="span"
          sx={{ flexGrow: 1, color: 'primary.main', fontWeight: 700 }}
        >
          {t('app.name')}
        </Typography>

        <Box>
          <LanguageSwitcher />
        </Box>
      </Toolbar>
    </AppBar>
  )
}
