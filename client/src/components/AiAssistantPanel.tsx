import { useEffect, useRef, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Divider,
  Drawer, Fab, IconButton, InputAdornment, TextField, Typography,
} from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import CloseRoundedIcon       from '@mui/icons-material/CloseRounded'
import SearchRoundedIcon      from '@mui/icons-material/SearchRounded'
import WbSunnyRoundedIcon     from '@mui/icons-material/WbSunnyRounded'
import LightbulbRoundedIcon   from '@mui/icons-material/LightbulbRounded'
import EventBusyRoundedIcon   from '@mui/icons-material/EventBusyRounded'
import { useTranslation }   from 'react-i18next'
import { tasksApi }         from '../api'
import { aiApi }            from '../api/aiApi'
import type { AiDayAnalysis, AiInsightsResponse, AiPattern } from '../api/aiApi'
import type { TaskItem }    from '../types'
import { Priority }         from '../types'
import { TODAY }            from '../utils'

// ── helpers ───────────────────────────────────────────────────────────────────

const LOAD_COLOR: Record<string, string> = {
  light:      '#4CAF50',
  moderate:   '#FF9800',
  heavy:      '#F44336',
  overloaded: '#9C27B0',
}

const LOAD_BG: Record<string, string> = {
  light:      '#E8F5E9',
  moderate:   '#FFF3E0',
  heavy:      '#FFEBEE',
  overloaded: '#F3E5F5',
}

const PATTERN_EMOJI: Record<AiPattern['type'], string> = {
  procrastination: '🐌',
  overload:        '🔥',
  strength:        '💪',
  tip:             '💡',
}

function getTomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  tasks:      TaskItem[]
  onTaskMoved?: (taskId: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AiAssistantPanel({ tasks, onTaskMoved }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('he') ? 'he' : 'en'

  const [open, setOpen] = useState(false)

  // Day analysis
  const [dayAnalysis,    setDayAnalysis]    = useState<AiDayAnalysis | null>(null)
  const [dayLoading,     setDayLoading]     = useState(false)

  // Search
  const [query,          setQuery]          = useState('')
  const [searchLoading,  setSearchLoading]  = useState(false)
  const [searchResults,  setSearchResults]  = useState<{ tasks: TaskItem[]; explanation: string } | null>(null)

  // Insights
  const [insights,       setInsights]       = useState<AiInsightsResponse | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  // Moved tasks (optimistic)
  const [movedIds, setMovedIds] = useState<Set<string>>(new Set())

  const searchRef = useRef<HTMLInputElement>(null)

  // ── Load day analysis + insights when drawer opens ───────────────────────
  useEffect(() => {
    if (!open) return

    const todayTasks = tasks.filter(tk => !tk.isCompleted && tk.dueDate?.startsWith(TODAY))

    if (todayTasks.length > 0 && !dayAnalysis) {
      setDayLoading(true)
      aiApi.analyzeDay(todayTasks, lang)
        .then(setDayAnalysis)
        .finally(() => setDayLoading(false))
    }

    if (!insights) {
      const allTasks  = tasks
      const completed = allTasks.filter(tk => tk.isCompleted).length
      const overdue   = allTasks.filter(tk => {
        if (tk.isCompleted || !tk.dueDate) return false
        return tk.dueDate.slice(0, 10) < TODAY
      }).length

      const frogTotal     = allTasks.filter(tk => tk.priority === Priority.Critical || tk.priority === Priority.High).length
      const frogCompleted = allTasks.filter(tk => tk.isCompleted && (tk.priority === Priority.Critical || tk.priority === Priority.High)).length

      // Last 7 days stats
      const last7: { date: string; total: number; completed: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const date = d.toISOString().slice(0, 10)
        const dayTasks = allTasks.filter(tk => tk.dueDate?.startsWith(date))
        last7.push({ date, total: dayTasks.length, completed: dayTasks.filter(tk => tk.isCompleted).length })
      }

      setInsightsLoading(true)
      aiApi.getInsights({
        totalTasks: allTasks.length,
        completedTasks: completed,
        overdueTasks: overdue,
        frogTasksCompleted: frogCompleted,
        frogTasksTotal: frogTotal,
        last7Days: last7,
        language: lang,
      })
        .then(setInsights)
        .finally(() => setInsightsLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!query.trim() || tasks.length === 0) return
    setSearchLoading(true)
    setSearchResults(null)
    try {
      const res = await aiApi.searchTasks(query.trim(), tasks, lang)
      const matched = tasks.filter(tk => res.taskIds.includes(tk.id))
      setSearchResults({ tasks: matched, explanation: res.explanation })
    } finally {
      setSearchLoading(false)
    }
  }

  // ── Move task to tomorrow ─────────────────────────────────────────────────
  const moveToTomorrow = async (taskId: string) => {
    setMovedIds(prev => new Set([...prev, taskId]))
    await tasksApi.update(taskId, { dueDate: getTomorrow() })
    onTaskMoved?.(taskId)
  }

  const loadLevel = dayAnalysis?.loadLevel ?? 'moderate'

  return (
    <>
      {/* ── Floating Action Button ── */}
      <Fab
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 80,   // above bottom nav
          right: 16,
          bgcolor: 'primary.main',
          color: '#fff',
          width: 52,
          height: 52,
          boxShadow: '0 4px 20px rgba(124,92,255,0.45)',
          '&:hover': { bgcolor: 'primary.dark' },
          zIndex: 1200,
        }}
      >
        <AutoAwesomeRoundedIcon sx={{ fontSize: 24 }} />
      </Fab>

      {/* ── Drawer ── */}
      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '20px 20px 0 0',
            maxHeight: '88vh',
            overflowY: 'auto',
            px: 2,
            pb: 4,
            pt: 1,
          },
        }}
      >
        {/* Handle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5 }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider' }} />
        </Box>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AutoAwesomeRoundedIcon sx={{ color: 'primary.main', mr: 1, fontSize: 22 }} />
          <Typography variant="h6" fontWeight={800} sx={{ flex: 1, fontSize: '1.05rem' }}>
            {t('ai.title')}
          </Typography>
          <IconButton size="small" onClick={() => setOpen(false)}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* ── Section 1: Day Analysis ─────────────────────────────────────── */}
        <SectionTitle icon={<WbSunnyRoundedIcon sx={{ fontSize: 18, color: '#FF9800' }} />} label={t('ai.dayTitle')} />

        {dayLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={28} />
          </Box>
        ) : dayAnalysis ? (
          <Box
            sx={{
              borderRadius: 3, p: 2, mb: 2,
              bgcolor: LOAD_BG[loadLevel],
              border: `1.5px solid ${LOAD_COLOR[loadLevel]}33`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Chip
                label={t(`ai.load.${loadLevel}`)}
                size="small"
                sx={{
                  bgcolor: LOAD_COLOR[loadLevel],
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  height: 22,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {tasks.filter(tk => !tk.isCompleted && tk.dueDate?.startsWith(TODAY)).length} {t('ai.tasksToday')}
              </Typography>
            </Box>

            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, lineHeight: 1.5 }}>
              {dayAnalysis.message}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              {dayAnalysis.encouragement}
            </Typography>

            {/* Tasks to move */}
            {(dayAnalysis.tasksToMove ?? []).length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('ai.moveSuggestion')}
                </Typography>
                {(dayAnalysis.tasksToMove ?? []).map(tm => {
                  const task = tasks.find(tk => tk.id === tm.id)
                  if (!task) return null
                  const moved = movedIds.has(tm.id)
                  return (
                    <Box
                      key={tm.id}
                      sx={{
                        display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1,
                        p: 1, borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.6)',
                        opacity: moved ? 0.45 : 1,
                      }}
                    >
                      <EventBusyRoundedIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25, flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" fontWeight={600} noWrap display="block">{task.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{tm.reason}</Typography>
                      </Box>
                      {!moved ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => moveToTomorrow(tm.id)}
                          sx={{ fontSize: '0.62rem', height: 24, borderRadius: 2, flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                          {t('ai.moveTomorrow')}
                        </Button>
                      ) : (
                        <Typography variant="caption" color="success.main" sx={{ flexShrink: 0 }}>✓ {t('ai.moved')}</Typography>
                      )}
                    </Box>
                  )
                })}
              </Box>
            )}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {t('ai.noTodayTasks')}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        {/* ── Section 2: Natural Language Search ──────────────────────────── */}
        <SectionTitle icon={<SearchRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />} label={t('ai.searchTitle')} />

        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <TextField
            inputRef={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={t('ai.searchPlaceholder')}
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontSize: '0.85rem' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleSearch}
            disabled={searchLoading || !query.trim()}
            sx={{ borderRadius: 2.5, fontWeight: 700, minWidth: 56, flexShrink: 0 }}
          >
            {searchLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : t('ai.searchBtn')}
          </Button>
        </Box>

        {/* Search examples */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
          {(Array.isArray(t('ai.searchExamples', { returnObjects: true })) ? t('ai.searchExamples', { returnObjects: true }) as string[] : []).map((ex: string) => (
            <Chip
              key={ex}
              label={ex}
              size="small"
              variant="outlined"
              onClick={() => { setQuery(ex); searchRef.current?.focus() }}
              sx={{ fontSize: '0.68rem', height: 22, cursor: 'pointer', borderColor: 'primary.light', color: 'primary.main' }}
            />
          ))}
        </Box>

        {searchResults && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
              {searchResults.explanation}
            </Typography>
            {searchResults.tasks.length === 0 ? (
              <Alert severity="info" sx={{ py: 0.5, borderRadius: 2 }}>{t('ai.noResults')}</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {searchResults.tasks.map(tk => (
                  <Box
                    key={tk.id}
                    sx={{
                      p: 1, borderRadius: 2,
                      bgcolor: 'rgba(124,92,255,0.05)',
                      border: '1px solid rgba(124,92,255,0.12)',
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}
                  >
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      bgcolor: tk.priority === Priority.Critical ? '#ef4444'
                             : tk.priority === Priority.High ? '#f97316'
                             : tk.priority === Priority.Medium ? '#7c5cff' : '#94a3b8',
                    }} />
                    <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
                      {tk.title}
                    </Typography>
                    {tk.dueDate && (
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {tk.dueDate.slice(5, 10)}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* ── Section 3: Behavior Insights ────────────────────────────────── */}
        <SectionTitle icon={<LightbulbRoundedIcon sx={{ fontSize: 18, color: '#F59E0B' }} />} label={t('ai.insightsTitle')} />

        {insightsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={28} />
          </Box>
        ) : insights ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
              {insights.overallMessage}
            </Typography>
            {(insights.patterns ?? []).map((p, i) => (
              <Box
                key={i}
                sx={{
                  p: 1.5, borderRadius: 2.5, mb: 1,
                  bgcolor: p.type === 'strength' ? '#E8F5E9'
                         : p.type === 'overload' ? '#FFEBEE'
                         : p.type === 'procrastination' ? '#FFF8E1'
                         : '#F3E5F5',
                  border: '1px solid',
                  borderColor: p.type === 'strength' ? '#C8E6C9'
                             : p.type === 'overload' ? '#FFCDD2'
                             : p.type === 'procrastination' ? '#FFE082'
                             : '#E1BEE7',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Typography sx={{ fontSize: 20, lineHeight: 1.3, flexShrink: 0 }}>
                    {PATTERN_EMOJI[p.type] ?? p.emoji}
                  </Typography>
                  <Box>
                    <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.25 }}>
                      {p.message}
                    </Typography>
                    {p.suggestion && (
                      <Typography variant="caption" color="text.secondary">
                        👉 {p.suggestion}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        ) : null}
      </Drawer>
    </>
  )
}

// ── Section title helper ──────────────────────────────────────────────────────

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
      {icon}
      <Typography variant="caption" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.6, color: 'text.secondary', fontSize: '0.65rem' }}>
        {label}
      </Typography>
    </Box>
  )
}
