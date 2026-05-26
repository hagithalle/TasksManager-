import { useState } from 'react'
import {
  Box, Button, Card, Chip, Collapse, IconButton, LinearProgress,
  Tooltip, Typography,
} from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import { useTranslation } from 'react-i18next'

import TaskPreviewDrawer from '../tasks/TaskPreviewDrawer'
import { useFocusCoach } from '../../hooks/useFocusCoach'
import CoachSettingsPanel from './CoachSettingsPanel'
import DailyInsightBanner from './DailyInsightBanner'
import type { TaskItem } from '../../types'
import { ExecutionType, Priority } from '../../types'

interface Props {
  tasks: TaskItem[]
  onRefresh: () => void
  onToggle?: (taskId: string) => void
  onToggleSubTask?: (taskId: string, subId: string) => void
}

function taskEmoji(task: TaskItem): string {
  if (
    task.executionType === ExecutionType.Quick ||
    task.executionType === ExecutionType.Short
  ) {
    return '⚡'
  }

  return '🐸'
}

const PRIORITY_COLOR: Record<Priority, string> = {
  [Priority.Critical]: '#ef4444',
  [Priority.High]: '#f97316',
  [Priority.Medium]: '#7c5cff',
  [Priority.Low]: '#94a3b8',
}

export default function FocusCoachCard({
  tasks,
  onRefresh,
  onToggle,
  onToggleSubTask,
}: Props) {
  const { t } = useTranslation()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [focusTask, setFocusTask] = useState<TaskItem | null>(null)
  const [skippedTasks, setSkippedTasks] = useState<string[]>([])
  const [previewTask, setPreviewTask] = useState<TaskItem | null>(null)

  const {
    settings,
    setSettings,
    eligibleTasks,
    totalCount,
    completedCount,
    progress,
    nextTask,
    secondTask,
    carriedOverCount,
  } = useFocusCoach(tasks)

  const remaining = totalCount - completedCount
  const mainTask = focusTask || nextTask

  const eligibleList = eligibleTasks.filter(
    task => task.id !== mainTask?.id && !skippedTasks.includes(task.id)
  )

  const handleStartFocus = () => {
    if (mainTask) setFocusTask(mainTask)
  }

  const handleMarkDone = () => {
    if (!focusTask) return

    onToggle?.(focusTask.id)
    setFocusTask(null)
    setSkippedTasks([])
  }

  const handlePickAnother = () => {
    if (mainTask) {
      setSkippedTasks(prev => [...prev, mainTask.id])
    }

    const next = eligibleTasks.find(
      task => task.id !== mainTask?.id && !skippedTasks.includes(task.id)
    )

    setFocusTask(next || null)
  }

  const renderTaskRow = (task: TaskItem, index = 0) => (
    <Box key={task.id}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          py: 0.75,
          borderBottom: '1px solid rgba(124,92,255,0.07)',
        }}
      >
        <Box
          component="span"
          onClick={() => onToggle?.(task.id)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: onToggle ? 'pointer' : 'default',
            borderRadius: '50%',
            p: 0.2,
          }}
        >
          {task.isCompleted ? (
            <CheckCircleRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          ) : (
            <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          )}
        </Box>

        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: PRIORITY_COLOR[task.priority],
          }}
        />

        <Typography variant="caption">{taskEmoji(task)}</Typography>

        {task.plannedTime && (
          <Typography variant="caption" fontWeight={700} color="primary.main">
            {task.plannedTime}
          </Typography>
        )}

        {task.durationMinutes && (
          <Chip
            label={`${task.durationMinutes}m`}
            size="small"
            sx={{ height: 18, fontSize: '0.6rem' }}
          />
        )}

        <Typography
          variant="caption"
          fontWeight={index === 0 ? 700 : 500}
          noWrap
          sx={{
            flex: 1,
            color: task.isCompleted ? 'text.disabled' : 'text.primary',
            textDecoration: task.isCompleted ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </Typography>

        {(task.subTasks ?? []).length > 0 && (
          <Typography variant="caption" color="text.disabled">
            {(task.subTasks ?? []).filter(sub => sub.isCompleted).length}/
            {(task.subTasks ?? []).length}
          </Typography>
        )}

        <Tooltip title={t('task.preview')}>
          <IconButton size="small" onClick={() => setPreviewTask(task)}>
            <VisibilityRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {(task.subTasks ?? []).map(sub => (
        <Box
          key={sub.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            pl: 4,
            pr: 1.25,
            py: 0.5,
            bgcolor: 'rgba(255,255,255,0.35)',
            borderBottom: '1px solid rgba(124,92,255,0.04)',
          }}
        >
          <Box
            component="span"
            onClick={() => onToggleSubTask?.(task.id, sub.id)}
            sx={{ display: 'flex', cursor: onToggleSubTask ? 'pointer' : 'default' }}
          >
            {sub.isCompleted ? (
              <CheckCircleRoundedIcon sx={{ fontSize: 15, color: 'success.main' }} />
            ) : (
              <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
            )}
          </Box>

          <Typography
            variant="caption"
            noWrap
            sx={{
              flex: 1,
              color: sub.isCompleted ? 'text.disabled' : 'text.secondary',
              textDecoration: sub.isCompleted ? 'line-through' : 'none',
            }}
          >
            {sub.title}
          </Typography>
        </Box>
      ))}
    </Box>
  )

  return (
    <Card
      sx={{
        borderRadius: 3,
        mb: 3,
        background: 'linear-gradient(135deg, #EDE9FF 0%, #F5F0FF 100%)',
        border: '1.5px solid rgba(124,92,255,0.2)',
        boxShadow: '0 2px 16px rgba(124,92,255,0.1)',
        overflow: 'hidden',
      }}
    >
      {totalCount > 0 && (
        <DailyInsightBanner
          progress={progress}
          completedCount={completedCount}
          remaining={remaining}
          dailyTarget={settings.dailyTaskTarget}
          tasks={tasks}
        />
      )}

      {settings.includeCarriedOver && carriedOverCount > 0 && (
        <Box sx={{ px: 2, py: 1, bgcolor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
          <Typography variant="caption" fontWeight={700} color="warning.main">
            {t('coach.carriedOver', { count: carriedOverCount })}
          </Typography>
        </Box>
      )}

      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <BoltRoundedIcon color="primary" />

          <Typography variant="h6" fontWeight={800} sx={{ flex: 1 }}>
            {t('coach.title')}
          </Typography>

          <Tooltip title={t('common.refresh')}>
            <IconButton size="small" onClick={onRefresh}>
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('common.settings')}>
            <IconButton size="small" onClick={() => setSettingsOpen(prev => !prev)}>
              <SettingsRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {totalCount > 0 && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 999 }}
            />

            <Typography variant="caption" color="text.secondary">
              {completedCount}/{totalCount}
            </Typography>
          </Box>
        )}

        {mainTask && (
          <Box
            sx={{
              p: 1.5,
              mb: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(124,92,255,0.15)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }} noWrap>
                {taskEmoji(mainTask)} {mainTask.title}
              </Typography>

              <Tooltip title={t('task.preview')}>
                <IconButton size="small" onClick={() => setPreviewTask(mainTask)}>
                  <VisibilityRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {focusTask ? (
                <>
                  <Button size="small" variant="contained" color="success" onClick={handleMarkDone}>
                    {t('coach.markDone')}
                  </Button>

                  <Button size="small" variant="outlined" onClick={() => setFocusTask(null)}>
                    {t('coach.snooze')}
                  </Button>
                </>
              ) : (
                <Button size="small" variant="contained" onClick={handleStartFocus}>
                  {t('coach.start')}
                </Button>
              )}
            </Box>

            {focusTask && (
              <Typography variant="caption" color="primary" fontWeight={700}>
                {t('coach.timerPlaceholder')}
              </Typography>
            )}

            {(mainTask.subTasks ?? []).length > 0 && (
              <Box sx={{ mt: 1 }}>
                {(mainTask.subTasks ?? []).map(sub => (
                  <Box key={sub.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.35 }}>
                    <Box
                      component="span"
                      onClick={() => onToggleSubTask?.(mainTask.id, sub.id)}
                      sx={{ display: 'flex', cursor: 'pointer' }}
                    >
                      {sub.isCompleted ? (
                        <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      ) : (
                        <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      )}
                    </Box>

                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        flex: 1,
                        color: sub.isCompleted ? 'text.disabled' : 'text.secondary',
                        textDecoration: sub.isCompleted ? 'line-through' : 'none',
                      }}
                    >
                      {sub.title}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {!focusTask && eligibleList.length > 0 && (
              <Button size="small" variant="text" onClick={handlePickAnother} sx={{ mt: 1 }}>
                {t('coach.pickAnother')}
              </Button>
            )}
          </Box>
        )}

        {secondTask && !focusTask && (
          <Typography variant="caption" color="text.secondary">
            {t('coach.nextUp')}: {secondTask.title}
          </Typography>
        )}

        {eligibleList.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Button
              size="small"
              endIcon={<KeyboardArrowDownRounded />}
              onClick={() => setListOpen(prev => !prev)}
            >
              {t('coach.showMoreTasks')}
            </Button>

            <Collapse in={listOpen}>
              <Box sx={{ mt: 1, borderRadius: 2, overflow: 'hidden' }}>
                {eligibleList.map((task, index) => renderTaskRow(task, index))}
              </Box>
            </Collapse>
          </Box>
        )}

        {totalCount === 0 && (
          <Box sx={{ mt: 3, textAlign: 'center', color: 'text.secondary', fontWeight: 500 }}>
            {t('coach.empty.noTasks')}
          </Box>
        )}

        {totalCount > 0 && eligibleList.length === 0 && !mainTask && (
          <Box sx={{ mt: 3, textAlign: 'center', color: 'text.secondary', fontWeight: 500 }}>
            {t('coach.empty.allDone')}
          </Box>
        )}
      </Box>

      <CoachSettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
      />

      <TaskPreviewDrawer
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        onEdit={() => {}}
      />
    </Card>
  )
}