import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

export default function CalendarPage() {
  const { t } = useTranslation()
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h2">{t('nav.calendar')}</Typography>
    </Box>
  )
}
