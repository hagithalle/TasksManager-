import { useEffect, useState } from 'react'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { aiApi } from '../../api/aiExtractApi'
type InputMode = 'manual' | 'url' | 'file'
  const [inputMode, setInputMode] = useState<InputMode>('manual')
  const [extractUrl, setExtractUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractFile, setExtractFile] = useState<File | null>(null)
  // חילוץ מתכון מ-URL (דמה)
  async function handleExtractUrl() {
    if (!extractUrl.trim()) return
    setExtracting(true)
    try {
      const data = await aiApi.extractRecipeFromUrl(extractUrl.trim())
      setTitle(data.title)
      setIngredients((data.ingredients || []).map((str: string) => ({ title: str, quantity: undefined, unit: '' })))
      setNotes(data.notes || '')
    } catch (e) {
      setNotes('שגיאה בחילוץ מתכון מהכתובת')
    } finally {
      setExtracting(false)
    }
  }

  // חילוץ מתכון מקובץ (דמה)
  async function handleExtractFile() {
    if (!extractFile) return
    setExtracting(true)
    try {
      const data = await aiApi.extractRecipeFromFile(extractFile)
      setTitle(data.title)
      setIngredients((data.ingredients || []).map((str: string) => ({ title: str, quantity: undefined, unit: '' })))
      setNotes(data.notes || '')
    } catch (e) {
      setNotes('שגיאה בחילוץ מתכון מהקובץ')
    } finally {
      setExtracting(false)
    }
  }
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Stack, Chip, Typography, IconButton, Box,
  Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useTranslation } from 'react-i18next'
import type { CookingItem, CookingIngredient } from '../../types'
import type { CreateCookingItemPayload, UpdateCookingItemPayload } from '../../api/listsApi'

interface Props {
  open: boolean
  initial?: CookingItem | null
  onClose: () => void
  onSave: (payload: CreateCookingItemPayload | UpdateCookingItemPayload) => Promise<void>
}

const PRESET_TAGS = ['shabbat', 'weekday', 'dairy', 'meat', 'parve', 'quick', 'kids', 'freezes']

export default function CookingItemDialog({ open, initial, onClose, onSave }: Props) {
  const { t } = useTranslation()
  const [title, setTitle]             = useState('')
  const [recipeUrl, setRecipeUrl]     = useState('')
  const [notes, setNotes]             = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [tags, setTags]               = useState<string[]>([])
  const [customTag, setCustomTag]     = useState('')
  const [ingredients, setIngredients] = useState<CookingIngredient[]>([])
  const [saving, setSaving]           = useState(false)

  // Populate from initial item when editing
  useEffect(() => {
    if (initial) {
      setTitle(initial.title)
      setRecipeUrl(initial.recipeUrl ?? '')
      setNotes(initial.notes ?? '')
      setPlannedDate(initial.plannedDate ?? '')
      setTags(initial.tags)
      setIngredients(initial.ingredients.map(i => ({ ...i })))
    } else {
      setTitle('')
      setRecipeUrl('')
      setNotes('')
      setPlannedDate('')
      setTags([])
      setCustomTag('')
      setIngredients([])
    }
  }, [initial, open])

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function addCustomTag() {
    const trimmed = customTag.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed])
    }
    setCustomTag('')
  }

  function addIngredient() {
    setIngredients(prev => [...prev, { title: '', quantity: undefined, unit: '' }])
  }

  function removeIngredient(index: number) {
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  function updateIngredient(index: number, field: keyof CookingIngredient, value: string | number | undefined) {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload: CreateCookingItemPayload = {
        title: title.trim(),
        recipeUrl:   recipeUrl.trim() || undefined,
        notes:       notes.trim() || undefined,
        plannedDate: plannedDate || undefined,
        tags:        tags.length ? tags : undefined,
        ingredients: ingredients.filter(i => i.title.trim()).map(i => ({
          title:    i.title.trim(),
          quantity: i.quantity,
          unit:     i.unit?.trim() || undefined,
        })),
      }
      await onSave(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {initial ? t('cooking.editDish') : t('cooking.addDish')}
      </DialogTitle>

      <DialogContent>
        {/* בחירת מצב הזנה */}
        <Stack direction="row" spacing={1} mb={2}>
          <Chip label="הזנה ידנית" color={inputMode === 'manual' ? 'primary' : 'default'} onClick={() => setInputMode('manual')} />
          <Chip label="חילוץ מ-URL" color={inputMode === 'url' ? 'primary' : 'default'} onClick={() => setInputMode('url')} />
          <Chip label="חילוץ מקובץ" color={inputMode === 'file' ? 'primary' : 'default'} onClick={() => setInputMode('file')} />
        </Stack>

        {/* UI לכל מצב */}
        {inputMode === 'url' && (
          <Stack spacing={1} mb={2}>
            <TextField
              label="הדבק כתובת מתכון"
              value={extractUrl}
              onChange={e => setExtractUrl(e.target.value)}
              fullWidth
              disabled={extracting}
            />
            <Button variant="outlined" onClick={handleExtractUrl} disabled={extracting || !extractUrl.trim()}>
              {extracting ? 'מחלץ...' : 'חילוץ אוטומטי'}
            </Button>
          </Stack>
        )}

        {inputMode === 'file' && (
          <Stack spacing={1} mb={2}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              disabled={extracting}
            >
              העלה קובץ מתכון
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,image/*"
                hidden
                onChange={e => setExtractFile(e.target.files?.[0] || null)}
              />
            </Button>
            {extractFile && <Typography variant="body2">{extractFile.name}</Typography>}
            <Button variant="outlined" onClick={handleExtractFile} disabled={extracting || !extractFile}>
              {extracting ? 'מחלץ...' : 'חילוץ אוטומטי'}
            </Button>
          </Stack>
        )}

        {/* טופס ידני תמיד גלוי לעריכה */}
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Title */}
          <TextField
            label={t('cooking.dishName')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            autoFocus
            required
          />

          {/* Planned date */}
          <TextField
            label={t('cooking.plannedDate')}
            type="date"
            value={plannedDate}
            onChange={e => setPlannedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* Tags */}
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t('cooking.tags')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {PRESET_TAGS.map(tag => (
                <Chip
                  key={tag}
                  label={t(`cooking.tag_${tag}`, tag)}
                  size="small"
                  color={tags.includes(tag) ? 'primary' : 'default'}
                  onClick={() => toggleTag(tag)}
                  variant={tags.includes(tag) ? 'filled' : 'outlined'}
                />
              ))}
              {tags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  color="primary"
                  onDelete={() => setTags(prev => prev.filter(t => t !== tag))}
                />
              ))}
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <TextField
                size="small"
                placeholder={t('cooking.customTag')}
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomTag()}
                sx={{ flex: 1 }}
              />
              <Button size="small" onClick={addCustomTag} disabled={!customTag.trim()}>
                {t('common.add', 'Add')}
              </Button>
            </Stack>
          </Box>

          <Divider />

          {/* Ingredients */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {t('cooking.ingredients')}
              </Typography>
              <IconButton size="small" onClick={addIngredient}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Stack>

            {ingredients.map((ing, idx) => (
              <Stack key={idx} direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                <TextField
                  size="small"
                  placeholder={t('cooking.ingredientName')}
                  value={ing.title}
                  onChange={e => updateIngredient(idx, 'title', e.target.value)}
                  sx={{ flex: 2 }}
                />
                <TextField
                  size="small"
                  placeholder={t('cooking.qty')}
                  type="number"
                  value={ing.quantity ?? ''}
                  onChange={e => updateIngredient(idx, 'quantity', e.target.value ? Number(e.target.value) : undefined)}
                  sx={{ flex: 1 }}
                  inputProps={{ min: 0, step: 0.25 }}
                />
                <TextField
                  size="small"
                  placeholder={t('cooking.unit')}
                  value={ing.unit ?? ''}
                  onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <IconButton size="small" onClick={() => removeIngredient(idx)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}

            {ingredients.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('cooking.noIngredients')}
              </Typography>
            )}
          </Box>

          <Divider />

          {/* Recipe URL */}
          <TextField
            label={t('cooking.recipeUrl')}
            value={recipeUrl}
            onChange={e => setRecipeUrl(e.target.value)}
            fullWidth
            placeholder="https://..."
          />

          {/* Notes */}
          <TextField
            label={t('cooking.notes')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{t('common.cancel', 'Cancel')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !title.trim()}>
          {t('common.save', 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
