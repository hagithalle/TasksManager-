import {
  Box, Checkbox, Chip, CircularProgress, Collapse, Divider,
  IconButton, Paper, Typography,
} from '@mui/material'
import AddRoundedIcon        from '@mui/icons-material/AddRounded'
import CloseRoundedIcon      from '@mui/icons-material/CloseRounded'
import EditRoundedIcon       from '@mui/icons-material/EditRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ImageRoundedIcon      from '@mui/icons-material/ImageRounded'
import SmartToyRoundedIcon   from '@mui/icons-material/SmartToyRounded'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listsApi } from '../../api'
import type { PersonalList, ShoppingItem } from '../../types'
import { ShoppingDepartment } from '../../types/enums'
import ShoppingItemDialog from './ShoppingItemDialog'

// ── Department icons / pastel backgrounds ────────────────────────────────────

const DEPT_ICONS: Record<string, string> = {
  fruitsAndVegetables: '🥬',
  dairy:               '🥛',
  meatAndFish:         '🥩',
  bakery:              '🍞',
  pantry:              '🫙',
  frozen:              '🧊',
  cleaning:            '🧹',
  disposable:          '🗑️',
  baby:                '🍼',
  other:               '🛒',
}

const DEPT_BG: Record<string, string> = {
  fruitsAndVegetables: '#E8F5E9',
  dairy:               '#E3F2FD',
  meatAndFish:         '#FCE4EC',
  bakery:              '#FFF8E1',
  pantry:              '#F3E5F5',
  frozen:              '#E0F7FA',
  cleaning:            '#E8EAF6',
  disposable:          '#F5F5F5',
  baby:                '#FFF3E0',
  other:               '#FAFAFA',
}

// ── Suggestion engine ─────────────────────────────────────────────────────────

interface SuggestionEntry {
  item:         ShoppingItem
  reasonKey:    string
  reasonParams: Record<string, string | number> | undefined
}

function computeSuggestions(list: PersonalList): SuggestionEntry[] {
  const settings     = list.shoppingSettings
  if (settings && !settings.enableSmartSuggestions) return []
  const intervalDays = settings?.occasionalIntervalDays ?? 30
  const now          = Date.now()

  // Titles already on the active list — skip duplicates
  const activeTitles = new Set(
    list.shoppingItems
      .filter((i) => i.isActive)
      .map((i) => i.title.toLowerCase().trim()),
  )

  const entries: SuggestionEntry[] = []

  for (const item of list.shoppingItems) {
    if (item.isActive)                                           continue
    if (item.itemType === 'oneTime')                             continue
    if (activeTitles.has(item.title.toLowerCase().trim()))       continue

    let reasonKey:    string
    let reasonParams: Record<string, string | number> | undefined

    if (item.itemType === 'regular') {
      reasonKey = item.lastBoughtAt
        ? 'shopping.reason.regular'
        : 'shopping.reason.firstTime'
    } else {
      // occasional
      if (item.lastBoughtAt) {
        const daysSince = Math.floor(
          (now - new Date(item.lastBoughtAt).getTime()) / 86_400_000,
        )
        if (daysSince < intervalDays) continue            // not time yet
        reasonKey    = 'shopping.reason.occasionalDays'
        reasonParams = { days: daysSince }
      } else {
        reasonKey = 'shopping.reason.firstTime'
      }
    }

    entries.push({ item, reasonKey, reasonParams })
  }

  return entries
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  list:        PersonalList
  onItemAdded: (updatedItem: ShoppingItem) => void
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShoppingAssistantPanel({ list, onItemAdded }: Props) {
  const { t } = useTranslation()

  const [open,       setOpen]       = useState(false)
  const [skipped,    setSkipped]    = useState<Set<string>>(new Set())
  const [adding,     setAdding]     = useState<Set<string>>(new Set())
  const [addingAll,  setAddingAll]  = useState(false)
  const [deselected, setDeselected] = useState<Set<string>>(new Set())
  const [editTarget, setEditTarget] = useState<ShoppingItem | null>(null)
  const [editOpen,   setEditOpen]   = useState(false)

  const allSuggestions = useMemo(
    () => computeSuggestions(list),
    // recompute only when items or settings change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.shoppingItems, list.shoppingSettings],
  )

  const suggestions = allSuggestions.filter((e) => !skipped.has(e.item.id))
  const selectedSuggestions = suggestions.filter((e) => !deselected.has(e.item.id))
  const selectedCount = selectedSuggestions.length

  const grouped = useMemo(() => {
    const map = new Map<string, SuggestionEntry[]>()
    for (const entry of suggestions) {
      const key = entry.item.department ?? ShoppingDepartment.Other
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return map
  }, [suggestions])

  // Panel is invisible when nothing to suggest
  if (allSuggestions.length === 0) return null

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleAdd(item: ShoppingItem) {
    setAdding((prev) => new Set(prev).add(item.id))
    try {
      const updated = await listsApi.updateShoppingItem(item.id, {
        isActive: true,
        isBought: false,
      })
      setSkipped((prev) => new Set(prev).add(item.id))
      onItemAdded(updated)
    } finally {
      setAdding((prev) => {
        const n = new Set(prev)
        n.delete(item.id)
        return n
      })
    }
  }

  function handleSkip(id: string) {
    setSkipped((prev) => new Set(prev).add(id))
  }

  function handleToggleSelect(id: string) {
    setDeselected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function handleEdit(item: ShoppingItem) {
    setEditTarget(item)
    setEditOpen(true)
  }

  async function handleEditSave(data: {
    title: string; quantity?: number; unit?: string; department: string; itemType: string;
    imageUrl?: string; preferredBrand?: string; alternativeBrands: string[]; noteForBuyer?: string
  }) {
    if (!editTarget) return
    const updated = await listsApi.updateShoppingItem(editTarget.id, {
      ...data,
      isActive: true,
      isBought: false,
    })
    setSkipped((prev) => new Set(prev).add(editTarget.id))
    onItemAdded(updated)
    setEditTarget(null)
  }

  async function handleAddAll() {
    setAddingAll(true)
    try {
      const toAdd = selectedSuggestions.map((e) => e.item)
      for (const item of toAdd) {
        const updated = await listsApi.updateShoppingItem(item.id, {
          isActive: true,
          isBought: false,
        })
        onItemAdded(updated)
      }
      setSkipped((prev) => {
        const n = new Set(prev)
        toAdd.forEach((i) => n.add(i.id))
        return n
      })
    } finally {
      setAddingAll(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Box sx={{ mt: 2 }}>
      <Divider />

      {/* ── Section header ── */}
      <Box
        onClick={() => setOpen((p) => !p)}
        sx={{
          px: 2, py: 1.25,
          display: 'flex', alignItems: 'center', gap: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
        }}
      >
        <SmartToyRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700} color="primary.main">
            {t('shopping.assistant')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {suggestions.length > 0
              ? t('shopping.assistantSubtitle', { count: suggestions.length })
              : t('shopping.assistantEmpty')}
          </Typography>
        </Box>

        {/* Add-selected button */}
        {suggestions.length > 0 && (
          <Box
            component="button"
            onClick={(e) => { e.stopPropagation(); void handleAddAll() }}
            disabled={addingAll || selectedCount === 0}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1.25, py: 0.5,
              border: '1.5px solid',
              borderColor: selectedCount > 0 ? 'primary.light' : 'divider',
              borderRadius: 2,
              bgcolor: selectedCount > 0 ? 'rgba(124,92,255,0.05)' : 'transparent',
              color: selectedCount > 0 ? 'primary.main' : 'text.disabled',
              cursor: (addingAll || selectedCount === 0) ? 'default' : 'pointer',
              fontSize: 11, fontWeight: 700,
              '&:disabled': { opacity: 0.5 },
              '&:hover:not(:disabled)': { bgcolor: 'rgba(124,92,255,0.12)' },
              transition: 'background 0.15s',
            }}
          >
            {addingAll
              ? <CircularProgress size={10} sx={{ mr: 0.25 }} />
              : <AddRoundedIcon sx={{ fontSize: 13 }} />}
            {t('shopping.addSelected', { count: selectedCount })}
          </Box>
        )}

        <ExpandMoreRoundedIcon
          sx={{
            fontSize: 18, color: 'text.disabled',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
          }}
        />
      </Box>

      {/* ── Suggestion cards ── */}
      <Collapse in={open} unmountOnExit>
        {suggestions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
            {t('shopping.assistantEmpty')}
          </Typography>
        ) : (
          <Box sx={{ px: 1.5, pb: 2 }}>
            {/* Select-all / deselect-all row */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
              <Typography
                variant="caption"
                color="primary"
                sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { opacity: 0.75 } }}
                onClick={() =>
                  setDeselected(
                    selectedCount === suggestions.length
                      ? new Set(suggestions.map((e) => e.item.id))
                      : new Set(),
                  )
                }
              >
                {selectedCount === suggestions.length
                  ? t('shopping.deselectAll')
                  : t('shopping.selectAll')}
              </Typography>
            </Box>

            {Array.from(grouped.entries()).map(([dept, entries]) => (
              <Box key={dept} sx={{ mb: 1.5 }}>

                {/* Department mini-header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75, px: 0.5 }}>
                  <Typography sx={{ fontSize: 13, lineHeight: 1 }}>
                    {DEPT_ICONS[dept] ?? '🛒'}
                  </Typography>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                    sx={{ letterSpacing: 0.4, textTransform: 'uppercase' }}
                  >
                    {t(`shoppingDepartment.${dept}`)}
                  </Typography>
                </Box>

                {/* Cards */}
                {entries.map((entry) => (
                  <SuggestionCard
                    key={entry.item.id}
                    entry={entry}
                    isAdding={adding.has(entry.item.id)}
                    isSelected={!deselected.has(entry.item.id)}
                    deptBg={DEPT_BG[dept] ?? '#FAFAFA'}
                    deptIcon={DEPT_ICONS[dept] ?? '🛒'}
                    onAdd={handleAdd}
                    onSkip={handleSkip}
                    onEdit={handleEdit}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </Box>
            ))}
          </Box>
        )}
      </Collapse>

      {/* Edit dialog (edit before adding to list) */}
      <ShoppingItemDialog
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditTarget(null) }}
        onSave={handleEditSave}
        initial={editTarget}
      />
    </Box>
  )
}

// ── Suggestion card ───────────────────────────────────────────────────────────

interface CardProps {
  entry:           SuggestionEntry
  isAdding:        boolean
  isSelected:      boolean
  deptBg:          string
  deptIcon:        string
  onAdd:           (item: ShoppingItem) => void
  onSkip:          (id: string) => void
  onEdit:          (item: ShoppingItem) => void
  onToggleSelect:  (id: string) => void
}

function SuggestionCard({ entry, isAdding, isSelected, deptBg, deptIcon, onAdd, onSkip, onEdit, onToggleSelect }: CardProps) {
  const { t }    = useTranslation()
  const { item } = entry

  const meta = [
    item.quantity != null
      ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`
      : item.unit ?? null,
    item.preferredBrand ?? null,
  ].filter(Boolean).join(' · ')

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        p: 1.25,
        mb: 0.75,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#FEFEFE',
        opacity: isAdding ? 0.55 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onChange={() => onToggleSelect(item.id)}
        onClick={(e) => e.stopPropagation()}
        size="small"
        sx={{ p: 0.25, mr: 0.25, color: 'divider', '&.Mui-checked': { color: 'primary.main' } }}
      />

      {/* Dept / image icon circle */}
      <Box
        sx={{
          width: 36, height: 36,
          borderRadius: '50%',
          bgcolor: deptBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          fontSize: 18,
        }}
      >
        {item.imageUrl
          ? <ImageRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          : deptIcon}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>

        {/* Title row + action buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
            {item.title}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
            {/* Add */}
            <IconButton
              size="small"
              onClick={() => onAdd(item)}
              disabled={isAdding}
              sx={{
                p: 0.5, borderRadius: 1.5,
                bgcolor: 'rgba(76,175,80,0.10)', color: '#4CAF50',
                '&:hover': { bgcolor: 'rgba(76,175,80,0.20)' },
              }}
            >
              {isAdding
                ? <CircularProgress size={12} />
                : <AddRoundedIcon sx={{ fontSize: 15 }} />}
            </IconButton>

            {/* Edit */}
            <IconButton
              size="small"
              onClick={() => onEdit(item)}
              sx={{
                p: 0.5, borderRadius: 1.5,
                bgcolor: 'rgba(124,92,255,0.08)', color: 'primary.main',
                '&:hover': { bgcolor: 'rgba(124,92,255,0.18)' },
              }}
            >
              <EditRoundedIcon sx={{ fontSize: 14 }} />
            </IconButton>

            {/* Skip */}
            <IconButton
              size="small"
              onClick={() => onSkip(item.id)}
              sx={{
                p: 0.5, borderRadius: 1.5,
                bgcolor: 'rgba(0,0,0,0.04)', color: 'text.disabled',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.09)' },
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Brand / qty meta */}
        {meta && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.15 }}>
            {meta}
          </Typography>
        )}

        {/* Reason chip */}
        <Chip
          label={`💡 ${t(entry.reasonKey, entry.reasonParams)}`}
          size="small"
          sx={{
            mt: 0.5, height: 18, fontSize: 10, fontWeight: 500,
            bgcolor: 'rgba(255,193,7,0.13)',
            color: 'text.secondary',
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      </Box>
    </Paper>
  )
}
