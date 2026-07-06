import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Stack, Chip, Typography, IconButton, Box,
  Divider, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useTranslation } from 'react-i18next'
import type { CookingItem, CookingIngredient } from '../../types'
import type { CreateCookingItemPayload, UpdateCookingItemPayload, CookingSuggestion } from '../../api/listsApi'
import { MealSlot, CookingMode } from '../../types/enums'

const SHABBAT_SLOTS: MealSlot[] = [
  MealSlot.None, MealSlot.FridayDinner, MealSlot.SaturdayMorning,
  MealSlot.Additions, MealSlot.ThirdMeal,
]
const WEEKDAY_SLOTS: MealSlot[] = [
  MealSlot.None, MealSlot.MainDish, MealSlot.Side,
  MealSlot.Salad, MealSlot.Dessert, MealSlot.Other,
]

const PRESET_TAGS = ['shabbat', 'weekday', 'dairy', 'meat', 'parve', 'quick', 'kids', 'freezes']

interface Props {
  open: boolean
  initial?: CookingItem | null
  cookingMode?: CookingMode
  suggestions?: CookingSuggestion[]
  onClose: () => void
  onSave: (payload: CreateCookingItemPayload | UpdateCookingItemPayload) => Promise<void>
}

export default function CookingItemDialog({ open, initial, cookingMode, suggestions = [], onClose, onSave }: Props) {
  const { t } = useTranslation()
  const [title, setTitle]             = useState('')
  const [recipeUrl, setRecipeUrl]     = useState('')
  const [notes, setNotes]             = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [tags, setTags]               = useState<string[]>([])
  const [customTag, setCustomTag]     = useState('')
  const [ingredients, setIngredients] = useState<CookingIngredient[]>([])
  const [mealSlot, setMealSlot]       = useState<MealSlot>(MealSlot.None)
  const [saving, setSaving]           = useState(false)
  const [inputMode, setInputMode]     = useState<'manual' | 'url'>('manual')

  const slots = cookingMode === CookingMode.Shabbat ? SHABBAT_SLOTS : WEEKDAY_SLOTS

  function extractIngredientsFromText(text: string) {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.match(/^(•|\d|\d+\/\d|חצי|רבע|שליש|כף|כוס|קילו|גרם|ליטר|קמצוץ|מעט|כמה|\d+\s?)/))
      .map(line => ({ title: line, quantity: undefined, unit: '' }))
  }

  function handleExtractIngredients() {
    setIngredients(extractIngredientsFromText(notes))
  }

  useEffect(() => {
    if (initial) {
      setTitle(initial.title)
      setRecipeUrl(initial.recipeUrl ?? '')
      setNotes(initial.notes ?? '')
      setPlannedDate(initial.plannedDate ?? '')
      setTags(initial.tags)
      setIngredients(initial.ingredients.map(i => ({ ...i })))
      setMealSlot(initial.mealSlot ?? MealSlot.None)
    } else {
      setTitle('')
      setRecipeUrl('')
      setNotes('')
      setPlannedDate('')
      setTags([])
      setCustomTag('')
      setIngredients([])
      setMealSlot(MealSlot.None)
    }
  }, [initial, open])

  function handleSelectSuggestion(suggestion: CookingSuggestion | null) {
    if (!suggestion) return
    setTitle(suggestion.title)
    if (suggestion.ingredients.length > 0) setIngredients(suggestion.ingredients.map(i => ({ ...i })))
    if (suggestion.tags.length > 0) setTags(suggestion.tags)
  }

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function addCustomTag() {
    const trimmed = customTag.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) setTags(prev => [...prev, trimmed])
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
        title:       title.trim(),
        recipeUrl:   recipeUrl.trim() || undefined,
        notes:       notes.trim() || undefined,
        plannedDate: plannedDate || undefined,
        tags:        tags.length ? tags : undefined,
        mealSlot:    mealSlot !== MealSlot.None ? mealSlot : undefined,
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
        <Stack direction="row" spacing={1} mb={2}>
          <Chip label="הזנה ידנית" color={inputMode === 'manual' ? 'primary' : 'default'} onClick={() => setInputMode('manual')} />
          <Chip label="קישור מתכון" color={inputMode === 'url' ? 'primary' : 'default'} onClick={() => setInputMode('url')} />
        </Stack>

        {inputMode === 'url' && (
          <Stack spacing={1} mb={2}>
            <TextField
              label="הדבק כתובת מתכון"
              value={recipeUrl}
              onChange={e => setRecipeUrl(e.target.value)}
              fullWidth
            />
          </Stack>
        )}

        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Autocomplete title from personal dish history */}
          {suggestions.length > 0 ? (
            <Autocomplete
              freeSolo
              options={suggestions}
              getOptionLabel={(o) => typeof o === 'string' ? o : o.title}
              inputValue={title}
              onInputChange={(_, v) => setTitle(v)}
              onChange={(_, v) => {
                if (v && typeof v !== 'string') handleSelectSuggestion(v)
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('cooking.dishName')}
                  required
                  autoFocus
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.title}>
                  <Box>
                    <Typography variant="body2">{option.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('cooking.cookedTimes', { count: option.timesCooked })}
                    </Typography>
                  </Box>
                </li>
              )}
            />
          ) : (
            <TextField
              label={t('cooking.dishName')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              fullWidth
              autoFocus
              required
            />
          )}

          {/* Meal slot selector */}
          {slots.filter(s => s !== MealSlot.None).length > 0 && (
            <FormControl fullWidth size="small">
              <InputLabel>{t('cooking.mealSlot', 'קטגוריה / ארוחה')}</InputLabel>
              <Select
                value={mealSlot}
                label={t('cooking.mealSlot', 'קטגוריה / ארוחה')}
                onChange={(e) => setMealSlot(e.target.value as MealSlot)}
              >
                {slots.map(slot => (
                  <MenuItem key={slot} value={slot}>
                    {t(`mealSlot.${slot}`, slot)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

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

          {/* Notes + auto-extract */}
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              label={t('cooking.notes')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <Button variant="outlined" onClick={handleExtractIngredients} sx={{ height: '40px', mt: 1 }}>
              חילוץ מרכיבים אוטומטי
            </Button>
          </Stack>
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
