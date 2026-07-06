import { useCallback, useEffect, useState } from 'react'
import {
  Box, Button, Card, CardContent, CardActions, Chip, Fab, Checkbox,
  Grid, IconButton, Menu, MenuItem, Stack, Tooltip, Typography,
  Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { CookingItem, PersonalList } from '../../types'
import { listsApi, type CookingSuggestion } from '../../api/listsApi'
import { CookingMode, MealSlot } from '../../types/enums'
import { useAuth } from '../../contexts/AuthContext'
import AddTaskDialog from '../tasks/AddTaskDialog'
import CookingItemDialog from './CookingItemDialog'
import PushToShoppingDialog from './PushToShoppingDialog'
import ShabbatPlannerDialog from './ShabbatPlannerDialog'

interface Props {
  list: PersonalList
  allLists: PersonalList[]
  onListUpdated: (updated: PersonalList) => void
}

// ── Meal slot section definitions ─────────────────────────────────────────────

const SHABBAT_SECTIONS: { slot: MealSlot; emoji: string; labelKey: string }[] = [
  { slot: MealSlot.FridayDinner,    emoji: '🕯️', labelKey: 'mealSlot.fridaydinner' },
  { slot: MealSlot.SaturdayMorning, emoji: '☀️', labelKey: 'mealSlot.saturdaymorning' },
  { slot: MealSlot.Additions,       emoji: '🥖', labelKey: 'mealSlot.additions' },
  { slot: MealSlot.ThirdMeal,       emoji: '🌅', labelKey: 'mealSlot.thirdmeal' },
]
const WEEKDAY_SECTIONS: { slot: MealSlot; emoji: string; labelKey: string }[] = [
  { slot: MealSlot.MainDish, emoji: '🥩', labelKey: 'mealSlot.maindish' },
  { slot: MealSlot.Side,     emoji: '🥗', labelKey: 'mealSlot.side' },
  { slot: MealSlot.Salad,    emoji: '🥙', labelKey: 'mealSlot.salad' },
  { slot: MealSlot.Dessert,  emoji: '🍰', labelKey: 'mealSlot.dessert' },
  { slot: MealSlot.Other,    emoji: '📋', labelKey: 'mealSlot.other' },
]

export default function CookingPlanView({ list, allLists, onListUpdated }: Props) {
  const { t } = useTranslation()
  const isShabbat = list.cookingMode === CookingMode.Shabbat

  const [addOpen,          setAddOpen]          = useState(false)
  const [editItem,         setEditItem]         = useState<CookingItem | null>(null)
  const [pushOpen,         setPushOpen]         = useState(false)
  const [shabbatPlanOpen,  setShabbatPlanOpen]  = useState(false)
  const [suggestions,      setSuggestions]      = useState<CookingSuggestion[]>([])
  const [menuAnchor,       setMenuAnchor]       = useState<{ el: HTMLElement; item: CookingItem } | null>(null)
  const [convertOpen,      setConvertOpen]      = useState<CookingItem | null>(null)

  useEffect(() => {
    listsApi.getCookingSuggestions().then(setSuggestions).catch(() => {})
  }, [])

  async function reload() {
    const updated = await listsApi.getById(list.id)
    onListUpdated(updated)
  }

  const handleAddSave = useCallback(async (payload: any) => {
    await listsApi.addCookingItem(list.id, payload)
    await reload()
  }, [list.id])

  const handleEditSave = useCallback(async (payload: any) => {
    if (!editItem) return
    await listsApi.updateCookingItem(editItem.id, payload)
    await reload()
  }, [editItem, list.id])

  async function handleDelete(item: CookingItem) {
    setMenuAnchor(null)
    await listsApi.deleteCookingItem(item.id)
    await reload()
  }

  async function handleAddFromSuggestion(s: CookingSuggestion) {
    await listsApi.addCookingItem(list.id, {
      title:       s.title,
      tags:        s.tags,
      ingredients: s.ingredients,
    })
    await reload()
  }

  const { user } = useAuth()

  async function handleTaskAdded(task: any) {
    try {
      if (convertOpen && task?.id) {
        await listsApi.updateCookingItem(convertOpen.id, { linkedTaskId: task.id })
        await reload()
      }
    } finally {
      setConvertOpen(null)
    }
  }

  async function handleToggleCompleted(item: CookingItem) {
    try {
      await listsApi.updateCookingItem(item.id, { isCompleted: !item.isCompleted })
      await reload()
    } catch { /* ignore */ }
  }

  const items = list.cookingItems ?? []

  // Suggestions to show: exclude titles already in list
  const existingTitles = new Set(items.map(i => i.title.trim().toLowerCase()))
  const relevantSuggestions = suggestions
    .filter(s => !existingTitles.has(s.title.trim().toLowerCase()))
    .slice(0, 5)

  // ── Render helpers ────────────────────────────────────────────────────────────

  function renderItemsGrid(subset: CookingItem[]) {
    return (
      <Grid container spacing={2}>
        {subset.map(item => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <DishCard
              item={item}
              onEdit={() => setEditItem(item)}
              onDelete={() => handleDelete(item)}
              onMenuOpen={(el) => setMenuAnchor({ el, item })}
              onConvert={() => setConvertOpen(item)}
              onToggleCompleted={() => handleToggleCompleted(item)}
            />
          </Grid>
        ))}
      </Grid>
    )
  }

  // ── Grouped or flat view ──────────────────────────────────────────────────────

  const sections = isShabbat ? SHABBAT_SECTIONS : WEEKDAY_SECTIONS
  const unslotted = items.filter(i => i.mealSlot === MealSlot.None)

  // In Regular mode, only show sections that actually have items (optional grouping).
  // In Shabbat mode, always show all 4 sections even if empty.
  const visibleSections = sections.filter(s =>
    isShabbat ? true : items.some(i => i.mealSlot === s.slot)
  )

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header row */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">{t('cooking.planTitle', 'Cooking Plan')}</Typography>
        <Stack direction="row" spacing={1}>
          {isShabbat && (
            <Button
              variant="contained"
              startIcon={<AutoAwesomeRoundedIcon />}
              size="small"
              onClick={() => setShabbatPlanOpen(true)}
              color="secondary"
            >
              {t('cooking.shabbatPlanner', 'סוכן שבת')}
            </Button>
          )}
          <Tooltip title={t('cooking.pushToShopping')}>
            <span>
              <Button
                variant="outlined"
                startIcon={<ShoppingCartIcon />}
                size="small"
                onClick={() => setPushOpen(true)}
                disabled={items.length === 0}
              >
                {t('cooking.extractIngredients')}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Suggestions banner */}
      {relevantSuggestions.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <LightbulbOutlinedIcon fontSize="small" color="primary" />
            <Typography variant="body2" fontWeight={500}>{t('cooking.suggestions')}</Typography>
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {relevantSuggestions.map(s => (
              <Chip
                key={s.title}
                label={`${s.title} (×${s.timesCooked})`}
                size="small"
                icon={<AddIcon />}
                onClick={() => handleAddFromSuggestion(s)}
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Content */}
      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">{t('cooking.emptyState')}</Typography>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            {isShabbat && (
              <Button
                variant="outlined"
                startIcon={<AutoAwesomeRoundedIcon />}
                onClick={() => setShabbatPlanOpen(true)}
                color="secondary"
              >
                {t('cooking.shabbatPlannerEmpty', 'תכנן שבת עם AI')}
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddOpen(true)}
            >
              {t('cooking.addDish')}
            </Button>
          </Stack>
        </Box>
      ) : visibleSections.length > 0 ? (
        // Grouped by meal slot
        <Stack spacing={3}>
          {visibleSections.map(({ slot, emoji, labelKey }) => {
            const sectionItems = items.filter(i => i.mealSlot === slot)
            return (
              <Box key={slot}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {emoji} {t(labelKey, slot)}
                  </Typography>
                  <Chip label={sectionItems.length} size="small" variant="outlined" />
                </Stack>
                {sectionItems.length > 0
                  ? renderItemsGrid(sectionItems)
                  : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1, pl: 1 }}>
                      {t('cooking.noItemsInSlot', 'אין מנות בקטגוריה זו')}
                    </Typography>
                  )
                }
              </Box>
            )
          })}

          {/* Unslotted items */}
          {unslotted.length > 0 && (
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  📋 {t('mealSlot.none', 'ללא קטגוריה')}
                </Typography>
                <Chip label={unslotted.length} size="small" variant="outlined" />
              </Stack>
              {renderItemsGrid(unslotted)}
            </Box>
          )}
        </Stack>
      ) : (
        // No grouping (Regular mode with no slotted items)
        renderItemsGrid(items)
      )}

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setEditItem(menuAnchor!.item); setMenuAnchor(null) }}>
          {t('common.edit', 'Edit')}
        </MenuItem>
        <MenuItem onClick={() => handleDelete(menuAnchor!.item)}>
          {t('common.delete', 'Delete')}
        </MenuItem>
      </Menu>

      {/* FAB */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 72, right: 24 }}
        onClick={() => setAddOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Add / edit dialogs */}
      <CookingItemDialog
        open={addOpen}
        initial={null}
        cookingMode={list.cookingMode}
        suggestions={suggestions}
        onClose={() => setAddOpen(false)}
        onSave={handleAddSave}
      />
      <CookingItemDialog
        open={Boolean(editItem)}
        initial={editItem}
        cookingMode={list.cookingMode}
        suggestions={suggestions}
        onClose={() => setEditItem(null)}
        onSave={handleEditSave}
      />

      <AddTaskDialog
        open={Boolean(convertOpen)}
        onClose={() => setConvertOpen(null)}
        userId={user?.id}
        defaultTitle={convertOpen?.title}
        defaultGoalId={undefined}
        onAdd={handleTaskAdded}
        allTasks={[]}
      />

      <PushToShoppingDialog
        open={pushOpen}
        cookingListId={list.id}
        allLists={allLists}
        onClose={() => setPushOpen(false)}
        onDone={reload}
      />

      {isShabbat && (
        <ShabbatPlannerDialog
          open={shabbatPlanOpen}
          listId={list.id}
          suggestions={suggestions}
          onClose={() => setShabbatPlanOpen(false)}
          onDone={reload}
        />
      )}
    </Box>
  )
}

// ── Dish card ──────────────────────────────────────────────────────────────────

interface DishCardProps {
  item: CookingItem
  onEdit: () => void
  onDelete: () => void
  onMenuOpen: (el: HTMLElement) => void
  onConvert?: () => void
  onToggleCompleted?: () => void
}

function DishCard({ item, onMenuOpen, onConvert, onToggleCompleted }: DishCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column',
      opacity: item.isCompleted ? 0.6 : 1 }}>
      <CardContent sx={{ flex: 1, pb: 0 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mr: 1 }}>
            <Checkbox
              checked={item.isCompleted}
              onChange={() => onToggleCompleted?.()}
              size="small"
              sx={{ p: 0 }}
            />
            <Typography
              variant="subtitle1"
              fontWeight={600}
              noWrap
              sx={{ flex: 1, textDecoration: item.isCompleted ? 'line-through' : 'none' }}
            >
              {item.title}
            </Typography>
          </Box>
          <IconButton size="small" onClick={e => onMenuOpen(e.currentTarget)}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>

        {item.plannedDate && (
          <Typography variant="caption" color="text.secondary">
            📅 {item.plannedDate}
          </Typography>
        )}

        {item.tags.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.75 }}>
            {item.tags.map(tag => (
              <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
            ))}
          </Stack>
        )}

        {item.ingredients.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary">
              🥦 {t('cooking.ingredientCount', { count: item.ingredients.length })}
            </Typography>
          </>
        )}

        {item.notes && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {item.notes}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0 }}>
        {item.recipeUrl && (
          <Button
            size="small"
            href={item.recipeUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon fontSize="inherit" />}
          >
            {t('cooking.viewRecipe')}
          </Button>
        )}

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={t('list.convertToTask')}>
            <IconButton size="small" onClick={() => typeof onConvert === 'function' && onConvert()}>
              <AddTaskRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          {item.linkedTaskId && (
            <Tooltip title={t('task.openLinked')}>
              <IconButton size="small" onClick={() => navigate(`/tasks?focus=${item.linkedTaskId}`)}>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardActions>
    </Card>
  )
}
