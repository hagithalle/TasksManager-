import { Box, CircularProgress, Alert, Fab, Typography, Button } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listsApi }       from '../api'
import { useAuth }        from '../contexts/AuthContext'
import type { PersonalList } from '../types'
import PersonalListCard   from '../components/lists/PersonalListCard'
import AddListDialog      from '../components/lists/AddListDialog'
import ListIntelligenceDialog from '../components/lists/ListIntelligenceDialog'

export default function ListsPage() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const { user }   = useAuth()

  const [lists,      setLists]      = useState<PersonalList[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [addOpen,    setAddOpen]    = useState(false)
  const [aiOpen,     setAiOpen]     = useState(false)

  useEffect(() => {
    if (!user) return
    listsApi
      .getByUser(user.id)
      .then(setLists)
      .catch(() => setError(t('error.loadFailed', 'Failed to load lists')))
      .finally(() => setLoading(false))
  }, [t, user])

  const handleDeleteList = (id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id))
    listsApi.delete(id).catch(() => {
      listsApi.getByUser(user!.id).then(setLists).catch(() => {})
    })
  }

  return (
    <Box sx={{ px: 2, pt: 2, pb: 4, position: 'relative' }}>

      {/* ── Section heading ── */}
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{ letterSpacing: 0.5, textTransform: 'uppercase', mb: 1.5, display: 'block' }}
      >
        {t('list.all')}
      </Typography>

      {/* ── AI Button (shown when 2+ lists exist) ── */}
      {lists.length >= 2 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeRoundedIcon />}
            onClick={() => setAiOpen(true)}
            sx={{
              borderRadius: 3, fontWeight: 700, fontSize: '0.78rem',
              borderColor: 'primary.main', color: 'primary.main',
              background: 'linear-gradient(135deg, rgba(124,92,255,0.06) 0%, rgba(124,92,255,0.03) 100%)',
              '&:hover': { bgcolor: 'rgba(124,92,255,0.1)' },
              px: 2.5,
            }}
          >
            {t('ai.lists.analyzeBtn')}
          </Button>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── List grid ── */}
      {!loading && !error && (lists.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 1.5 }}>
          <Typography sx={{ fontSize: 56, lineHeight: 1 }}>📋</Typography>
          <Typography variant="body1" fontWeight={700} color="text.primary">
            {t('list.emptyTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 260 }}>
            {t('list.emptySubtitle')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {lists.map((list) => (
            <PersonalListCard
              key={list.id}
              list={list}
              onClick={() => navigate(`/lists/${list.id}`)}
              onDelete={handleDeleteList}
            />
          ))}
        </Box>
      ))}

      {/* ── FAB ── */}
      <Fab
        color="primary"
        variant="extended"
        aria-label={t('list.new')}
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
        {t('list.new')}
      </Fab>

      <AddListDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(list) => { setLists((prev) => [...prev, list]); setAddOpen(false) }}
        userId={user?.id ?? ''}
        createList={listsApi.create}
      />

      <ListIntelligenceDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        lists={lists}
      />
    </Box>
  )
}

