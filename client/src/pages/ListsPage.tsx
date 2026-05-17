import { Box, CircularProgress, Alert, Fab, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listsApi }       from '../api'
import { useAuth }        from '../contexts/AuthContext'
import type { PersonalList } from '../types'
import PersonalListCard   from '../components/lists/PersonalListCard'
import AddListDialog      from '../components/lists/AddListDialog'

export default function ListsPage() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const { user }   = useAuth()

  const [lists,   setLists]   = useState<PersonalList[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    listsApi
      .getByUser(user.id)
      .then(setLists)
      .catch(() => setError(t('error.loadFailed', 'Failed to load lists')))
      .finally(() => setLoading(false))
  }, [t, user])

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

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── List grid ── */}
      {!loading && !error && (lists.length === 0 ? (
        <Box
          sx={{
            borderRadius: 3,
            border: '1px dashed',
            borderColor: 'divider',
            py: 6,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.disabled">
            {t('list.empty')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {lists.map((list) => (
            <PersonalListCard
              key={list.id}
              list={list}
              onClick={() => navigate(`/lists/${list.id}`)}
            />
          ))}
        </Box>
      ))}

      {/* ── FAB ── */}
      <Fab
        color="primary"
        aria-label={t('list.new')}
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

      <AddListDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(list) => { setLists((prev) => [...prev, list]); setAddOpen(false) }}
        userId={user?.id ?? ''}
        createList={listsApi.create}
      />
    </Box>
  )
}

