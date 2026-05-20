import {
  Box, Checkbox, Chip, IconButton, Tooltip, Typography,
} from '@mui/material'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import DeleteRoundedIcon               from '@mui/icons-material/DeleteRounded'
import EditRoundedIcon                 from '@mui/icons-material/EditRounded'
import ImageRoundedIcon                from '@mui/icons-material/ImageRounded'
import InfoOutlinedIcon                from '@mui/icons-material/InfoOutlined'
import { useTranslation } from 'react-i18next'
import type { ShoppingItem } from '../../types'

interface Props {
  item:      ShoppingItem
  onToggle:  (id: string) => void
  onDelete:  (id: string) => void
  onEdit:    (item: ShoppingItem) => void
  onDetail:  (item: ShoppingItem) => void
}

export default function ShoppingItemRow({ item, onToggle, onDelete, onEdit, onDetail }: Props) {
  const { t } = useTranslation()

  const hasProductInfo = !!(
    item.imageUrl || item.preferredBrand ||
    (item.alternativeBrands?.length ?? 0) > 0 ||
    item.noteForBuyer
  )

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        gap: 0.5,
        opacity: item.isBought ? 0.55 : 1,
        transition: 'opacity 0.2s',
        '&:hover .row-actions': { opacity: 1 },
      }}
    >
      {/* Checkbox */}
      <Checkbox
        checked={item.isBought}
        onChange={() => onToggle(item.id)}
        disableRipple
        size="small"
        icon={<RadioButtonUncheckedRoundedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />}
        checkedIcon={<CheckCircleRoundedIcon sx={{ fontSize: 20, color: '#4CAF50' }} />}
        sx={{ p: 0.5 }}
      />

      {/* Tappable area: title + meta → opens detail sheet */}
      <Box
        onClick={() => onDetail(item)}
        sx={{ flex: 1, minWidth: 0, cursor: 'pointer', py: 0.5 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              textDecoration: item.isBought ? 'line-through' : 'none',
              color: item.isBought ? 'text.disabled' : 'text.primary',
            }}
            noWrap
          >
            {item.title}
          </Typography>

          {/* Small image indicator icon */}
          {item.imageUrl && (
            <Tooltip title={t('shopping.hasImage')}>
              <ImageRoundedIcon sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0 }} />
            </Tooltip>
          )}

          {/* Info dot for other product details */}
          {!item.imageUrl && hasProductInfo && (
            <Tooltip title={t('shopping.hasDetails')}>
              <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0 }} />
            </Tooltip>
          )}
        </Box>

        {/* Quantity / unit + preferred brand */}
        {(item.quantity != null || item.unit || item.preferredBrand) && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {item.quantity != null ? item.quantity : ''}{item.unit ? ` ${item.unit}` : ''}
            {item.preferredBrand ? (item.quantity != null || item.unit ? ' · ' : '') + item.preferredBrand : ''}
          </Typography>
        )}
      </Box>

      {/* ItemType chip */}
      {item.itemType !== 'regular' && (
        <Chip
          label={t(`shoppingItemType.${item.itemType}`)}
          size="small"
          variant="outlined"
          sx={{ fontSize: 10, height: 18, px: 0.5 }}
        />
      )}

      {/* Actions (visible on hover) */}
      <Box className="row-actions" sx={{ display: 'flex', opacity: 0, transition: 'opacity 0.15s' }}>
        <IconButton size="small" onClick={() => onEdit(item)} sx={{ p: 0.5 }}>
          <EditRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(item.id)} sx={{ p: 0.5 }}>
          <DeleteRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
        </IconButton>
      </Box>
    </Box>
  )
}
