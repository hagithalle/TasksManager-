import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'

/**
 * MainLayout — shared shell for all pages.
 *
 * ┌──────────────────────────┐
 * │  TopBar (sticky, 56px)   │
 * ├──────────────────────────┤
 * │                          │
 * │  <Outlet/>  (scrollable) │
 * │                          │
 * ├──────────────────────────┤
 * │  BottomNav (fixed, 64px) │
 * └──────────────────────────┘
 *
 * Constrained to 480 px max-width and centred horizontally for
 * a mobile-first feel on larger screens.
 */
export default function MainLayout() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        maxWidth: 480,
        mx: 'auto',
        bgcolor: 'background.default',
        position: 'relative',
        // Clip children so nothing overflows the mobile frame
        overflow: 'hidden',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <TopBar />

      {/* ── Scrollable page content ───────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          // Reserve space so content is never hidden behind the bottom nav
          pb: '64px',
          // Smooth momentum scrolling on iOS
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Outlet />
      </Box>

      {/* ── Bottom navigation ─────────────────────────────────────── */}
      <BottomNav />
    </Box>
  )
}
