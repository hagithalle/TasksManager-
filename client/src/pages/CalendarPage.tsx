import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box, Chip, CircularProgress, Divider, IconButton, Snackbar, Alert,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import ChevronLeftRoundedIcon  from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import CheckCircleRoundedIcon  from '@mui/icons-material/CheckCircleRounded'
import SyncRoundedIcon         from '@mui/icons-material/SyncRounded'
import EditRoundedIcon         from '@mui/icons-material/EditRounded'
import DeleteRoundedIcon       from '@mui/icons-material/DeleteRounded'
import RepeatRoundedIcon       from '@mui/icons-material/RepeatRounded'
import { useGoogleLogin }      from '@react-oauth/google'
import { useTranslation } from 'react-i18next'
import { tasksApi, calendarApi } from '../api'
import { useAuth }   from '../contexts/AuthContext'
import type { TaskItem } from '../types'
import { TODAY, PRIORITY_STYLE, EXECUTION_STYLE } from '../utils'
import { AddTaskDialog } from '../components'

// ─── helpers ──────────────────────────────────────────────────────────────────

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function getWeekDays(isoDate: string): string[] {
  const d   = new Date(isoDate + 'T12:00:00')
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))  // roll back to Monday
  return Array.from({ length: 7 }, (_, i) => {
    const nd = new Date(mon)
    nd.setDate(mon.getDate() + i)
    return nd.toISOString().slice(0, 10)
  })
}

function formatFullDate(isoDate: string, locale: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function getMonthDays(isoDate: string): string[] {
  const d     = new Date(isoDate + 'T12:00:00')
  const year  = d.getFullYear()
  const month = d.getMonth()

  // First day of the month, roll back to Monday
  const first    = new Date(year, month, 1)
  const startPad = (first.getDay() + 6) % 7   // 0=Mon … 6=Sun

  // Last day of the month
  const lastDate = new Date(year, month + 1, 0).getDate()

  const cells: string[] = []
  for (let i = 0; i < startPad; i++) cells.push('')  // empty padding
  for (let d = 1; d <= lastDate; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  // pad to full 6-row grid if needed
  while (cells.length % 7 !== 0) cells.push('')
  return cells
}

function formatMonthYear(isoDate: string, locale: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

function addMonths(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

// ─── Hebrew calendar helpers ────────────────────────────────────────────────

const GEMATRIA: [number, string][] = [
  [400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'],
  [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'],
  [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'],
  [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'],
  [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א'],
]

function toGematria(n: number): string {
  if (n === 15) return 'ט\u05f4ו'   // avoid יה
  if (n === 16) return 'ט\u05f4ז'   // avoid יו
  let rem = n
  let s = ''
  for (const [val, letter] of GEMATRIA) {
    while (rem >= val) { s += letter; rem -= val }
  }
  if (s.length === 1) return s + '\u05f3'                       // alef → א׳
  return s.slice(0, -1) + '\u05f4' + s.slice(-1)               // יט  → י״ט
}

const HE_DAY_FMT   = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric' })
const HE_FULL_FMT  = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' })
const HE_MONTH_FMT = new Intl.DateTimeFormat('he-u-ca-hebrew', { month: 'long', year: 'numeric' })

function hebrewDay(isoDate: string): string {
  const parts = HE_DAY_FMT.formatToParts(new Date(isoDate + 'T12:00:00'))
  const day   = parts.find((p) => p.type === 'day')
  return day ? toGematria(parseInt(day.value, 10)) : ''
}

function hebrewFullDate(isoDate: string): string {
  return HE_FULL_FMT
    .formatToParts(new Date(isoDate + 'T12:00:00'))
    .map((p) => {
      if (p.type === 'day')  return toGematria(parseInt(p.value, 10))
      if (p.type === 'year') return toGematria(parseInt(p.value, 10) % 1000)
      return p.value
    })
    .join('')
}

function hebrewMonthYear(isoDate: string): string {
  return HE_MONTH_FMT
    .formatToParts(new Date(isoDate + 'T12:00:00'))
    .map((p) => {
      if (p.type === 'year') return toGematria(parseInt(p.value, 10) % 1000)
      return p.value
    })
    .join('')
}

function getTasksForDate(tasks: TaskItem[], date: string) {
  const forDate     = tasks.filter((tk) => tk.dueDate === date)
  const scheduled   = forDate
    .filter((tk) =>  !!tk.plannedTime)
    .sort((a, b) => (a.plannedTime ?? '').localeCompare(b.plannedTime ?? ''))
  const unscheduled = forDate.filter((tk) => !tk.plannedTime)
  return { scheduled, unscheduled }
}

// ─── recurring task expansion ─────────────────────────────────────────────────

function advanceDate(isoDate: string, type: string, interval: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  if (type === 'daily')   d.setDate(d.getDate() + interval)
  if (type === 'weekly')  d.setDate(d.getDate() + 7 * interval)
  if (type === 'monthly') d.setMonth(d.getMonth() + interval)
  return d.toISOString().slice(0, 10)
}

/** Generate virtual future occurrences of recurring tasks within [rangeStart, rangeEnd]. */
function expandRecurringTasks(tasks: TaskItem[], rangeStart: string, rangeEnd: string): TaskItem[] {
  const expanded: TaskItem[] = [...tasks]
  for (const task of tasks) {
    if (!task.dueDate || !task.recurrenceType || task.recurrenceType === 'none') continue
    if (task.isCompleted) continue
    const interval = task.recurrenceInterval ?? 1
    let nextDate = advanceDate(task.dueDate, task.recurrenceType, interval)
    let safety = 0
    while (nextDate <= rangeEnd && safety++ < 90) {
      if (nextDate >= rangeStart) {
        // Only add if no real task already exists for this date+title (avoid duplicates)
        const alreadyExists = tasks.some(
          (t) => t.title === task.title && t.dueDate === nextDate && !t.id.startsWith('virtual_')
        )
        if (!alreadyExists) {
          expanded.push({ ...task, id: `virtual_${task.id}_${nextDate}`, dueDate: nextDate })
        }
      }
      nextDate = advanceDate(nextDate, task.recurrenceType, interval)
    }
  }
  return expanded
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'he' ? 'he-IL' : 'en-US'
  const { user } = useAuth()

  const [viewMode,     setViewMode]     = useState<'weekly' | 'daily' | 'monthly'>('weekly')
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [tasks,        setTasks]        = useState<TaskItem[]>([])
  const [syncing,      setSyncing]      = useState(false)
  const [snack,        setSnack]        = useState<{ msg: string; severity: 'success' | 'error' | 'warning' } | null>(null)
  const [editTask,     setEditTask]     = useState<TaskItem | null>(null)

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    tasksApi.delete(taskId).catch(() => {
      if (user) tasksApi.getByUser(user.id).then(setTasks).catch(() => {})
    })
  }, [user])

  const doSync = useCallback(async (accessToken: string) => {
    setSyncing(true)
    try {
      const result = await calendarApi.push(accessToken)
      setSnack({ msg: t('calendar.syncSuccess', { created: result.created, updated: result.updated }), severity: 'success' })
    } catch (err: any) {
      setSnack({ msg: t('calendar.syncError'), severity: 'error' })
    } finally {
      setSyncing(false)
    }
  }, [t])

  const googleSync = useGoogleLogin({
    onSuccess: ({ access_token }) => doSync(access_token),
    onError:   () => setSnack({ msg: t('calendar.syncError'), severity: 'error' }),
    scope: 'https://www.googleapis.com/auth/calendar.events',
  })

  const handleSync = () => { setSyncing(true); googleSync() }

  useEffect(() => {
    if (!user) return
    tasksApi.getByUser(user.id).then(setTasks).catch(() => {})
  }, [user])

  const weekDays = getWeekDays(selectedDate)

  // Expand recurring tasks to fill the visible date range
  const visibleTasks = useMemo(() => {
    let start: string, end: string
    if (viewMode === 'daily') {
      start = end = selectedDate
    } else if (viewMode === 'weekly') {
      const days = getWeekDays(selectedDate)
      start = days[0]; end = days[6]
    } else {
      const cells = getMonthDays(selectedDate).filter(Boolean)
      start = cells[0] ?? selectedDate; end = cells[cells.length - 1] ?? selectedDate
    }
    return expandRecurringTasks(tasks, start, end)
  }, [tasks, viewMode, selectedDate])

  return (
    <Box sx={{ pb: 6 }}>

      {/* ── Header ── */}
      <Box sx={{
        px: 2, pt: 2.5, pb: 1.75,
        background: 'linear-gradient(135deg, #EDE9FF 0%, #F5F0FF 100%)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h3" fontWeight={700}>{t('nav.calendar')}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedDate !== TODAY && (
              <Chip
                label={t('calendar.today')}
                size="small"
                onClick={() => setSelectedDate(TODAY)}
                sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white', height: 26, cursor: 'pointer' }}
              />
            )}
            <IconButton size="small" onClick={handleSync} disabled={syncing} title={t('calendar.syncGoogle')}>
              {syncing ? <CircularProgress size={18} /> : <SyncRoundedIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v: 'weekly' | 'daily' | 'monthly' | null) => { if (v) setViewMode(v) }}
          size="small"
          sx={{ bgcolor: 'white', borderRadius: 2.5, p: 0.25 }}
        >
          <ToggleButton
            value="weekly"
            sx={{ borderRadius: '8px !important', px: 2.5, fontWeight: 600, fontSize: '0.75rem', border: 'none' }}
          >
            {t('calendar.weekly')}
          </ToggleButton>
          <ToggleButton
            value="daily"
            sx={{ borderRadius: '8px !important', px: 2.5, fontWeight: 600, fontSize: '0.75rem', border: 'none' }}
          >
            {t('calendar.daily')}
          </ToggleButton>
          <ToggleButton
            value="monthly"
            sx={{ borderRadius: '8px !important', px: 2.5, fontWeight: 600, fontSize: '0.75rem', border: 'none' }}
          >
            {t('calendar.monthly')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === 'weekly' ? (

        /* ── Weekly: day strip + prev/next week ── */
        <>
          <Box sx={{
            display: 'flex', gap: 0.75, px: 1.5, pt: 1.5, pb: 0.5,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {weekDays.map((day) => {
              const d          = new Date(day + 'T12:00:00')
              const weekday    = d.toLocaleDateString(locale, { weekday: 'short' })
              const dayNum     = d.getDate()
              const { scheduled, unscheduled } = getTasksForDate(visibleTasks, day)
              const count      = scheduled.length + unscheduled.length
              const isSelected = day === selectedDate
              const isToday    = day === TODAY

              return (
                <Box
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  sx={{
                    minWidth: 48, flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    py: 1, px: 0.5, borderRadius: 3, cursor: 'pointer',
                    bgcolor:     isSelected ? 'primary.main' : isToday ? 'rgba(124,92,255,0.08)' : 'transparent',
                    border:      '1.5px solid',
                    borderColor: isSelected ? 'primary.main' : isToday ? 'rgba(124,92,255,0.3)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'text.secondary', fontSize: '0.63rem', fontWeight: 600, mb: 0.25 }}
                  >
                    {weekday}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ color: isSelected ? 'white' : isToday ? 'primary.main' : 'text.primary', lineHeight: 1.2 }}
                  >
                    {dayNum}
                  </Typography>
                  <Typography sx={{ fontSize: '0.58rem', lineHeight: 1, mt: 0.15, color: isSelected ? 'rgba(255,255,255,0.65)' : 'text.disabled' }}>
                    {hebrewDay(day)}
                  </Typography>
                  <Box sx={{
                    mt: 0.4, width: 18, height: 18, borderRadius: '50%',
                    bgcolor: count > 0
                      ? (isSelected ? 'rgba(255,255,255,0.22)' : 'rgba(124,92,255,0.12)')
                      : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {count > 0 && (
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: isSelected ? 'white' : 'primary.main' }}>
                        {count}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, mb: 0.5 }}>
            <IconButton size="small" onClick={() => setSelectedDate((d) => addDays(d, -7))}>
              <ChevronLeftRoundedIcon />
            </IconButton>
            <IconButton size="small" onClick={() => setSelectedDate((d) => addDays(d, 7))}>
              <ChevronRightRoundedIcon />
            </IconButton>
          </Box>
        </>

      ) : viewMode === 'monthly' ? (

        /* ── Monthly: month nav header ── */
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 1.25, gap: 0.5 }}>
          <IconButton size="small" onClick={() => setSelectedDate((d) => addMonths(d, -1))}>
            <ChevronLeftRoundedIcon />
          </IconButton>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {formatMonthYear(selectedDate, locale)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
              {hebrewMonthYear(selectedDate)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setSelectedDate((d) => addMonths(d, 1))}>
            <ChevronRightRoundedIcon />
          </IconButton>
        </Box>

      ) : (

        /* ── Daily: prev/next day nav ── */
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 1.25, gap: 0.5 }}>
          <IconButton size="small" onClick={() => setSelectedDate((d) => addDays(d, -1))}>
            <ChevronLeftRoundedIcon />
          </IconButton>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
              {formatFullDate(selectedDate, locale)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
              {hebrewFullDate(selectedDate)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
            <ChevronRightRoundedIcon />
          </IconButton>
        </Box>
      )}

      {/* ── Monthly grid or Day view ── */}
      {viewMode === 'monthly'
        ? <MonthView selectedDate={selectedDate} onSelectDay={(d) => { setSelectedDate(d); setViewMode('daily') }} tasks={visibleTasks} />
        : <DayView date={selectedDate} tasks={visibleTasks} onEdit={setEditTask} onDelete={handleDeleteTask} />}

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity ?? 'info'} onClose={() => setSnack(null)} sx={{ width: '100%' }}>
          {snack?.msg}
        </Alert>
      </Snackbar>

      {editTask && (
        <AddTaskDialog
          open={!!editTask}
          onClose={() => setEditTask(null)}
          editTask={editTask}
          onEdit={(updated) => {
            setEditTask(null)
            // refetch all tasks to ensure calendar reflects the latest data
            if (user) tasksApi.getByUser(user.id).then(setTasks).catch(() => {
              setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
            })
          }}
        />
      )}
    </Box>
  )
}

// ─── MonthView ────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const WEEKDAY_LABELS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function MonthView({
  selectedDate,
  onSelectDay,
  tasks,
}: {
  selectedDate: string
  onSelectDay: (date: string) => void
  tasks: TaskItem[]
}) {
  const { i18n } = useTranslation()
  const isHe = i18n.language === 'he'
  const dayLabels = isHe ? WEEKDAY_LABELS_HE : WEEKDAY_LABELS_EN

  const cells = getMonthDays(selectedDate)

  return (
    <Box sx={{ px: 1.5, pt: 0.5, pb: 3 }}>
      {/* Weekday header row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {dayLabels.map((l) => (
          <Typography
            key={l}
            variant="caption"
            sx={{ textAlign: 'center', fontWeight: 700, color: 'text.disabled', fontSize: '0.65rem', py: 0.25 }}
          >
            {l}
          </Typography>
        ))}
      </Box>

      {/* Day cells */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {cells.map((day, idx) => {
          if (!day) return <Box key={`empty-${idx}`} />

          const count      = tasks.filter((tk) => tk.dueDate === day).length
          const isSelected = day === selectedDate
          const isToday    = day === TODAY
          const dayNum     = new Date(day + 'T12:00:00').getDate()

          return (
            <Box
              key={day}
              onClick={() => onSelectDay(day)}
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                py: 0.75, borderRadius: 2.5, cursor: 'pointer',
                bgcolor:
                  isSelected ? 'primary.main'
                  : isToday  ? 'rgba(124,92,255,0.10)'
                  : 'transparent',
                border: '1.5px solid',
                borderColor:
                  isSelected ? 'primary.main'
                  : isToday  ? 'rgba(124,92,255,0.35)'
                  : 'transparent',
                transition: 'all 0.12s',
                '&:hover': { bgcolor: isSelected ? 'primary.main' : 'action.hover' },
              }}
            >
              <Typography
                variant="body2"
                fontWeight={isToday || isSelected ? 700 : 400}
                sx={{
                  fontSize: '0.8rem', lineHeight: 1.3,
                  color: isSelected ? 'white' : isToday ? 'primary.main' : 'text.primary',
                }}
              >
                {dayNum}
              </Typography>
              <Typography sx={{ fontSize: '0.55rem', lineHeight: 1, mt: 0.1, color: isSelected ? 'rgba(255,255,255,0.65)' : 'text.disabled' }}>
                {hebrewDay(day)}
              </Typography>

              {/* Dot indicators */}
              <Box sx={{ display: 'flex', gap: '2px', mt: 0.25, minHeight: 6 }}>
                {count > 0 && Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                  <Box
                    key={di}
                    sx={{
                      width: 4, height: 4, borderRadius: '50%',
                      bgcolor: isSelected ? 'rgba(255,255,255,0.7)' : 'primary.main',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

// ─── DayView ──────────────────────────────────────────────────────────────────

function DayView({ date, tasks, onEdit, onDelete }: { date: string; tasks: TaskItem[]; onEdit: (t: TaskItem) => void; onDelete: (id: string) => void }) {
  const { t } = useTranslation()
  const { scheduled, unscheduled } = getTasksForDate(tasks, date)

  if (scheduled.length === 0 && unscheduled.length === 0) {
    return (
      <Box sx={{ py: 7, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 36, mb: 1 }}>📭</Typography>
        <Typography variant="body2" color="text.secondary">{t('calendar.noTasks')}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ px: 2, pt: 1.5 }}>

      {/* Scheduled */}
      {scheduled.map((tk, i) => (
        <Box key={tk.id}>
          {i > 0 && <Box sx={{ ml: 5.5, height: '1px', bgcolor: 'divider' }} />}
          <TaskRow task={tk} onEdit={onEdit} onDelete={onDelete} />
        </Box>
      ))}

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <>
          {scheduled.length > 0 && <Divider sx={{ my: 2 }} />}
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', mb: 1 }}
          >
            {t('calendar.unscheduled')}
          </Typography>
          {unscheduled.map((tk, i) => (
            <Box key={tk.id}>
              {i > 0 && <Box sx={{ ml: 5.5, height: '1px', bgcolor: 'divider' }} />}
              <TaskRow task={tk} showTime={false} onEdit={onEdit} onDelete={onDelete} />
            </Box>
          ))}
        </>
      )}
    </Box>
  )
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({ task, showTime = true, onEdit, onDelete }: { task: TaskItem; showTime?: boolean; onEdit?: (t: TaskItem) => void; onDelete?: (id: string) => void }) {
  const { t } = useTranslation()
  const ps = PRIORITY_STYLE[task.priority]
  const es = EXECUTION_STYLE[task.executionType]
  const isVirtual = task.id.startsWith('virtual_')

  return (
    <Box sx={{ display: 'flex', gap: 1.5, py: 1.25, alignItems: 'flex-start' }}>

      {/* Time column */}
      <Box sx={{ width: 44, flexShrink: 0, pt: 0.3, textAlign: 'center' }}>
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{ fontSize: '0.72rem', lineHeight: 1.2, display: 'block', color: showTime && task.plannedTime ? 'primary.main' : 'text.disabled' }}
        >
          {showTime && task.plannedTime ? task.plannedTime : '—'}
        </Typography>
        {task.durationMinutes != null && (
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', display: 'block' }}>
            {task.durationMinutes}{t('task.minutesShort')}
          </Typography>
        )}
      </Box>

      {/* Card body */}
      <Box sx={{
        flex: 1, minWidth: 0,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: isVirtual ? 'rgba(124,92,255,0.25)' : task.isCompleted ? 'divider' : 'rgba(124,92,255,0.15)',
        bgcolor: isVirtual ? 'rgba(124,92,255,0.04)' : task.isCompleted ? 'rgba(0,0,0,0.02)' : 'background.paper',
        px: 1.5, py: 1,
        boxShadow: (isVirtual || task.isCompleted) ? 'none' : '0 1px 6px rgba(124,92,255,0.07)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
          {task.isCompleted && (
            <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0, mt: 0.2 }} />
          )}
          {isVirtual && (
            <RepeatRoundedIcon sx={{ fontSize: 14, color: 'primary.light', flexShrink: 0, mt: 0.3, opacity: 0.7 }} />
          )}
          <Typography
            variant="body2"
            fontWeight={task.isCompleted ? 400 : 600}
            sx={{
              flex: 1, lineHeight: 1.45,
              textDecoration: task.isCompleted ? 'line-through' : 'none',
              color: isVirtual ? 'text.secondary' : task.isCompleted ? 'text.disabled' : 'text.primary',
            }}
          >
            {task.title}
          </Typography>
          {onEdit && !isVirtual && (
            <IconButton size="small" onClick={() => onEdit(task)} sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}>
              <EditRoundedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
          {onDelete && !isVirtual && (
            <IconButton size="small" onClick={() => onDelete(task.id)} sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}>
              <DeleteRoundedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Box>

        {/* Chips */}
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
          <Chip
            label={t(`priority.${task.priority}`)}
            size="small"
            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: ps.bg, color: ps.color, '& .MuiChip-label': { px: 0.75 } }}
          />
          <Chip
            label={t(`executionType.${task.executionType}`)}
            size="small"
            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: es.bg, color: es.color, '& .MuiChip-label': { px: 0.75 } }}
          />
        </Box>
      </Box>
    </Box>
  )
}
