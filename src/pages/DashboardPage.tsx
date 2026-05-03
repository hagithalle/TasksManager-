import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

export default function DashboardPage() {
  const { t } = useTranslation()
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h2">{t('nav.dashboard')}</Typography>
    </Box>
  )
}
