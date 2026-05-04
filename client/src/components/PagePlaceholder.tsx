import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { SvgIconComponent } from '@mui/icons-material'

interface PagePlaceholderProps {
  /** Translation key for the page title */
  titleKey: string
  /** MUI icon component to display above the title */
  Icon: SvgIconComponent
}

/**
 * Reusable centered placeholder shown inside pages that are not yet implemented.
 * Displays a large tinted icon, the page title, and a "coming soon" subtitle.
 */
export default function PagePlaceholder({ titleKey, Icon }: PagePlaceholderProps) {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100dvh - 120px)', // full height minus header + bottom nav
        gap: 2,
        px: 4,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'primary.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon sx={{ fontSize: 40, color: 'primary.main' }} />
      </Box>

      <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700 }}>
        {t(titleKey)}
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('page.placeholder')}
      </Typography>
    </Box>
  )
}
