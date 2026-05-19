import { useState } from 'react'
import {
  Box, Button, Chip, CircularProgress, Dialog,
  DialogContent, DialogTitle, Divider, IconButton,
  LinearProgress, Typography,
} from '@mui/material'
import CloseRoundedIcon      from '@mui/icons-material/CloseRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded'
import { useTranslation }     from 'react-i18next'
import { aiApi }              from '../../api/aiApi'
import type { AiGoalAnalysisResponse, AiGoalResult } from '../../api/aiApi'
import type { Goal }          from '../../types'
import GoalCategoryIcon       from './GoalCategoryIcon'

// ── status config ─────────────────────────────────────────────────────────────

type GoalStatus = AiGoalResult['status']

const STATUS_PROPS: Record<GoalStatus, { label: string; labelHe: string; color: string; bg: string; emoji: string }> = {
  'completed':  { label: 'Completed',  labelHe: 'הושלם ✅',    color: '#4CAF50', bg: '#E8F5E9', emoji: '✅' },
  'on-track':   { label: 'On track',   labelHe: 'בדרך 🟢',     color: '#2196F3', bg: '#E3F2FD', emoji: '🟢' },
  'at-risk':    { label: 'At risk',    labelHe: 'בסכנה ⚠️',    color: '#FF9800', bg: '#FFF3E0', emoji: '⚠️' },
  'stalled':    { label: 'Stalled',    labelHe: 'תקוע 🔴',     color: '#F44336', bg: '#FFEBEE', emoji: '🔴' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  goals:   Goal[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GoalsAgentDialog({ open, onClose, goals }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('he') ? 'he' : 'en'

  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<AiGoalAnalysisResponse | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await aiApi.analyzeGoals(goals, lang)
      setResult(res)
    } catch {
      setError(t('ai.goals.error'))
    } finally {
      setLoading(false)
    }
  }

  // Reset when dialog closes
  const handleClose = () => {
    setResult(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 4, maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrackChangesRoundedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="h6" fontWeight={800} sx={{ flex: 1, fontSize: '1rem' }}>
            {t('ai.goals.title')}
          </Typography>
          <IconButton size="small" onClick={handleClose}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {t('ai.goals.subtitle', { count: goals.length })}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>

        {/* ── Not yet analyzed ── */}
        {!result && !loading && !error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
            <Typography sx={{ fontSize: 56 }}>🎯</Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 280 }}>
              {t('ai.goals.description')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeRoundedIcon />}
              onClick={handleAnalyze}
              disabled={goals.length === 0}
              sx={{ borderRadius: 3, fontWeight: 700, px: 3 }}
            >
              {t('ai.goals.analyzeBtn')}
            </Button>
          </Box>
        )}

        {/* ── Loading ── */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, gap: 2 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">{t('ai.goals.analyzing')}</Typography>
          </Box>
        )}

        {/* ── Error ── */}
        {error && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography color="error.main" variant="body2" sx={{ mb: 2 }}>{error}</Typography>
            <Button variant="outlined" onClick={handleAnalyze} size="small">{t('common.retry', 'Retry')}</Button>
          </Box>
        )}

        {/* ── Results ── */}
        {result && (
          <Box>
            {/* Summary message */}
            <Box
              sx={{
                p: 2, borderRadius: 3, mb: 2,
                bgcolor: 'rgba(124,92,255,0.06)',
                border: '1.5px solid rgba(124,92,255,0.15)',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0, mt: 0.2 }} />
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.6 }}>
                  {result.overallMessage}
                </Typography>
              </Box>
              {result.strategy && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  💡 {result.strategy}
                </Typography>
              )}
            </Box>

            {/* Status summary chips */}
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
              {(['completed', 'on-track', 'at-risk', 'stalled'] as GoalStatus[]).map(s => {
                const count = (result.goals ?? []).filter(g => g.status === s).length
                if (count === 0) return null
                const cfg = STATUS_PROPS[s]
                return (
                  <Chip
                    key={s}
                    label={`${cfg.emoji} ${lang === 'he' ? cfg.labelHe : cfg.label} ${count}`}
                    size="small"
                    sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.68rem', border: `1px solid ${cfg.color}33` }}
                  />
                )
              })}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Per-goal cards */}
            {(result.goals ?? []).map(gr => {
              const goal = goals.find(g => g.id === gr.id)
              if (!goal) return null
              const cfg = STATUS_PROPS[gr.status] ?? STATUS_PROPS['on-track']
              const pct = goal.totalTasks > 0 ? Math.round(goal.completedTasks / goal.totalTasks * 100) : 0

              return (
                <Box
                  key={gr.id}
                  sx={{
                    mb: 1.5, p: 1.5, borderRadius: 3,
                    bgcolor: cfg.bg,
                    border: `1.5px solid ${cfg.color}33`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                    <GoalCategoryIcon category={goal.category} size={36} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                          {goal.title}
                        </Typography>
                        <Chip
                          label={cfg.emoji}
                          size="small"
                          sx={{ bgcolor: cfg.color, color: '#fff', height: 20, minWidth: 32, '& .MuiChip-label': { px: 0.6 } }}
                        />
                      </Box>

                      {/* Progress bar */}
                      {goal.totalTasks > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              flex: 1, height: 5, borderRadius: 4,
                              bgcolor: 'rgba(0,0,0,0.08)',
                              '& .MuiLinearProgress-bar': { bgcolor: cfg.color, borderRadius: 4 },
                            }}
                          />
                          <Typography variant="caption" fontWeight={700} sx={{ color: cfg.color, flexShrink: 0, fontSize: '0.68rem' }}>
                            {pct}%
                          </Typography>
                        </Box>
                      )}

                      {/* Assessment */}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                        {gr.assessment}
                      </Typography>

                      {/* Recommendation */}
                      {gr.recommendation && (
                        <Box sx={{ mt: 0.75, p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.6)' }}>
                          <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 700 }}>
                            👉 {gr.recommendation}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              )
            })}

            {/* Re-analyze button */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button
                size="small"
                startIcon={<AutoAwesomeRoundedIcon />}
                onClick={handleAnalyze}
                sx={{ fontSize: '0.75rem', color: 'primary.main' }}
              >
                {t('ai.goals.reanalyze')}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
