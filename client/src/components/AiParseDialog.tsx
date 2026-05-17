import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Chip, CircularProgress,
  Divider, IconButton, List, ListItem, ListItemText, ListItemIcon,
  Checkbox, Alert,
} from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import EmojiObjectsRoundedIcon from '@mui/icons-material/EmojiObjectsRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { useTranslation } from 'react-i18next'
import apiClient from '../api/apiClient'
import type { Goal, TaskItem } from '../types'
import { goalsApi } from '../api/goalsApi'
import { tasksApi } from '../api/tasksApi'

interface AiParsedTask {
  title: string
  dueDate?: string | null
  priority?: string | null
  executionType?: string | null
}

interface AiParsedGoal {
  title: string
  category?: string | null
  dueDate?: string | null
}

interface AiParseResponse {
  tasks: AiParsedTask[]
  goals: AiParsedGoal[]
}

interface Props {
  open: boolean
  onClose: () => void
  userId: string
  onCreated: (tasks: TaskItem[], goals: Goal[]) => void
}

export default function AiParseDialog({ open, onClose, userId, onCreated }: Props) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<AiParseResponse | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const [selectedGoals, setSelectedGoals] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setParsed(null)
    try {
      const res = await apiClient.post<AiParseResponse>('/ai/parse', {
        text: text.trim(),
        language: i18n.language,
      })
      setParsed(res.data)
      setSelectedTasks(new Set(res.data.tasks.map((_: AiParsedTask, i: number) => i)))
      setSelectedGoals(new Set(res.data.goals.map((_: AiParsedGoal, i: number) => i)))
    } catch {
      setError(t('ai.error'))
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = (i: number) => {
    const s = new Set(selectedTasks)
    s.has(i) ? s.delete(i) : s.add(i)
    setSelectedTasks(s)
  }

  const toggleGoal = (i: number) => {
    const s = new Set(selectedGoals)
    s.has(i) ? s.delete(i) : s.add(i)
    setSelectedGoals(s)
  }

  const handleCreate = async () => {
    if (!parsed) return
    setSaving(true)
    try {
      const createdTasks: TaskItem[] = []
      const createdGoals: Goal[] = []

      for (const i of selectedGoals) {
        const g = parsed.goals[i]
        const goal = await goalsApi.create({
          userId,
          title: g.title,
          category: (g.category as any) ?? 'personal',
          goalType: 'ongoing',
          dueDate: g.dueDate ?? undefined,
        })
        createdGoals.push(goal)
      }

      for (const i of selectedTasks) {
        const tk = parsed.tasks[i]
        const task = await tasksApi.create({
          userId,
          title: tk.title,
          priority: (tk.priority as any) ?? 'medium',
          executionType: (tk.executionType as any) ?? undefined,
          dueDate: tk.dueDate ?? undefined,
        })
        createdTasks.push(task)
      }

      onCreated(createdTasks, createdGoals)
      handleClose()
    } catch {
      setError(t('ai.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setText('')
    setParsed(null)
    setError(null)
    setSelectedTasks(new Set())
    setSelectedGoals(new Set())
    onClose()
  }

  const totalSelected = selectedTasks.size + selectedGoals.size

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <AutoAwesomeRoundedIcon color="primary" />
        <Typography variant="h6" fontWeight={700} flex={1}>{t('ai.title')}</Typography>
        <IconButton onClick={handleClose} size="small"><CloseRoundedIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {!parsed ? (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('ai.subtitle')}
            </Typography>
            <TextField
              multiline
              rows={5}
              fullWidth
              placeholder={t('ai.placeholder')}
              value={text}
              onChange={e => setText(e.target.value)}
              dir={isRtl ? 'rtl' : 'ltr'}
              sx={{ mb: 1 }}
            />
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>
              {t('ai.selectItems')}
            </Typography>

            {parsed.tasks.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <TaskAltRoundedIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    {t('ai.tasks')} ({parsed.tasks.length})
                  </Typography>
                </Box>
                <List dense disablePadding sx={{ mb: 1 }}>
                  {parsed.tasks.map((tk, i) => (
                    <ListItem key={i} disablePadding sx={{ borderRadius: 1, mb: 0.5, bgcolor: 'action.hover' }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox checked={selectedTasks.has(i)} onChange={() => toggleTask(i)} size="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={tk.title}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.3 }}>
                            {tk.dueDate && <Chip label={tk.dueDate} size="small" variant="outlined" />}
                            {tk.priority && <Chip label={t(`priority.${tk.priority}`)} size="small" color="primary" variant="outlined" />}
                            {tk.executionType && <Chip label={t(`executionType.${tk.executionType}`)} size="small" variant="outlined" />}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {parsed.goals.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <EmojiObjectsRoundedIcon fontSize="small" color="warning" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    {t('ai.goals')} ({parsed.goals.length})
                  </Typography>
                </Box>
                <List dense disablePadding>
                  {parsed.goals.map((g, i) => (
                    <ListItem key={i} disablePadding sx={{ borderRadius: 1, mb: 0.5, bgcolor: 'action.hover' }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox checked={selectedGoals.has(i)} onChange={() => toggleGoal(i)} size="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={g.title}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.3 }}>
                            {g.category && <Chip label={t(`category.${g.category}`, g.category)} size="small" variant="outlined" />}
                            {g.dueDate && <Chip label={g.dueDate} size="small" variant="outlined" />}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {parsed.tasks.length === 0 && parsed.goals.length === 0 && (
              <Alert severity="info">{t('ai.noResults')}</Alert>
            )}

            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {!parsed ? (
          <>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button
              variant="contained"
              onClick={handleParse}
              disabled={!text.trim() || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesomeRoundedIcon />}
            >
              {loading ? t('ai.analyzing') : t('ai.analyze')}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setParsed(null)}>{t('ai.back')}</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={totalSelected === 0 || saving}
              startIcon={saving ? <CircularProgress size={16} /> : undefined}
            >
              {saving ? t('common.loading') : t('ai.createSelected', { count: totalSelected })}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
