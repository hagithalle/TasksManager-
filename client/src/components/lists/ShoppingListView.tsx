import {
  Box, Button, Divider, Fab, Tooltip, Typography,
} from '@mui/material'
import AddRoundedIcon         from '@mui/icons-material/AddRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import ReplayRoundedIcon      from '@mui/icons-material/ReplayRounded'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listsApi } from '../../api'
import type { PersonalList, ShoppingItem } from '../../types'
import { ShoppingDepartment } from '../../types/enums'
import ShoppingDepartmentSection from './ShoppingDepartmentSection'
import ShoppingItemRow from './ShoppingItemRow'
import ShoppingItemDialog from './ShoppingItemDialog'
import ShoppingItemDetailSheet from './ShoppingItemDetailSheet'
import ShoppingSettingsPanel from './ShoppingSettingsPanel'
import ShoppingAssistantPanel from './ShoppingAssistantPanel'

interface Props {
  list:     PersonalList
  onUpdate: (updated: PersonalList) => void
}

export default function ShoppingListView({ list, onUpdate }: Props) {
  const { t } = useTranslation()

  const settings = list.shoppingSettings ?? {
    enableSmartSuggestions: true,
    occasionalIntervalDays: 30,
    groupByDepartment:      true,
    showBoughtSection:      true,
  }

  const [dialogOpen,   setDialogOpen]   = useState(false)
  const [editItem,     setEditItem]     = useState<ShoppingItem | null>(null)
  const [detailItem,   setDetailItem]   = useState<ShoppingItem | null>(null)
  const [clearing,     setClearing]     = useState(false)

  const activeItems  = list.shoppingItems.filter((i) => i.isActive && !i.isBought)
  const boughtItems  = list.shoppingItems.filter((i) => i.isActive && i.isBought)

  // ── Helpers ───────────────────────────────────────────────────────────────

  function patchItems(updated: ShoppingItem) {
    onUpdate({
      ...list,
      shoppingItems: list.shoppingItems.map((i) => i.id === updated.id ? updated : i),
    })
  }

  function removeItem(id: string) {
    onUpdate({ ...list, shoppingItems: list.shoppingItems.filter((i) => i.id !== id) })
  }

  async function handleToggle(id: string) {
    const item = list.shoppingItems.find((i) => i.id === id)
    if (!item) return
    const updated = await listsApi.updateShoppingItem(id, { isBought: !item.isBought })
    patchItems(updated)
  }

  async function handleDelete(id: string) {
    await listsApi.deleteShoppingItem(id)
    removeItem(id)
  }

  function handleEdit(item: ShoppingItem) {
    setEditItem(item)
    setDialogOpen(true)
  }

  function handleDetail(item: ShoppingItem) {
    setDetailItem(item)
  }

  async function handleDialogSave(data: {
    title: string; quantity?: number; unit?: string; department: string; itemType: string;
    imageUrl?: string; preferredBrand?: string; alternativeBrands: string[]; noteForBuyer?: string
  }) {
    if (editItem) {
      const updated = await listsApi.updateShoppingItem(editItem.id, data)
      patchItems(updated)
    } else {
      const created = await listsApi.addShoppingItem(list.id, data)
      onUpdate({ ...list, shoppingItems: [...list.shoppingItems, created] })
    }
    setEditItem(null)
  }

  async function handleClearTrip() {
    setClearing(true)
    try {
      const updated = await listsApi.clearTrip(list.id)
      onUpdate(updated)
    } finally {
      setClearing(false)
    }
  }

  async function handleSettingsChange(patch: Partial<typeof settings>) {
    const merged = { ...settings, ...patch }
    const saved  = await listsApi.updateShoppingSettings(list.id, patch)
    onUpdate({ ...list, shoppingSettings: { ...merged, ...saved } })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  /** Group items by department */
  function groupByDept(items: ShoppingItem[]) {
    const map = new Map<string, ShoppingItem[]>()
    for (const item of items) {
      const key = item.department ?? ShoppingDepartment.Other
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }

  const grouped = settings.groupByDepartment
    ? groupByDept(activeItems)
    : new Map([['all', activeItems]])

  return (
    <Box sx={{ pb: 10 }}>

      {/* Settings panel */}
      <ShoppingSettingsPanel settings={settings} onChange={handleSettingsChange} />
      <Divider />

      {/* ── Active shopping list ── */}
      <Box sx={{ px: 0, pt: 1.5 }}>
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ px: 2, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', mb: 1 }}
        >
          {t('shopping.activeList')} ({activeItems.length})
        </Typography>

        {activeItems.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, mb: 2 }}>
            {t('shopping.emptyActive')}
          </Typography>
        )}

        {settings.groupByDepartment
          ? Array.from(grouped.entries()).map(([dept, items]) => (
              <ShoppingDepartmentSection
                key={dept}
                department={dept}
                items={items}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onDetail={handleDetail}
              />
            ))
          : activeItems.map((item, idx) => (
              <Box key={item.id}>
                <ShoppingItemRow
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onDetail={handleDetail}
                />
                {idx < activeItems.length - 1 && <Divider sx={{ ml: 5 }} />}
              </Box>
            ))
        }
      </Box>

      {/* ── Bought today ── */}
      {settings.showBoughtSection && boughtItems.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Divider />
          <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16, color: '#4CAF50' }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {t('shopping.boughtToday')} ({boughtItems.length})
              </Typography>
            </Box>
            <Tooltip title={t('shopping.clearTrip')}>
              <Button
                size="small"
                startIcon={<ReplayRoundedIcon />}
                onClick={handleClearTrip}
                disabled={clearing}
                color="inherit"
                sx={{ fontSize: 12 }}
              >
                {t('shopping.newTrip')}
              </Button>
            </Tooltip>
          </Box>
          {boughtItems.map((item, idx) => (
            <Box key={item.id}>
              <ShoppingItemRow
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onDetail={handleDetail}
              />
              {idx < boughtItems.length - 1 && <Divider sx={{ ml: 5 }} />}
            </Box>
          ))}
        </Box>
      )}

      {/* ── Smart Shopping Assistant ── */}
      <ShoppingAssistantPanel
        list={list}
        onItemAdded={(updated) => patchItems(updated)}
      />

      {/* ── FAB: add item ── */}
      <Fab
        color="primary"
        size="medium"
        onClick={() => { setEditItem(null); setDialogOpen(true) }}
        sx={{ position: 'fixed', bottom: 72, right: 20, zIndex: 10 }}
      >
        <AddRoundedIcon />
      </Fab>

      {/* ── Add/edit dialog ── */}
      <ShoppingItemDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null) }}
        onSave={handleDialogSave}
        initial={editItem}
      />

      {/* ── Product detail bottom sheet ── */}
      <ShoppingItemDetailSheet
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />
    </Box>
  )
}
