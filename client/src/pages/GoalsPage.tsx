import { Box, Typography, Fab, CircularProgress, Alert } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { goalsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Goal } from '../types'
import GoalCard from '../components/goals/GoalCard'
import AddGoalDialog from '../components/goals/AddGoalDialog'

export default function GoalsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [goals, setGoals]   = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    goalsApi
      .getByUser(user.id)
      .then(setGoals)
      .catch(() => setError(t('error.loadFailed', 'Failed to load goals')))
      .finally(() => setLoading(false))
  }, [t, user])

  const pinned = goals.filter((g) => g.isPinned)
  const rest   = goals.filter((g) => !g.isPinned)

  return (
    <Box sx={{ px: 2, pt: 2, pb: 4, position: 'relative' }}>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && (
        <>
      {/* ── Pinned section ── */}
      {pinned.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={700}
            sx={{ letterSpacing: 0.5, textTransform: 'uppercase', mb: 1, display: 'block' }}
          >
            {t('goal.pinned')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {pinned.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => navigate(`/goals/${goal.id}`)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── All goals section ── */}
      {rest.length > 0 && (
        <Box>
          {pinned.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              sx={{ letterSpacing: 0.5, textTransform: 'uppercase', mb: 1, display: 'block' }}
            >
              {t('goal.all')}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {rest.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => navigate(`/goals/${goal.id}`)}
              />
            ))}
          </Box>
        </Box>
      )}
        </>
      )}

      {/* ── FAB ── */}
      <Fab
        color="primary"
        aria-label={t('goal.new')}
        onClick={() => setAddOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 80, sm: 24 },
          right: { xs: 16, sm: 24 },
          left: 'auto',
          boxShadow: '0 4px 16px rgba(124,92,255,0.4)',
        }}
      >
        <AddRoundedIcon />
      </Fab>

      <AddGoalDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(goal) => { setGoals((prev) => [goal, ...prev]); setAddOpen(false) }}
        userId={user?.id ?? ''}
        createGoal={goalsApi.create}
      />
    </Box>
  )
}

