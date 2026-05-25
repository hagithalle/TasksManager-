import { Box, Collapse, Divider, IconButton, Typography } from '@mui/material'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShoppingItem } from '../../types'
import ShoppingItemRow from './ShoppingItemRow'

/** Emoji icons per department */
const DEPT_ICONS: Record<string, string> = {
  fruitsAndVegetables: '🥦',
  dairy:               '🥛',
  meatAndFish:         '🥩',
  bakery:              '🍞',
  pantry:              '🥫',
  frozen:              '🧊',
  cleaning:            '🧹',
  disposable:          '🧻',
  baby:                '🍼',
  other:               '🛒',
}

// Map possible department keys to i18n keys
const DEPT_KEYS: Record<string, string> = {
  fruitsandvegetables: 'fruitsAndVegetables',
  dairy: 'dairy',
  meatandfish: 'meatAndFish',
  bakery: 'bakery',
  pantry: 'pantry',
  frozen: 'frozen',
  cleaning: 'cleaning',
  disposable: 'disposable',
  baby: 'baby',
  other: 'other',
}

interface Props {
  department: string
  items:      ShoppingItem[]
  onToggle:   (id: string) => void
  onDelete:   (id: string) => void
  onEdit:     (item: ShoppingItem) => void
  onDetail:   (item: ShoppingItem) => void
}

export default function ShoppingDepartmentSection({ department, items, onToggle, onDelete, onEdit, onDetail }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  const remaining = items.filter((i) => !i.isBought).length
  const icon      = DEPT_ICONS[DEPT_KEYS[department] || department] ?? '🛒'

  return (
    <Box sx={{ mb: 0.5 }}>
      {/* Section header */}
      <Box
        onClick={() => setOpen((p) => !p)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 0.75,
          gap: 1,
          cursor: 'pointer',
          bgcolor: 'rgba(124,92,255,0.04)',
          borderRadius: 2,
          '&:hover': { bgcolor: 'rgba(124,92,255,0.08)' },
        }}
      >
        <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{icon}</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ flex: 1, letterSpacing: 0.3 }}>
          {t(`shoppingDepartment.${DEPT_KEYS[department] || department}`)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          {remaining}/{items.length}
        </Typography>
        <IconButton
          size="small"
          disableRipple
          sx={{
            p: 0,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
          }}
        >
          <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
        </IconButton>
      </Box>

      {/* Items */}
      <Collapse in={open} unmountOnExit>
        <Box sx={{ pl: 1 }}>
          {items.map((item, idx) => (
            <Box key={item.id}>
              <ShoppingItemRow
                item={item}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
                onDetail={onDetail}
              />
              {idx < items.length - 1 && <Divider sx={{ ml: 4.5 }} />}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}
