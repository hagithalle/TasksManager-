import {
  Box, Button, Chip, Divider, Drawer,
  IconButton, List, ListItem, ListItemText, Typography,
} from '@mui/material'
import CloseRoundedIcon                from '@mui/icons-material/CloseRounded'
import EditRoundedIcon                 from '@mui/icons-material/EditRounded'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import { useTranslation } from 'react-i18next'
import type { TaskItem } from '../../types'
import { PRIORITY_STYLE, EXECUTION_STYLE } from '../../utils'

interface Props {
  task:    TaskItem | null
  onClose: () => void
  onEdit:  (task: TaskItem) => void
}

const metaChipSx = {
  height: 24,
  fontSize: '0.7rem',
  fontWeight: 600,
  '& .MuiChip-label': { px: 1.25 },
}

export default function TaskPreviewDrawer({ task, onClose, onEdit }: Props) {
  const { t, i18n } = useTranslation()

  return (
    <Drawer
      anchor="bottom"
      open={!!task}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '82vh',
          px: 2.5,
          pt: 1.5,
          pb: 5,
          overflowY: 'auto',
        },
      }}
    >
      {task && (
        <>
          {/* Drag handle */}
          <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mb: 2 }} />

          {/* Header row */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ flex: 1, lineHeight: 1.4 }}>
              {task.title}
            </Typography>
            <IconButton size="small" onClick={onClose} sx={{ mt: -0.25 }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Chips */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
            <Chip
              label={t(`priority.${task.priority}`)}
              size="small"
              sx={{ ...metaChipSx, bgcolor: PRIORITY_STYLE[task.priority].bg, color: PRIORITY_STYLE[task.priority].color, fontWeight: 700 }}
            />
            <Chip
              label={t(`executionType.${task.executionType}`)}
              size="small"
              sx={{ ...metaChipSx, bgcolor: EXECUTION_STYLE[task.executionType].bg, color: EXECUTION_STYLE[task.executionType].color, fontWeight: 700 }}
            />
            {task.dueDate && (
              <Chip
                label={`📅 ${new Date(task.dueDate).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: '2-digit' })}`}
                size="small"
                sx={metaChipSx}
              />
            )}
            {task.plannedTime && (
              <Chip label={`⏰ ${task.plannedTime}`} size="small" sx={metaChipSx} />
            )}
            {task.durationMinutes && (
              <Chip label={`⏱ ${task.durationMinutes}${t('task.minutesShort')}`} size="small" sx={metaChipSx} />
            )}
          </Box>

          {/* Notes */}
          {task.notes && (
            <>
              <Divider sx={{ mb: 1.5 }} />
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}
              >
                {t('task.notes')}
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, mb: 2, color: 'text.primary' }}
              >
                {task.notes}
              </Typography>
            </>
          )}

          {/* Subtasks */}
          {(task.subTasks?.length ?? 0) > 0 && (
            <>
              <Divider sx={{ mb: 1.5 }} />
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}
              >
                {t('task.subtasks')} ({task.subTasks!.filter((s) => s.isCompleted).length}/{task.subTasks!.length})
              </Typography>
              <List disablePadding sx={{ mb: 1 }}>
                {task.subTasks!.map((sub) => (
                  <ListItem key={sub.id} disablePadding sx={{ py: 0.3, gap: 1 }}>
                    {sub.isCompleted
                      ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                      : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
                    }
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            textDecoration: sub.isCompleted ? 'line-through' : 'none',
                            color: sub.isCompleted ? 'text.disabled' : 'text.primary',
                          }}
                        >
                          {sub.title}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {/* Edit action */}
          <Divider sx={{ mt: 2, mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<EditRoundedIcon />}
              onClick={() => { onEdit(task); onClose() }}
            >
              {t('common.edit')}
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  )
}
