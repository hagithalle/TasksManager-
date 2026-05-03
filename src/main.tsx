import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppThemeProvider } from './theme'
import App from './App'

// Initialize i18n as a side-effect — must run before first render
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* AppThemeProvider handles CacheProvider + ThemeProvider + CssBaseline,
          and dynamically switches direction when the language changes */}
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
