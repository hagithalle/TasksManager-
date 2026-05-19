import { useMemo, useState } from 'react'
import { Box, Card, IconButton, Typography } from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded'
import { useTranslation } from 'react-i18next'

// Index key for localStorage — changes daily so the card re-appears each day
const DISMISSED_KEY = 'insightDismissed'
const TODAY = new Date().toISOString().slice(0, 10)

// Number of insight keys defined in i18n under "insight.q<n>"
const INSIGHT_COUNT = 8

function isDismissed(): boolean {
  return localStorage.getItem(DISMISSED_KEY) === TODAY
}

function dismiss() {
  localStorage.setItem(DISMISSED_KEY, TODAY)
}

// Pick a consistent index for today based on day-of-year
function todayIndex(): number {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  const diff  = d.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / 86_400_000)
  return dayOfYear % INSIGHT_COUNT
}

export default function DailyInsightCard() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(!isDismissed())

  const quote = useMemo(() => t(`insight.q${todayIndex()}`), [t])

  if (!visible) return null

  const handleDismiss = () => {
    dismiss()
    setVisible(false)
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        p: 2,
        background: 'linear-gradient(135deg, #F3E5F5 0%, #FCE4EC 100%)',
        border: '1.5px solid rgba(156,39,176,0.15)',
        boxShadow: '0 2px 12px rgba(156,39,176,0.07)',
        position: 'relative',
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Dismiss */}
      <IconButton
        size="small"
        onClick={handleDismiss}
        sx={{ position: 'absolute', top: 6, left: 6, p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}
      >
        <CloseRoundedIcon sx={{ fontSize: 16 }} />
      </IconButton>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <FormatQuoteRoundedIcon sx={{ fontSize: 20, color: 'secondary.main', opacity: 0.8 }} />
        <Typography variant="body2" fontWeight={700} color="secondary.dark">
          {t('insight.title')}
        </Typography>
      </Box>

      {/* Quote */}
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ lineHeight: 1.6, fontStyle: 'italic' }}
      >
        {quote}
      </Typography>
    </Card>
  )
}
