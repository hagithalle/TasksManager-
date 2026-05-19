import { Box, Typography, Fab, CircularProgress, Alert } from '@mui/material'
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
      {/* ── AI Agent banner ── */}
      <Box
        onClick={() => setAgentOpen(true)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          mb: 2.5, px: 2, py: 1.5, borderRadius: 3,
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #7c5cff 0%, #a78bfa 100%)',
          color: '#fff',
          boxShadow: '0 4px 14px rgba(124,92,255,0.35)',
          transition: 'all 0.2s',
          '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(124,92,255,0.45)' },
          '&:active': { transform: 'translateY(0)' },
        }}
      >
        <AutoAwesomeRoundedIcon sx={{ fontSize: 28, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.3 }}>
            {t('ai.goals.analyzeBtn')}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.88, lineHeight: 1.3, display: 'block' }}>
            {t('ai.goals.description')}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 20, flexShrink: 0 }}>✨</Typography>
      </Box>
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

      {/* ── AI Agent dialog ── */}
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

