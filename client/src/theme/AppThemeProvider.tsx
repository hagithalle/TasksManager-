import { useEffect } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { CacheProvider } from '@emotion/react'
import { useTranslation } from 'react-i18next'
import { rtlCache, ltrCache } from './rtlCache'
import { rtlTheme, ltrTheme } from './theme'

interface Props {
  children: React.ReactNode
}

/**
 * Wraps the whole app with the correct MUI theme direction and Emotion cache
 * depending on the active i18n language.
 *
 * Hebrew  → RTL theme + RTL emotion cache + document.dir = 'rtl'
 * English → LTR theme + LTR emotion cache + document.dir = 'ltr'
 */
export default function AppThemeProvider({ children }: Props) {
  const { i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  // Keep <html dir> and <html lang> in sync with the active language
  useEffect(() => {
    document.documentElement.dir  = isRtl ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [isRtl, i18n.language])

  return (
    <CacheProvider value={isRtl ? rtlCache : ltrCache}>
      <ThemeProvider theme={isRtl ? rtlTheme : ltrTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  )
}
