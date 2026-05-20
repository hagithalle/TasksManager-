import {
  Box, Chip, Dialog, DialogContent, Divider,
  Slide, Typography,
} from '@mui/material'
import type { TransitionProps } from '@mui/material/transitions'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShoppingItem } from '../../types'

// ── Slide-up transition (bottom sheet feel) ───────────────────────────────────
const SlideUp = forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

interface Props {
  item:    ShoppingItem | null
  onClose: () => void
}

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

export default function ShoppingItemDetailSheet({ item, onClose }: Props) {
  const { t } = useTranslation()

  if (!item) return null

  const hasDetails =
    item.imageUrl || item.preferredBrand ||
    (item.alternativeBrands?.length ?? 0) > 0 ||
    item.noteForBuyer

  return (
    <Dialog
      open={!!item}
      onClose={onClose}
      TransitionComponent={SlideUp}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: '20px 20px 0 0',
          position: 'fixed',
          bottom: 0,
          m: 0,
          width: '100%',
          maxHeight: '85vh',
        },
      }}
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-end' } }}
    >
      {/* Drag handle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'divider' }} />
      </Box>

      <DialogContent sx={{ px: 2.5, pb: 3, overflowX: 'hidden' }}>

        {/* ── Product image ── */}
        {item.imageUrl && (
          <Box
            sx={{
              width: '100%',
              maxHeight: 220,
              borderRadius: 3,
              overflow: 'hidden',
              mb: 2,
              bgcolor: '#F5F5F5',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={item.imageUrl}
              alt={item.title}
              sx={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </Box>
        )}

        {/* ── Title + dept ── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
            {item.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 18 }}>
              {DEPT_ICONS[item.department] ?? '🛒'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t(`shoppingDepartment.${item.department}`)}
            </Typography>
          </Box>
        </Box>

        {/* ── Quantity + unit ── */}
        {(item.quantity != null || item.unit) && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {t('shopping.quantity')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              {item.quantity != null ? item.quantity : '—'}
              {item.unit ? ` ${item.unit}` : ''}
            </Typography>
          </Box>
        )}

        {/* Only render product details block if any exist */}
        {hasDetails && <Divider sx={{ my: 1.5 }} />}

        {/* ── Preferred brand ── */}
        {item.preferredBrand && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {t('shopping.preferredBrand')}
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ mt: 0.25 }}>
              {item.preferredBrand}
            </Typography>
          </Box>
        )}

        {/* ── Alternative brands ── */}
        {(item.alternativeBrands?.length ?? 0) > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', mb: 0.5 }}>
              {t('shopping.alternativeBrands')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {item.alternativeBrands.map((brand) => (
                <Chip
                  key={brand}
                  label={brand}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 12 }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* ── Note for buyer ── */}
        {item.noteForBuyer && (
          <Box
            sx={{
              mt: 1,
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: 'rgba(255,193,7,0.10)',
              border: '1px solid rgba(255,193,7,0.25)',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', mb: 0.5 }}>
              📌 {t('shopping.noteForBuyer')}
            </Typography>
            <Typography variant="body2">
              {item.noteForBuyer}
            </Typography>
          </Box>
        )}

        {/* Empty state */}
        {!hasDetails && !(item.quantity != null || item.unit) && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
            {t('shopping.noDetails')}
          </Typography>
        )}

      </DialogContent>
    </Dialog>
  )
}
