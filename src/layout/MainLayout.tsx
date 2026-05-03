import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import BottomNav from '../components/BottomNav'
import TopBar from '../components/TopBar'

// MainLayout wraps all pages with the shared bottom navigation bar.
// A top AppBar can be added here later once the design is confirmed.
export default function MainLayout() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        bgcolor: 'background.default',
        maxWidth: 480,       // mobile-first max width
        mx: 'auto',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sticky top bar with app name + language switcher */}
      <TopBar />

      {/* Page content */}
      <Box sx={{ flex: 1, overflowY: 'auto', pb: '64px' }}>
        <Outlet />
      </Box>

      {/* Persistent bottom navigation */}
      <BottomNav />
    </Box>
  )
}
