import { Box, Checkbox, IconButton, InputBase, Tooltip, Typography } from '@mui/material'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import DeleteRoundedIcon               from '@mui/icons-material/DeleteRounded'
import AddTaskRoundedIcon              from '@mui/icons-material/AddTaskRounded'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PersonalListItem } from '../../types'

interface Props {
  item:              PersonalListItem
  onToggle:          (id: string) => void
  onDelete:          (id: string) => void
  onRename?:         (id: string, newTitle: string) => void
  onConvertToTask?:  (item: PersonalListItem) => void
}

export default function ListItemRow({ item, onToggle, onDelete, onRename, onConvertToTask }: Props) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(item.title)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(item.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitEdit() {
    setEditing(false)
    const title = draft.trim()
    if (title && title !== item.title) onRename?.(item.id, title)
    else setDraft(item.title)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        gap: 0.25,
        '&:hover .delete-btn': { opacity: 1 },
      }}
    >
      {/* Checkbox */}
      <Checkbox
        checked={item.isCompleted}
        onChange={() => onToggle(item.id)}
        disableRipple
        size="small"
        icon={
          <RadioButtonUncheckedRoundedIcon
            sx={{ fontSize: 20, color: 'text.disabled' }}
          />
        }
        checkedIcon={
          <CheckCircleRoundedIcon
            sx={{ fontSize: 20, color: item.isCompleted ? '#4CAF50' : 'primary.main' }}
          />
        }
        sx={{ p: 0.5 }}
      />

      {/* Label / inline edit */}
      {editing ? (
        <InputBase
          inputRef={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  commitEdit()
            if (e.key === 'Escape') { setEditing(false); setDraft(item.title) }
          }}
          fullWidth
          sx={{ fontSize: '0.875rem', color: 'text.primary', flex: 1, py: 0.75 }}
        />
      ) : (
        <Typography
          variant="body2"
          onClick={startEdit}
          sx={{
            flex: 1,
            textDecoration: item.isCompleted ? 'line-through' : 'none',
            color:          item.isCompleted ? 'text.disabled' : 'text.primary',
            transition: 'color 0.15s',
            lineHeight: 1.5,
            py: 0.75,
            cursor: 'text',
            borderRadius: 1,
            '&:hover': { bgcolor: 'action.hover' },
            px: 0.5,
          }}
        >
          {item.title}
        </Typography>
      )}

      {/* Convert to task button */}
      {onConvertToTask && (
        <Tooltip title={t('list.convertToTask')}>
          <IconButton
            className="delete-btn"
            size="small"
            onClick={() => onConvertToTask(item)}
            sx={{
              opacity: { xs: 1, sm: 0 },
              transition: 'opacity 0.15s',
              color: 'text.disabled',
              '&:hover': { color: 'primary.main', bgcolor: 'primary.light' },
              flexShrink: 0,
            }}
          >
            <AddTaskRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Delete button */}
      <IconButton
        className="delete-btn"
        size="small"
        onClick={() => onDelete(item.id)}
        sx={{
          opacity: { xs: 1, sm: 0 },
          transition: 'opacity 0.15s',
          color: 'text.disabled',
          '&:hover': { color: 'error.main', bgcolor: 'error.light' },
          flexShrink: 0,
        }}
        aria-label={t('common.delete')}
      >
        <DeleteRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  )
}
