import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Chip, CircularProgress,
  Divider, IconButton, List,
  Checkbox, Alert, Select, MenuItem, FormControl, InputLabel, Collapse,
} from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import TaskAltRoundedIcon     from '@mui/icons-material/TaskAltRounded'
import EmojiObjectsRoundedIcon from '@mui/icons-material/EmojiObjectsRounded'
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded'
import CloseRoundedIcon        from '@mui/icons-material/CloseRounded'
import EditRoundedIcon         from '@mui/icons-material/EditRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import AddRoundedIcon          from '@mui/icons-material/AddRounded'
import ExpandLessRoundedIcon   from '@mui/icons-material/ExpandLessRounded'
import ExpandMoreRoundedIcon   from '@mui/icons-material/ExpandMoreRounded'
import { useTranslation }      from 'react-i18next'
import apiClient               from '../api/apiClient'
import type { Goal, TaskItem, PersonalList } from '../types'
import { goalsApi }  from '../api/goalsApi'
import { tasksApi }  from '../api/tasksApi'
import { listsApi }  from '../api/listsApi'

interface AiParsedTask {
  title:         string
  dueDate?:      string | null
  priority?:     string | null
  executionType?: string | null
  subTasks?:     string[]
}

interface AiParsedGoal {
  title:     string
  category?: string | null
  dueDate?:  string | null
}

interface AiParsedListItem {
  title:     string
  quantity?: string | null
  listName?: string | null
}

interface AiParseResponse {
  tasks:     AiParsedTask[]
  goals:     AiParsedGoal[]
  listItems: AiParsedListItem[]
}

interface Props {
  open:      boolean
  onClose:   () => void
  userId:    string
  onCreated: (tasks: TaskItem[], goals: Goal[]) => void
}

const PRIORITIES     = ['low', 'medium', 'high', 'critical']
const EXECUTION_TYPES = ['quick', 'short', 'medium', 'long']
const CATEGORIES     = ['health', 'work', 'personal', 'finance', 'education', 'other']

export default function AiParseDialog({ open, onClose, userId, onCreated }: Props) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lists, setLists] = useState<PersonalList[]>([])
  const [targetListId, setTargetListId] = useState<string>('new')

  // Editable parsed data
  const [editedTasks, setEditedTasks]         = useState<AiParsedTask[]>([])
  const [editedGoals, setEditedGoals]         = useState<AiParsedGoal[]>([])
  const [editedListItems, setEditedListItems] = useState<AiParsedListItem[]>([])

  const [selectedTasks, setSelectedTasks]         = useState<Set<number>>(new Set())
  const [selectedGoals, setSelectedGoals]         = useState<Set<number>>(new Set())
  const [selectedListItems, setSelectedListItems] = useState<Set<number>>(new Set())

  // Which item is expanded for editing
  const [expandedTask, setExpandedTask]     = useState<number | null>(null)
  const [expandedGoal, setExpandedGoal]     = useState<number | null>(null)
  const [expandedList, setExpandedList]     = useState<number | null>(null)
  const [newSubInput, setNewSubInput]       = useState('')

  const hasParsed = editedTasks.length > 0 || editedGoals.length > 0 || editedListItems.length > 0

  useEffect(() => {
    if (open && userId) {
      listsApi.getByUser(userId).then(setLists).catch(() => {})
    }
  }, [open, userId])

  useEffect(() => {
    if (!editedListItems.length) return
    const suggestedName = (editedListItems[0]?.listName ?? '').toLowerCase()
    if (suggestedName) {
      const match = lists.find(l =>
        l.title.toLowerCase().includes(suggestedName) ||
        suggestedName.includes(l.title.toLowerCase())
      )
      setTargetListId(match ? match.id : 'new')
    } else {
      setTargetListId(lists[0]?.id ?? 'new')
    }
  }, [editedListItems, lists])

  // ── Parse ─────────────────────────────────────────────────────────────────
  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.post<AiParseResponse>('/ai/parse', {
        text: text.trim(),
        language: i18n.language,
      })
      const d = res.data
      setEditedTasks(d.tasks.map(tk => ({ ...tk, subTasks: [...(tk.subTasks ?? [])] })))
      setEditedGoals(d.goals.map(g => ({ ...g })))
      setEditedListItems(d.listItems.map(li => ({ ...li })))
      setSelectedTasks(new Set(d.tasks.map((_, i) => i)))
      setSelectedGoals(new Set(d.goals.map((_, i) => i)))
      setSelectedListItems(new Set(d.listItems.map((_, i) => i)))
      setExpandedTask(null)
      setExpandedGoal(null)
      setExpandedList(null)
    } catch (err: any) {
      const code = err?.response?.data?.code
      if (code === 'RATE_LIMIT') setError(t('ai.errorRateLimit'))
      else setError(t('ai.error'))
    } finally {
      setLoading(false)
    }
  }

  // ── Edit helpers ──────────────────────────────────────────────────────────
  const updateTask = (i: number, patch: Partial<AiParsedTask>) =>
    setEditedTasks(prev => prev.map((tk, idx) => idx === i ? { ...tk, ...patch } : tk))

  const updateGoal = (i: number, patch: Partial<AiParsedGoal>) =>
    setEditedGoals(prev => prev.map((g, idx) => idx === i ? { ...g, ...patch } : g))

  const updateListItem = (i: number, patch: Partial<AiParsedListItem>) =>
    setEditedListItems(prev => prev.map((li, idx) => idx === i ? { ...li, ...patch } : li))

  const addSubtask = (taskIdx: number) => {
    if (!newSubInput.trim()) return
    updateTask(taskIdx, { subTasks: [...(editedTasks[taskIdx].subTasks ?? []), newSubInput.trim()] })
    setNewSubInput('')
  }

  const removeSubtask = (taskIdx: number, subIdx: number) =>
    updateTask(taskIdx, { subTasks: editedTasks[taskIdx].subTasks?.filter((_, i) => i !== subIdx) })

  const updateSubtask = (taskIdx: number, subIdx: number, val: string) =>
    updateTask(taskIdx, {
      subTasks: editedTasks[taskIdx].subTasks?.map((s, i) => i === subIdx ? val : s),
    })

  // ── Selection toggles ─────────────────────────────────────────────────────
  const toggleTask     = (i: number) => setSelectedTasks(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  const toggleGoal     = (i: number) => setSelectedGoals(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  const toggleListItem = (i: number) => setSelectedListItems(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      const createdTasks: TaskItem[] = []
      const createdGoals: Goal[]     = []

      for (const i of selectedGoals) {
        const g = editedGoals[i]
        const goal = await goalsApi.create({
          userId, title: g.title,
          category: (g.category as any) ?? 'personal',
          goalType: 'ongoing',
          dueDate: g.dueDate ?? undefined,
        })
        createdGoals.push(goal)
      }

      for (const i of selectedTasks) {
        const tk = editedTasks[i]
        const task = await tasksApi.create({
          userId, title: tk.title,
          priority:      (tk.priority as any)      ?? 'medium',
          executionType: (tk.executionType as any)  ?? undefined,
          dueDate:       tk.dueDate ?? undefined,
        })
        for (const stTitle of tk.subTasks ?? []) {
          if (stTitle.trim()) await tasksApi.addSubTask(task.id, { title: stTitle })
        }
        createdTasks.push(task)
      }

      if (selectedListItems.size > 0) {
        let listId = targetListId
        if (listId === 'new') {
          const suggestedName = editedListItems[0]?.listName ?? t('ai.newListName')
          const newList = await listsApi.create({ userId, title: suggestedName })
          listId = newList.id
        }
        for (const i of selectedListItems) {
          const item = editedListItems[i]
          const title = item.quantity ? `${item.quantity}x ${item.title}` : item.title
          await listsApi.addItem(listId, { title })
        }
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
    setEditedTasks([])
    setEditedGoals([])
    setEditedListItems([])
    setError(null)
    setExpandedTask(null)
    setExpandedGoal(null)
    setExpandedList(null)
    setNewSubInput('')
    onClose()
  }

  const totalSelected = selectedTasks.size + selectedGoals.size + selectedListItems.size
  const suggestedListName = editedListItems[0]?.listName ?? t('ai.newListName')

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <AutoAwesomeRoundedIcon color="primary" />
        <Typography variant="h6" fontWeight={700} flex={1}>{t('ai.title')}</Typography>
        <IconButton onClick={handleClose} size="small"><CloseRoundedIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {!hasParsed ? (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('ai.subtitle')}
            </Typography>
            <TextField
              multiline rows={5} fullWidth
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
            <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }} icon={<EditRoundedIcon fontSize="small" />}>
              {t('ai.editHint')}
            </Alert>

            {/* ── Tasks ── */}
            {editedTasks.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <TaskAltRoundedIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    {t('ai.tasks')} ({editedTasks.length})
                  </Typography>
                </Box>
                <List dense disablePadding sx={{ mb: 1 }}>
                  {editedTasks.map((tk, i) => (
                    <Box key={i} sx={{ borderRadius: 1.5, mb: 0.75, border: '1px solid', borderColor: expandedTask === i ? 'primary.main' : 'divider', overflow: 'hidden' }}>
                      {/* Row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', px: 0.5 }}>
                        <Checkbox checked={selectedTasks.has(i)} onChange={() => toggleTask(i)} size="small" />
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }} noWrap>{tk.title}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                          {tk.priority && <Chip label={t(`priority.${tk.priority}`)} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />}
                          {tk.dueDate && <Chip label={tk.dueDate} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />}
                          <IconButton size="small" onClick={() => setExpandedTask(expandedTask === i ? null : i)} sx={{ p: 0.25 }}>
                            {expandedTask === i ? <ExpandLessRoundedIcon sx={{ fontSize: 16 }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Edit form */}
                      <Collapse in={expandedTask === i}>
                        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            label={t('task.title')} size="small" fullWidth
                            value={tk.title}
                            onChange={e => updateTask(i, { title: e.target.value })}
                          />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                              label={t('task.dueDate')} size="small" type="date"
                              value={tk.dueDate ?? ''}
                              onChange={e => updateTask(i, { dueDate: e.target.value || null })}
                              InputLabelProps={{ shrink: true }}
                              sx={{ flex: 1 }}
                            />
                            <FormControl size="small" sx={{ flex: 1 }}>
                              <InputLabel>{t('task.priority')}</InputLabel>
                              <Select
                                value={tk.priority ?? ''}
                                label={t('task.priority')}
                                onChange={e => updateTask(i, { priority: e.target.value || null })}
                              >
                                <MenuItem value=""><em>—</em></MenuItem>
                                {PRIORITIES.map(p => <MenuItem key={p} value={p}>{t(`priority.${p}`)}</MenuItem>)}
                              </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ flex: 1 }}>
                              <InputLabel>{t('task.executionType')}</InputLabel>
                              <Select
                                value={tk.executionType ?? ''}
                                label={t('task.executionType')}
                                onChange={e => updateTask(i, { executionType: e.target.value || null })}
                              >
                                <MenuItem value=""><em>—</em></MenuItem>
                                {EXECUTION_TYPES.map(e => <MenuItem key={e} value={e}>{t(`executionType.${e}`)}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Box>

                          {/* Subtasks */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {t('task.subtasks')} ({(tk.subTasks ?? []).length})
                            </Typography>
                            {(tk.subTasks ?? []).map((st, si) => (
                              <Box key={si} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <TextField
                                  size="small" fullWidth value={st}
                                  onChange={e => updateSubtask(i, si, e.target.value)}
                                  sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
                                />
                                <IconButton size="small" onClick={() => removeSubtask(i, si)} color="error" sx={{ p: 0.25 }}>
                                  <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            ))}
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75 }}>
                              <TextField
                                size="small" fullWidth placeholder={t('task.addSubtask')}
                                value={expandedTask === i ? newSubInput : ''}
                                onChange={e => setNewSubInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addSubtask(i)}
                                sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
                              />
                              <Button size="small" variant="outlined" onClick={() => addSubtask(i)} sx={{ minWidth: 0, px: 1 }}>
                                <AddRoundedIcon sx={{ fontSize: 16 }} />
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      </Collapse>
                    </Box>
                  ))}
                </List>
              </>
            )}

            {/* ── Goals ── */}
            {editedGoals.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <EmojiObjectsRoundedIcon fontSize="small" color="warning" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    {t('ai.goals')} ({editedGoals.length})
                  </Typography>
                </Box>
                <List dense disablePadding>
                  {editedGoals.map((g, i) => (
                    <Box key={i} sx={{ borderRadius: 1.5, mb: 0.75, border: '1px solid', borderColor: expandedGoal === i ? 'primary.main' : 'divider', overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', px: 0.5 }}>
                        <Checkbox checked={selectedGoals.has(i)} onChange={() => toggleGoal(i)} size="small" />
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }} noWrap>{g.title}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.25 }}>
                          {g.category && <Chip label={t(`category.${g.category}`, g.category)} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />}
                          <IconButton size="small" onClick={() => setExpandedGoal(expandedGoal === i ? null : i)} sx={{ p: 0.25 }}>
                            {expandedGoal === i ? <ExpandLessRoundedIcon sx={{ fontSize: 16 }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </Box>
                      </Box>
                      <Collapse in={expandedGoal === i}>
                        <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
                          <TextField label={t('task.title')} size="small" fullWidth value={g.title}
                            onChange={e => updateGoal(i, { title: e.target.value })} />
                          <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>{t('goal.category')}</InputLabel>
                            <Select value={g.category ?? ''} label={t('goal.category')}
                              onChange={e => updateGoal(i, { category: e.target.value || null })}>
                              <MenuItem value=""><em>—</em></MenuItem>
                              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{t(`category.${c}`, c)}</MenuItem>)}
                            </Select>
                          </FormControl>
                          <TextField label={t('task.dueDate')} size="small" type="date"
                            value={g.dueDate ?? ''}
                            onChange={e => updateGoal(i, { dueDate: e.target.value || null })}
                            InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
                        </Box>
                      </Collapse>
                    </Box>
                  ))}
                </List>
              </>
            )}

            {/* ── List items ── */}
            {editedListItems.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ShoppingCartRoundedIcon fontSize="small" color="success" />
                  <Typography variant="subtitle2" fontWeight={700}>
                    {t('ai.listItems')} ({editedListItems.length})
                  </Typography>
                </Box>
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>{t('ai.listTarget')}</InputLabel>
                  <Select value={targetListId} label={t('ai.listTarget')}
                    onChange={e => setTargetListId(e.target.value)}>
                    {lists.map(l => <MenuItem key={l.id} value={l.id}>{l.emoji ? `${l.emoji} ${l.title}` : l.title}</MenuItem>)}
                    <MenuItem value="new">+ {t('ai.newList')}: {suggestedListName}</MenuItem>
                  </Select>
                </FormControl>
                <List dense disablePadding>
                  {editedListItems.map((item, i) => (
                    <Box key={i} sx={{ borderRadius: 1.5, mb: 0.75, border: '1px solid', borderColor: expandedList === i ? 'primary.main' : 'divider', overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'action.hover', px: 0.5 }}>
                        <Checkbox checked={selectedListItems.has(i)} onChange={() => toggleListItem(i)} size="small" />
                        <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                          {item.quantity ? `${item.quantity}x ${item.title}` : item.title}
                        </Typography>
                        <IconButton size="small" onClick={() => setExpandedList(expandedList === i ? null : i)} sx={{ p: 0.25 }}>
                          {expandedList === i ? <ExpandLessRoundedIcon sx={{ fontSize: 16 }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Box>
                      <Collapse in={expandedList === i}>
                        <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
                          <TextField label={t('task.title')} size="small" fullWidth value={item.title}
                            onChange={e => updateListItem(i, { title: e.target.value })} />
                          <TextField label={t('ai.quantity')} size="small" sx={{ width: 100 }}
                            value={item.quantity ?? ''}
                            onChange={e => updateListItem(i, { quantity: e.target.value || null })} />
                        </Box>
                      </Collapse>
                    </Box>
                  ))}
                </List>
              </>
            )}

            {!editedTasks.length && !editedGoals.length && !editedListItems.length && (
              <Alert severity="info">{t('ai.noResults')}</Alert>
            )}

            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {!hasParsed ? (
          <>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button variant="contained" onClick={handleParse}
              disabled={!text.trim() || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesomeRoundedIcon />}>
              {loading ? t('ai.analyzing') : t('ai.analyze')}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => { setEditedTasks([]); setEditedGoals([]); setEditedListItems([]) }}>
              {t('ai.back')}
            </Button>
            <Button variant="contained" onClick={handleCreate}
              disabled={totalSelected === 0 || saving}
              startIcon={saving ? <CircularProgress size={16} /> : undefined}>
              {saving ? t('common.loading') : t('ai.createSelected', { count: totalSelected })}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}


