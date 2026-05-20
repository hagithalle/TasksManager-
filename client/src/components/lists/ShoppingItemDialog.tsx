import {
  Box, Button, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography,
} from '@mui/material'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShoppingDepartment, ShoppingItemType } from '../../types/enums'
import type { ShoppingItem } from '../../types'

interface Props {
  open:      boolean
  onClose:   () => void
  onSave:    (data: {
    title:             string
    quantity?:         number
    unit?:             string
    department:        string
    itemType:          string
    imageUrl?:         string
    preferredBrand?:   string
    alternativeBrands: string[]
    noteForBuyer?:     string
  }) => void
  initial?: ShoppingItem | null
}

const DEPARTMENTS = Object.values(ShoppingDepartment)
const ITEM_TYPES  = Object.values(ShoppingItemType)

export default function ShoppingItemDialog({ open, onClose, onSave, initial }: Props) {
  const { t } = useTranslation()

  const [title,          setTitle]          = useState('')
  const [quantity,       setQuantity]       = useState('')
  const [unit,           setUnit]           = useState('')
  const [department,     setDepartment]     = useState<string>(ShoppingDepartment.Other)
  const [itemType,       setItemType]       = useState<string>(ShoppingItemType.Regular)
  const [titleError,     setTitleError]     = useState(false)
  // product details
  const [detailsOpen,    setDetailsOpen]    = useState(false)
  const [imageUrl,       setImageUrl]       = useState('')
  const [preferredBrand, setPreferredBrand] = useState('')
  const [altBrandInput,  setAltBrandInput]  = useState('')
  const [altBrands,      setAltBrands]      = useState<string[]>([])
  const [noteForBuyer,   setNoteForBuyer]   = useState('')

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '')
      setQuantity(initial?.quantity != null ? String(initial.quantity) : '')
      setUnit(initial?.unit ?? '')
      setDepartment(initial?.department ?? ShoppingDepartment.Other)
      setItemType(initial?.itemType ?? ShoppingItemType.Regular)
      setImageUrl(initial?.imageUrl ?? '')
      setPreferredBrand(initial?.preferredBrand ?? '')
      setAltBrands(initial?.alternativeBrands ?? [])
      setAltBrandInput('')
      setNoteForBuyer(initial?.noteForBuyer ?? '')
      setTitleError(false)
      setDetailsOpen(!!(initial?.imageUrl || initial?.preferredBrand || (initial?.alternativeBrands?.length ?? 0) > 0 || initial?.noteForBuyer))
    }
  }, [open, initial])

  function addAltBrand() {
    const b = altBrandInput.trim()
    if (b && !altBrands.includes(b)) setAltBrands((prev) => [...prev, b])
    setAltBrandInput('')
  }

  function handleSave() {
    if (!title.trim()) { setTitleError(true); return }
    const qty = quantity.trim() ? parseFloat(quantity) : undefined
    onSave({
      title:             title.trim(),
      quantity:          qty,
      unit:              unit.trim() || undefined,
      department,
      itemType,
      imageUrl:          imageUrl.trim() || undefined,
      preferredBrand:    preferredBrand.trim() || undefined,
      alternativeBrands: altBrands,
      noteForBuyer:      noteForBuyer.trim() || undefined,
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial ? t('shopping.editItem') : t('shopping.addItem')}
      </DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Title */}
          <TextField
            label={t('common.title')}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
            error={titleError}
            helperText={titleError ? t('common.required') : undefined}
            fullWidth
            autoFocus
            size="small"
          />

          {/* Quantity + Unit */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              label={t('shopping.quantity')}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              size="small"
              type="number"
              inputProps={{ min: 0, step: 0.5 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label={t('shopping.unit')}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              size="small"
              placeholder={t('shopping.unitPlaceholder')}
              sx={{ flex: 1 }}
            />
          </Box>

          {/* Department */}
          <FormControl size="small" fullWidth>
            <InputLabel>{t('shopping.department')}</InputLabel>
            <Select
              value={department}
              label={t('shopping.department')}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <MenuItem key={d} value={d}>
                  {t(`shoppingDepartment.${d}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Item type */}
          <FormControl size="small" fullWidth>
            <InputLabel>{t('shopping.itemType')}</InputLabel>
            <Select
              value={itemType}
              label={t('shopping.itemType')}
              onChange={(e) => setItemType(e.target.value)}
            >
              {ITEM_TYPES.map((it) => (
                <MenuItem key={it} value={it}>
                  {t(`shoppingItemType.${it}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* ── Product details (collapsible) ── */}
          <Box>
            <Box
              onClick={() => setDetailsOpen((p) => !p)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                cursor: 'pointer', py: 0.5,
                '&:hover': { opacity: 0.75 },
              }}
            >
              <Divider sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ px: 1, letterSpacing: 0.4 }}>
                {t('shopping.productDetails')}
              </Typography>
              <Divider sx={{ flex: 1 }} />
              <IconButton size="small" disableRipple sx={{ p: 0, ml: 0.5 }}>
                <ExpandMoreRoundedIcon
                  sx={{
                    fontSize: 16,
                    color: 'text.disabled',
                    transform: detailsOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </IconButton>
            </Box>

            <Collapse in={detailsOpen} unmountOnExit>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>

                {/* Image URL */}
                <TextField
                  label={t('shopping.imageUrl')}
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="https://..."
                  helperText={t('shopping.imageUrlHint')}
                />

                {/* Image preview */}
                {imageUrl.trim() && (
                  <Box
                    sx={{
                      width: '100%', height: 120, borderRadius: 2,
                      overflow: 'hidden', bgcolor: '#F5F5F5',
                      display: 'flex', justifyContent: 'center',
                    }}
                  >
                    <Box
                      component="img"
                      src={imageUrl.trim()}
                      alt="preview"
                      sx={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </Box>
                )}

                {/* Preferred brand */}
                <TextField
                  label={t('shopping.preferredBrand')}
                  value={preferredBrand}
                  onChange={(e) => setPreferredBrand(e.target.value)}
                  size="small"
                  fullWidth
                />

                {/* Alternative brands */}
                <Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      label={t('shopping.addAltBrand')}
                      value={altBrandInput}
                      onChange={(e) => setAltBrandInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAltBrand() } }}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <Button size="small" variant="outlined" onClick={addAltBrand} sx={{ flexShrink: 0 }}>
                      +
                    </Button>
                  </Box>
                  {altBrands.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {altBrands.map((b) => (
                        <Chip
                          key={b}
                          label={b}
                          size="small"
                          onDelete={() => setAltBrands((prev) => prev.filter((x) => x !== b))}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Note for buyer */}
                <TextField
                  label={t('shopping.noteForBuyer')}
                  value={noteForBuyer}
                  onChange={(e) => setNoteForBuyer(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  placeholder={t('shopping.noteForBuyerPlaceholder')}
                />

              </Box>
            </Collapse>
          </Box>

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">{t('common.cancel')}</Button>
        <Button onClick={handleSave} variant="contained" disableElevation>
          {initial ? t('common.save') : t('common.add')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

