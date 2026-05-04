import { Box, Fab, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { mockLists }      from '../data'
import PersonalListCard   from '../components/lists/PersonalListCard'

export default function ListsPage() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()

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

      {/* ── List grid ── */}
      {mockLists.length === 0 ? (
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
          {mockLists.map((list) => (
            <PersonalListCard
              key={list.id}
              list={list}
              onClick={() => navigate(`/lists/${list.id}`)}
            />
          ))}
        </Box>
      )}

      {/* ── FAB ── */}
      <Fab
        color="primary"
        aria-label={t('list.new')}
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
    </Box>
  )
}

