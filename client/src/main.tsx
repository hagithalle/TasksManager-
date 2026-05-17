import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AppThemeProvider } from './theme'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'

// Initialize i18n as a side-effect — must run before first render
import './i18n'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={googleClientId}>
        {/* AppThemeProvider handles CacheProvider + ThemeProvider + CssBaseline,
            and dynamically switches direction when the language changes */}
        <AppThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AppThemeProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
