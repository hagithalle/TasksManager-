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
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { CookingItem, PersonalList } from '../../types'
import { listsApi, type CookingSuggestion } from '../../api/listsApi'
// tasksApi imported indirectly via AddTaskDialog when needed
import { useAuth } from '../../contexts/AuthContext'
import AddTaskDialog from '../tasks/AddTaskDialog'
import CookingItemDialog from './CookingItemDialog'
import PushToShoppingDialog from './PushToShoppingDialog'

interface Props {
  list: PersonalList
  allLists: PersonalList[]
  onListUpdated: (updated: PersonalList) => void
}

export default function CookingPlanView({ list, allLists, onListUpdated }: Props) {
  const { t } = useTranslation()

  const [addOpen, setAddOpen]           = useState(false)
  const [editItem, setEditItem]         = useState<CookingItem | null>(null)
  const [pushOpen, setPushOpen]         = useState(false)
  const [suggestions, setSuggestions]   = useState<CookingSuggestion[]>([])
  const [menuAnchor, setMenuAnchor]     = useState<{ el: HTMLElement; item: CookingItem } | null>(null)
  const [convertOpen, setConvertOpen]   = useState<CookingItem | null>(null)

  // Load cooking suggestions on mount
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

  function openConvertDialog(item: CookingItem) {
    setConvertOpen(item)
  }

  async function handleTaskAdded(task: any) {
    // task created via AddTaskDialog — do not remove cooking item
    try {
      if (convertOpen && task?.id) {
        await listsApi.updateCookingItem(convertOpen.id, { linkedTaskId: task.id })
        await reload()
      }
    } finally {
      setConvertOpen(null)
    }
  }

  // Items sorted by sortOrder (already sorted by backend, just display)
  const items = list.cookingItems ?? []

  async function handleToggleCompleted(item: CookingItem) {
    try {
      await listsApi.updateCookingItem(item.id, { isCompleted: !item.isCompleted })
      await reload()
    } catch {
      // ignore
    }
  }

  // Suggestions to show: exclude titles already in the list
  const existingTitles = new Set(items.map(i => i.title.trim().toLowerCase()))
  const relevantSuggestions = suggestions
    .filter(s => !existingTitles.has(s.title.trim().toLowerCase()))
    .slice(0, 5)

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header row */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">{t('cooking.planTitle', 'Cooking Plan')}</Typography>
        <Stack direction="row" spacing={1}>
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
        <Box
          sx={{
            mb: 2, p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <LightbulbOutlinedIcon fontSize="small" color="primary" />
            <Typography variant="body2" fontWeight={500}>
              {t('cooking.suggestions')}
            </Typography>
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

      {/* Cooking items grid */}
      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">{t('cooking.emptyState')}</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={() => setAddOpen(true)}
          >
            {t('cooking.addDish')}
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {items.map(item => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <DishCard
                item={item}
                onEdit={() => { setEditItem(item) }}
                onDelete={() => handleDelete(item)}
                onMenuOpen={(el) => setMenuAnchor({ el, item })}
                onConvert={() => openConvertDialog(item)}
                onToggleCompleted={() => handleToggleCompleted(item)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setEditItem(menuAnchor!.item)
          setMenuAnchor(null)
        }}>
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
        onClose={() => setAddOpen(false)}
        onSave={handleAddSave}
      />
      <CookingItemDialog
        open={Boolean(editItem)}
        initial={editItem}
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

      {/* Push to shopping dialog */}
      <PushToShoppingDialog
        open={pushOpen}
        cookingListId={list.id}
        allLists={allLists}
        onClose={() => setPushOpen(false)}
        onDone={reload}
      />
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
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, pb: 0 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mr: 1 }}>
            <Checkbox
              checked={item.isCompleted}
              onChange={() => onToggleCompleted?.()}
              size="small"
              sx={{ p: 0 }}
            />
            <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flex: 1 }}>
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
