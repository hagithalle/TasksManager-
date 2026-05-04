import { Box, Checkbox, IconButton, Typography } from '@mui/material'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import DeleteRoundedIcon               from '@mui/icons-material/DeleteRounded'
import type { PersonalListItem } from '../../types'

interface Props {
  item:       PersonalListItem
  onToggle:   (id: string) => void
  onDelete:   (id: string) => void
}

export default function ListItemRow({ item, onToggle, onDelete }: Props) {
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

      {/* Label */}
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          textDecoration: item.isCompleted ? 'line-through' : 'none',
          color:          item.isCompleted ? 'text.disabled' : 'text.primary',
          transition: 'color 0.15s',
          lineHeight: 1.5,
          py: 0.75,
        }}
      >
        {item.title}
      </Typography>

      {/* Delete button — visible on hover (desktop) or always on touch */}
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
        aria-label="delete"
      >
        <DeleteRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  )
}
