import { Outlet } from 'react-router-dom'
import { Box } from '@mui/material'
import TopBar from '../components/TopBar'
import SideNav from '../components/SideNav'
import BottomNav from '../components/BottomNav'

/**
 * MainLayout — fully responsive shell.
 *
 * Mobile  (xs  < 600px):   TopBar | scrollable page | fixed BottomNav
 * Tablet+ (sm ≥ 600px):   TopBar | SideNav + scrollable page  (no BottomNav)
 *
 *   Mobile                      Desktop/Tablet
 *  ┌────────────────┐           ┌───────────────────────────────┐
 *  │    TopBar      │           │         TopBar                │
 *  ├────────────────┤           ├────────────┬──────────────────┤
 *  │                │           │            │                  │
 *  │   <Outlet/>    │           │  SideNav   │   <Outlet/>      │
 *  │   (scroll)     │           │  (fixed W) │   (scroll)       │
 *  │                │           │            │                  │
 *  ├────────────────┤           └────────────┴──────────────────┘
 *  │   BottomNav    │
 *  └────────────────┘
 */
export default function MainLayout() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        bgcolor: 'background.default',
      }}
    >
      {/* ── Header — full width on all breakpoints ─────────────── */}
      <TopBar />

      {/* ── Body row: sidebar + page content ────────────────────── */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar — tablet/desktop only (sm+) */}
        <SideNav />

        {/* Scrollable page content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            // On mobile leave room for the fixed BottomNav
            pb: { xs: '64px', sm: 0 },
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/*
           * Mobile  → full width (phone is already narrow)
           * Desktop → comfortable reading width, centred
           */}
          <Box
            sx={{
              width: '100%',
              maxWidth: { xs: '100%', md: 960 },
              mx: 'auto',
              px: { xs: 0, sm: 2, md: 4 },
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>

      {/* ── Bottom navigation — mobile only (xs) ─────────────────── */}
      <BottomNav />
    </Box>
  )
}
