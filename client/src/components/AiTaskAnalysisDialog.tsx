import { useState, useEffect } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import EmojiObjectsRoundedIcon from '@mui/icons-material/EmojiObjectsRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import { useTranslation } from 'react-i18next'
import { aiApi, type AiPlanGoal, type AiPlanTask, type AiPlanResponse } from '../api/aiApi'
import { goalsApi, tasksApi } from '../api'

// ── Memory helpers ────────────────────────────────────────────────────────────

interface AiPlanMemoryEntry {
  id: string
  date: string          // ISO date
  userText: string
  summary: string
  savedGoals: string[]
  savedTasks: string[]
}

function memoryKey(userId: string) { return `ai_plan_memory_${userId}` }

function loadMemory(userId: string): AiPlanMemoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(memoryKey(userId)) ?? '[]')
  } catch { return [] }
}

function saveMemory(userId: string, entries: AiPlanMemoryEntry[]) {
  try {
    localStorage.setItem(memoryKey(userId), JSON.stringify(entries.slice(-20)))
  } catch {}
}

function buildMemoryContext(entries: AiPlanMemoryEntry[], isHe: boolean): string {
  if (!entries.length) return ''
  const header = isHe
    ? 'הקשר מהשיחות הקודמות (לשימוש ה-AI לזכירה ומעקב):\n'
    : 'Context from previous sessions (for AI memory and follow-up):\n'
  const lines = entries.map(e => {
    const date = new Date(e.date).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: '2-digit', month: '2-digit', year: '2-digit' })
    const goals = e.savedGoals.length ? (isHe ? `מטרות: ${e.savedGoals.join(', ')}` : `Goals: ${e.savedGoals.join(', ')}`) : ''
    const tasks = e.savedTasks.length ? (isHe ? `משימות: ${e.savedTasks.join(', ')}` : `Tasks: ${e.savedTasks.join(', ')}`) : ''
    return `[${date}] ${e.userText.slice(0, 120)} → ${[goals, tasks].filter(Boolean).join(' | ')}`
  })
  return `${header}${lines.join('\n')}\n\n`
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  education: '📚',
  work:      '💼',
  health:    '💪',
  personal:  '⭐',
  finance:   '💰',
  other:     '🎯',
}

const PRIORITY_COLOR: Record<string, string> = {
  high:   '#D32F2F',
  medium: '#F57C00',
  low:    '#388E3C',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  open:      boolean
  onClose:   () => void
  userId:    string
  onCreated: () => void
}

type Phase = 'input' | 'result' | 'done'

// ── Component ─────────────────────────────────────────────────────────────────

export default function AiTaskAnalysisDialog({ open, onClose, userId, onCreated }: Props) {
  const { t, i18n } = useTranslation()
  const lang   = i18n.language?.startsWith('he') ? 'he' : 'en'
  const isRtl  = lang === 'he'

  const [phase,          setPhase]          = useState<Phase>('input')
  const [text,           setText]           = useState('')
  const [loading,        setLoading]        = useState(false)
  const [result,         setResult]         = useState<AiPlanResponse | null>(null)
  const [error,          setError]          = useState<string | null>(null)
  const [selectedGoals,  setSelectedGoals]  = useState<Set<number>>(new Set())
  const [selectedTasks,  setSelectedTasks]  = useState<Set<number>>(new Set())
  const [expandedTasks,  setExpandedTasks]  = useState<Set<number>>(new Set())
  const [saving,         setSaving]         = useState(false)
  const [savedCount,     setSavedCount]     = useState(0)
  const [memory,         setMemory]         = useState<AiPlanMemoryEntry[]>([])
  const [memoryOpen,     setMemoryOpen]     = useState(false)

  const totalSelected = selectedGoals.size + selectedTasks.size

  // load memory when dialog opens
  useEffect(() => {
    if (open && userId) setMemory(loadMemory(userId))
  }, [open, userId])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleClose() {
    setPhase('input')
    setText('')
    setResult(null)
    setError(null)
    setSelectedGoals(new Set())
    setSelectedTasks(new Set())
    setExpandedTasks(new Set())
    setSaving(false)
    onClose()
  }

  async function handleAnalyze() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const memCtx = buildMemoryContext(memory, isRtl)
      const fullText = memCtx ? `${memCtx}${isRtl ? 'הנושא הנוכחי:\n' : 'Current topic:\n'}${text.trim()}` : text.trim()
      const res = await aiApi.analyzePlan(fullText, lang)
      if (!res.goals.length && !res.tasks.length) {
        setError(t('ai.plan.noResults'))
        return
      }
      setResult(res)
      setSelectedGoals(new Set(res.goals.map((_, i) => i)))
      setSelectedTasks(new Set(res.tasks.map((_, i) => i)))
      setPhase('result')
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
      setError(code === 'RATE_LIMIT' ? t('ai.plan.errorRateLimit') : t('ai.plan.error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!result || totalSelected === 0) return
    setSaving(true)
    setError(null)
    try {
      // 1. Create selected goals and track title → id mapping
      const goalTitleToId = new Map<string, string>()
      for (const [i, goal] of result.goals.entries()) {
        if (!selectedGoals.has(i)) continue
        const created = await goalsApi.create({
          userId,
          title:    goal.title,
          category: goal.category ?? 'personal',
          goalType: 'finite',
          dueDate:  goal.dueDate ?? undefined,
          isPinned: false,
        })
        goalTitleToId.set(goal.title, created.id)
      }

      // 2. Create selected tasks (link to newly-created goals where possible)
      for (const [i, task] of result.tasks.entries()) {
        if (!selectedTasks.has(i)) continue
        const goalId = task.relatedGoal
          ? goalTitleToId.get(task.relatedGoal) ?? undefined
          : undefined
        const created = await tasksApi.create({
          userId,
          title:           task.title,
          priority:        task.priority ?? 'medium',
          executionType:   task.executionType ?? 'short',
          dueDate:         task.dueDate ?? undefined,
          durationMinutes: task.estimatedMinutes ?? undefined,
          goalId,
        })
        // Create subtasks
        for (const sub of task.subTasks ?? []) {
          await tasksApi.addSubTask(created.id, {
            title:           sub.title,
            durationMinutes: sub.estimatedMinutes ?? undefined,
          })
        }
      }

      // persist to memory
      const savedGoalTitles = result.goals.filter((_, i) => selectedGoals.has(i)).map(g => g.title)
      const savedTaskTitles = result.tasks.filter((_, i) => selectedTasks.has(i)).map(t => t.title)
      const entry: AiPlanMemoryEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        userText: text.trim(),
        summary: result.summary ?? '',
        savedGoals: savedGoalTitles,
        savedTasks: savedTaskTitles,
      }
      const updated = [...memory, entry]
      setMemory(updated)
      saveMemory(userId, updated)

      setSavedCount(totalSelected)
      setPhase('done')
      onCreated()
    } catch {
      setError(t('ai.plan.saveError'))
    } finally {
      setSaving(false)
    }
  }

  function toggleSelectAll() {
    if (!result) return
    if (totalSelected > 0) {
      setSelectedGoals(new Set())
      setSelectedTasks(new Set())
    } else {
      setSelectedGoals(new Set(result.goals.map((_, i) => i)))
      setSelectedTasks(new Set(result.tasks.map((_, i) => i)))
    }
  }

  function toggleGoal(i: number) {
    setSelectedGoals(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleTask(i: number) {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleExpand(i: number) {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '92vh' } }}
    >
      {/* Header */}
      <DialogTitle sx={{ pb: 0, pt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        {phase === 'result' && (
          <IconButton onClick={() => setPhase('input')} size="small" sx={{ mr: 0.5 }}>
            <ArrowBackRoundedIcon fontSize="small" />
          </IconButton>
        )}
        <AutoAwesomeRoundedIcon sx={{ color: 'secondary.main', fontSize: 22 }} />
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          {t('ai.plan.title')}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 0, overflowY: 'auto' }}>

        {/* ── Input phase ── */}
        {phase === 'input' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('ai.plan.subtitle')}
            </Typography>

            {/* Memory section */}
            {memory.length > 0 && (
              <Box sx={{ mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'rgba(124,92,255,0.2)', overflow: 'hidden' }}>
                <Box
                  onClick={() => setMemoryOpen(v => !v)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, cursor: 'pointer', bgcolor: 'rgba(124,92,255,0.05)', '&:hover': { bgcolor: 'rgba(124,92,255,0.09)' } }}
                >
                  <HistoryRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ flex: 1 }}>
                    {isRtl ? `זיכרון AI – ${memory.length} שיחות קודמות` : `AI Memory – ${memory.length} past sessions`}
                  </Typography>
                  {memoryOpen ? <ExpandLessRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
                </Box>
                <Collapse in={memoryOpen}>
                  <Box sx={{ maxHeight: 220, overflowY: 'auto', px: 1.5, py: 1 }}>
                    {[...memory].reverse().map(entry => (
                      <Box key={entry.id} sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none', mb: 0, pb: 0 } }}>
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.3 }}>
                          {new Date(entry.date).toLocaleDateString(isRtl ? 'he-IL' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', mb: 0.3 }}>
                          {entry.userText.slice(0, 100)}{entry.userText.length > 100 ? '…' : ''}
                        </Typography>
                        {entry.savedGoals.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            🎯 {entry.savedGoals.join(' · ')}
                          </Typography>
                        )}
                        {entry.savedTasks.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            ✅ {entry.savedTasks.slice(0, 3).join(' · ')}{entry.savedTasks.length > 3 ? ` +${entry.savedTasks.length - 3}` : ''}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )}

            <TextField
              multiline
              minRows={4}
              maxRows={9}
              fullWidth
              placeholder={t('ai.plan.placeholder')}
              value={text}
              onChange={e => setText(e.target.value)}
              dir={isRtl ? 'rtl' : 'ltr'}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }}>{error}</Alert>
            )}
          </Box>
        )}

        {/* ── Result phase ── */}
        {phase === 'result' && result && (
          <Box>
            {/* Summary banner */}
            {result.summary && (
              <Box sx={{
                bgcolor: 'secondary.main', color: 'white',
                borderRadius: 2, p: 1.5, mb: 2,
                display: 'flex', gap: 1, alignItems: 'flex-start',
              }}>
                <AutoAwesomeRoundedIcon sx={{ fontSize: 18, mt: 0.2, flexShrink: 0 }} />
                <Typography variant="body2" fontWeight={500}>{result.summary}</Typography>
              </Box>
            )}

            {/* Select-all row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                {t('ai.plan.selectItems')} ({totalSelected}/{result.goals.length + result.tasks.length})
              </Typography>
              <Button size="small" variant="text" onClick={toggleSelectAll} sx={{ fontSize: '0.72rem', py: 0.25 }}>
                {totalSelected > 0 ? t('ai.plan.deselectAll') : t('ai.plan.selectAll')}
              </Button>
            </Box>

            {/* Goals */}
            {result.goals.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <EmojiObjectsRoundedIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                  <Typography variant="caption" fontWeight={700} color="secondary.main">
                    {t('ai.plan.goalsSection')}
                  </Typography>
                </Box>

                {result.goals.map((goal: AiPlanGoal, i: number) => (
                  <Box
                    key={i}
                    onClick={() => toggleGoal(i)}
                    sx={{
                      display: 'flex', gap: 1, alignItems: 'flex-start',
                      mb: 1, p: 1.25, border: '1px solid', borderRadius: 2, cursor: 'pointer',
                      borderColor: selectedGoals.has(i) ? 'secondary.main' : 'divider',
                      bgcolor:     selectedGoals.has(i) ? 'rgba(156,39,176,0.04)' : 'transparent',
                      transition:  'all 0.12s',
                    }}
                  >
                    <Checkbox
                      checked={selectedGoals.has(i)}
                      onChange={() => toggleGoal(i)}
                      size="small"
                      color="secondary"
                      sx={{ p: 0.25, mt: 0.1 }}
                      onClick={e => e.stopPropagation()}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                        <Typography sx={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>
                          {CATEGORY_EMOJI[goal.category] ?? '🎯'}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>{goal.title}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip
                          size="small"
                          label={t(`priority.${goal.priority}`)}
                          sx={{
                            height: 18, fontSize: '0.62rem', fontWeight: 700,
                            bgcolor: (PRIORITY_COLOR[goal.priority] ?? '#999') + '22',
                            color:    PRIORITY_COLOR[goal.priority] ?? '#999',
                          }}
                        />
                        {goal.dueDate && (
                          <Chip size="small" label={goal.dueDate}
                            sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(0,0,0,0.05)' }} />
                        )}
                        {goal.estimatedTotalHours != null && (
                          <Chip
                            size="small"
                            label={t('ai.plan.approxHours', { count: goal.estimatedTotalHours })}
                            sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(0,0,0,0.05)' }}
                          />
                        )}
                      </Box>
                      {goal.rationale && (
                        <Typography variant="caption" color="text.secondary"
                          sx={{ display: 'block', mt: 0.35, fontSize: '0.67rem' }}>
                          {goal.rationale}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </>
            )}

            {/* Tasks */}
            {result.tasks.length > 0 && (
              <>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  mt: result.goals.length > 0 ? 1.5 : 0, mb: 1,
                }}>
                  <TaskAltRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="caption" fontWeight={700} color="primary.main">
                    {t('ai.plan.tasksSection')}
                  </Typography>
                </Box>

                {result.tasks.map((task: AiPlanTask, i: number) => (
                  <Box
                    key={i}
                    sx={{
                      mb: 1, border: '1px solid', borderRadius: 2, overflow: 'hidden',
                      borderColor: selectedTasks.has(i) ? 'primary.main' : 'divider',
                      bgcolor:     selectedTasks.has(i) ? 'rgba(124,92,255,0.04)' : 'transparent',
                      transition:  'all 0.12s',
                    }}
                  >
                    <Box
                      onClick={() => toggleTask(i)}
                      sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1.25, cursor: 'pointer' }}
                    >
                      <Checkbox
                        checked={selectedTasks.has(i)}
                        onChange={() => toggleTask(i)}
                        size="small"
                        color="primary"
                        sx={{ p: 0.25, mt: 0.1 }}
                        onClick={e => e.stopPropagation()}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>
                          {task.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Chip
                            size="small"
                            label={t(`priority.${task.priority}`)}
                            sx={{
                              height: 18, fontSize: '0.62rem', fontWeight: 700,
                              bgcolor: (PRIORITY_COLOR[task.priority] ?? '#999') + '22',
                              color:    PRIORITY_COLOR[task.priority] ?? '#999',
                            }}
                          />
                          <Chip
                            size="small"
                            label={t(`executionType.${task.executionType}`)}
                            sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(0,0,0,0.06)' }}
                          />
                          {task.frequency && task.frequency !== 'once' && (
                            <Chip
                              size="small"
                              label={t(`ai.plan.${task.frequency}`)}
                              sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(33,150,243,0.1)', color: '#0277BD' }}
                            />
                          )}
                          {task.estimatedMinutes != null && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              ~{task.estimatedMinutes}{t('task.minutesShort')}
                            </Typography>
                          )}
                          {task.dueDate && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              📅 {task.dueDate}
                            </Typography>
                          )}
                        </Box>
                        {task.relatedGoal && (
                          <Typography variant="caption" color="secondary.main"
                            sx={{ fontSize: '0.65rem', display: 'block', mt: 0.25 }}>
                            ↳ {task.relatedGoal}
                          </Typography>
                        )}
                      </Box>
                      {(task.subTasks?.length ?? 0) > 0 && (
                        <IconButton
                          size="small"
                          sx={{ p: 0.25, alignSelf: 'center' }}
                          onClick={e => { e.stopPropagation(); toggleExpand(i) }}
                        >
                          {expandedTasks.has(i)
                            ? <ExpandLessRoundedIcon sx={{ fontSize: 16 }} />
                            : <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />
                          }
                        </IconButton>
                      )}
                    </Box>

                    {/* Sub-tasks */}
                    {(task.subTasks?.length ?? 0) > 0 && (
                      <Collapse in={expandedTasks.has(i)}>
                        <Divider />
                        <Box sx={{ px: 2, py: 0.75 }}>
                          {task.subTasks.map((sub, j) => (
                            <Box key={j} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.3 }}>
                              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                              <Typography variant="caption" sx={{ flex: 1 }}>{sub.title}</Typography>
                              {sub.estimatedMinutes != null && (
                                <Typography variant="caption" color="text.disabled">
                                  {sub.estimatedMinutes}{t('task.minutesShort')}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    )}
                  </Box>
                ))}
              </>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }}>{error}</Alert>
            )}
          </Box>
        )}

        {/* ── Done phase ── */}
        {phase === 'done' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ fontSize: 52 }}>🎉</Typography>
            <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
              {t('ai.plan.saved')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('ai.plan.savedSub', { count: savedCount })}
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
        {phase === 'input' && (
          <>
            <Button onClick={handleClose} color="inherit">{t('common.cancel')}</Button>
            <Button
              onClick={handleAnalyze}
              variant="contained"
              disabled={!text.trim() || loading}
              startIcon={loading
                ? <CircularProgress size={16} color="inherit" />
                : <AutoAwesomeRoundedIcon />
              }
              sx={{ borderRadius: 2.5, fontWeight: 700, minWidth: 120 }}
            >
              {loading ? t('ai.plan.analyzing') : t('ai.plan.analyze')}
            </Button>
          </>
        )}

        {phase === 'result' && (
          <>
            <Button onClick={() => setPhase('input')} color="inherit">{t('ai.plan.back')}</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={totalSelected === 0 || saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ borderRadius: 2.5, fontWeight: 700, flex: 1 }}
            >
              {saving ? t('ai.plan.saving') : t('ai.plan.saveBtn', { count: totalSelected })}
            </Button>
          </>
        )}

        {phase === 'done' && (
          <Button
            onClick={handleClose}
            variant="contained"
            fullWidth
            sx={{ borderRadius: 2.5, fontWeight: 700 }}
          >
            {t('common.done')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
