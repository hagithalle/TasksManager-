import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Stack, Chip, Typography, IconButton, Box, Divider,
  FormControl, InputLabel, Select, MenuItem, Collapse,
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
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
  const [showDetails, setShowDetails] = useState(false)

  const slots = cookingMode === CookingMode.Shabbat ? SHABBAT_SLOTS : WEEKDAY_SLOTS
  const hasSlots = slots.filter(s => s !== MealSlot.None).length > 0

  useEffect(() => {
    if (open) {
      if (initial) {
        setTitle(initial.title)
        setRecipeUrl(initial.recipeUrl ?? '')
        setNotes(initial.notes ?? '')
        setPlannedDate(initial.plannedDate ?? '')
        setTags(initial.tags)
        setIngredients(initial.ingredients.map(i => ({ ...i })))
        setMealSlot(initial.mealSlot ?? MealSlot.None)
        setShowDetails(
          !!(initial.ingredients.length || initial.recipeUrl || initial.notes || initial.plannedDate)
        )
      } else {
        setTitle('')
        setRecipeUrl('')
        setNotes('')
        setPlannedDate('')
        setTags([])
        setCustomTag('')
        setIngredients([])
        setMealSlot(MealSlot.None)
        setShowDetails(false)
      }
    }
  }, [initial, open])

  function handleSelectSuggestion(suggestion: CookingSuggestion | null) {
    if (!suggestion) return
    setTitle(suggestion.title)
    if (suggestion.ingredients.length > 0) {
      setIngredients(suggestion.ingredients.map(i => ({ ...i })))
      setShowDetails(true)
    }
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

  function extractIngredientsFromNotes() {
    const extracted = notes.split('\n')
      .map(line => line.trim())
      .filter(line => line.match(/^(•|\d|\d+\/\d|חצי|רבע|שליש|כף|כוס|קילו|גרם|ליטר|קמצוץ|מעט|כמה|\d+\s?)/))
      .map(line => ({ title: line, quantity: undefined, unit: '' }))
    if (extracted.length > 0) setIngredients(extracted)
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        {initial ? t('cooking.editDish') : t('cooking.addDish')}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>

          {/* Dish name */}
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

          {/* Meal slot */}
          {hasSlots && (
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

          {/* Tags */}
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
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
              {tags.filter(tag => !PRESET_TAGS.includes(tag)).map(tag => (
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
                {t('common.add', 'הוסף')}
              </Button>
            </Stack>
          </Box>

          {/* Expandable details: recipe, ingredients, notes, date */}
          <Box>
            <Button
              size="small"
              variant="text"
              color="inherit"
              endIcon={
                <ExpandMoreRoundedIcon
                  sx={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
                />
              }
              onClick={() => setShowDetails(v => !v)}
              sx={{ color: 'text.secondary', textTransform: 'none', px: 0 }}
            >
              {showDetails
                ? t('cooking.hideDetails', 'הסתר פרטים')
                : t('cooking.addDetails', 'הוסף פרטים (מתכון, מרכיבים, הערות)')}
            </Button>

            <Collapse in={showDetails}>
              <Stack spacing={2} sx={{ mt: 1.5 }}>

                {/* Recipe URL */}
                <TextField
                  label={t('cooking.recipeUrl')}
                  value={recipeUrl}
                  onChange={e => setRecipeUrl(e.target.value)}
                  fullWidth
                  placeholder="https://..."
                  size="small"
                />

                <Divider />

                {/* Ingredients */}
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {t('cooking.ingredients')}
                    </Typography>
                    <IconButton size="small" onClick={addIngredient}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  {ingredients.map((ing, idx) => (
                    <Stack key={idx} direction="row" spacing={1} sx={{ mt: 0.75 }} alignItems="center">
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
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('cooking.noIngredients')}
                    </Typography>
                  )}
                </Box>

                {/* Notes */}
                <TextField
                  label={t('cooking.notes')}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                />

                {notes.trim() && ingredients.length === 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    onClick={extractIngredientsFromNotes}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {t('cooking.extractIngredients', 'חלץ מרכיבים מהטקסט')}
                  </Button>
                )}

                {/* Planned date */}
                <TextField
                  label={t('cooking.plannedDate')}
                  type="date"
                  value={plannedDate}
                  onChange={e => setPlannedDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />

              </Stack>
            </Collapse>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>{t('common.cancel', 'ביטול')}</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !title.trim()}>
          {t('common.save', 'שמור')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
