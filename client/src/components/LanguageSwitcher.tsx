import { useTranslation } from 'react-i18next'
import { ToggleButtonGroup, ToggleButton } from '@mui/material'

/**
 * Toggles between Hebrew (RTL) and English (LTR).
 * Changing the language triggers AppThemeProvider to swap the MUI theme
 * direction and Emotion cache automatically.
 */
export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  const handleChange = (_: React.MouseEvent<HTMLElement>, lang: string | null) => {
    if (lang) i18n.changeLanguage(lang)
  }

  return (
    <ToggleButtonGroup
      value={i18n.language}
      exclusive
      onChange={handleChange}
      size="small"
      aria-label={t('lang.switchTo')}
      sx={{
        '& .MuiToggleButton-root': {
          border: 'none',
          borderRadius: '8px !important',
          px: 1.5,
          py: 0.5,
          fontWeight: 700,
          fontSize: '0.75rem',
          color: 'text.secondary',
          '&.Mui-selected': {
            bgcolor: 'primary.light',
            color: 'primary.dark',
          },
        },
      }}
    >
      <ToggleButton value="he" disableRipple>{t('lang.he')}</ToggleButton>
      <ToggleButton value="en" disableRipple>{t('lang.en')}</ToggleButton>
    </ToggleButtonGroup>
  )
}
