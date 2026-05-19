import { Box, Typography, Fab, CircularProgress, Alert, Button } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { goalsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Goal } from '../types'
import GoalCard from '../components/goals/GoalCard'
import AddGoalDialog from '../components/goals/AddGoalDialog'
import GoalsAgentDialog from '../components/goals/GoalsAgentDialog'

export default function GoalsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [goals, setGoals]   = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [addOpen,      setAddOpen]      = useState(false)
  const [editGoal,     setEditGoal]     = useState<Goal | null>(null)
  const [agentOpen,    setAgentOpen]    = useState(false)

  useEffect(() => {
    if (!user) return
    goalsApi
      .getByUser(user.id)
      .then(setGoals)
      .catch(() => setError(t('error.loadFailed', 'Failed to load goals')))
      .finally(() => setLoading(false))
  }, [t, user])

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id))
    goalsApi.delete(id).catch(() => {
      goalsApi.getByUser(user!.id).then(setGoals).catch(() => {})
    })
  }

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

      {!loading && !error && goals.length === 0 && (
        <Box
          sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            py: 8, gap: 1.5,
          }}
        >
          <Typography sx={{ fontSize: 56, lineHeight: 1 }}>🎯</Typography>
          <Typography variant="body1" fontWeight={700} color="text.primary">
            {t('goal.emptyTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 260 }}>
            {t('goal.emptySubtitle')}
          </Typography>
        </Box>
      )}

      {!loading && !error && goals.length > 0 && (
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
                onEdit={setEditGoal}
                onDelete={handleDeleteGoal}
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
                onEdit={setEditGoal}
                onDelete={handleDeleteGoal}
              />
            ))}
          </Box>
        </Box>
      )}
        </>
      )}

      {/* ── AI Agent button (shown only when there are goals) ── */}
      {goals.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeRoundedIcon />}
            onClick={() => setAgentOpen(true)}
            sx={{
              borderRadius: 3, fontWeight: 700, fontSize: '0.78rem',
              borderColor: 'primary.main', color: 'primary.main',
              background: 'linear-gradient(135deg, rgba(124,92,255,0.06) 0%, rgba(124,92,255,0.03) 100%)',
              '&:hover': { bgcolor: 'rgba(124,92,255,0.1)' },
              px: 2.5,
            }}
          >
            {t('ai.goals.analyzeBtn')}
          </Button>
        </Box>
      )}

      {/* ── FAB ── */}
      <Fab
        color="primary"
        variant="extended"
        aria-label={t('goal.new')}
        onClick={() => setAddOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 80, sm: 24 },
          right: { xs: 16, sm: 24 },
          left: 'auto',
          boxShadow: '0 4px 16px rgba(124,92,255,0.4)',
          gap: 0.75,
        }}
      >
        <AddRoundedIcon />
        {t('goal.new')}
      </Fab>

      <AddGoalDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(goal) => { setGoals((prev) => [goal, ...prev]); setAddOpen(false) }}
        userId={user?.id ?? ''}
        createGoal={goalsApi.create}
      />

      <AddGoalDialog
        open={!!editGoal}
        onClose={() => setEditGoal(null)}
        onAdd={() => {}}
        onEdit={(updated) => {
          setGoals((prev) => prev.map((g) => g.id === updated.id ? updated : g))
          setEditGoal(null)
        }}
        editGoal={editGoal ?? undefined}
        userId={user?.id ?? ''}
        createGoal={goalsApi.create}
      />

      <GoalsAgentDialog
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        goals={goals}
      />
    </Box>
  )
}

