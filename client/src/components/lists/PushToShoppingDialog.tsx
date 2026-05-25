import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, Typography,
  List, ListItem, ListItemIcon, ListItemText, Checkbox, Chip, Box,
  CircularProgress,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { PersonalList, SuggestedShoppingItem } from '../../types'
import { ListType } from '../../types/enums'
import { listsApi } from '../../api/listsApi'

interface Props {
  open: boolean
  cookingListId: string
  allLists: PersonalList[]
  onClose: () => void
  onDone: () => void
}

export default function PushToShoppingDialog({
  open, cookingListId, allLists, onClose, onDone,
}: Props) {
  const { t } = useTranslation()

  const shoppingLists = allLists.filter(l => l.listType === ListType.Shopping)
  const [shoppingListId, setShoppingListId] = useState(shoppingLists[0]?.id ?? '')
  const [items, setItems]                   = useState<SuggestedShoppingItem[]>([])
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [loading, setLoading]               = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  // Fetch extracted ingredients whenever dialog opens or shopping list changes
  useEffect(() => {
    if (!open || !shoppingListId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    listsApi.extractIngredients(cookingListId, shoppingListId)
      .then(result => {
        if (cancelled) return
        setItems(result.items)
        // Pre-select everything not already on the list
        setSelected(new Set(result.items.filter(i => !i.isAlreadyOnList).map(i => i.title.toLowerCase())))
      })
      .catch(() => {
        if (!cancelled) setError(t('cooking.extractError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, cookingListId, shoppingListId])

  function toggleItem(title: string) {
    const key = title.toLowerCase()
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handlePush() {
    const chosenItems = items.filter(i => selected.has(i.title.toLowerCase()))
    if (!chosenItems.length) return
    setSaving(true)
    try {
      await listsApi.pushToShopping(cookingListId, { shoppingListId, items: chosenItems })
      onDone()
      onClose()
    } catch {
      setError(t('cooking.pushError'))
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = items.filter(i => selected.has(i.title.toLowerCase())).length

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('cooking.pushToShopping')}</DialogTitle>

      <DialogContent>
        {/* Shopping list selector */}
        <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
          <InputLabel>{t('cooking.chooseShoppingList')}</InputLabel>
          <Select
            value={shoppingListId}
            label={t('cooking.chooseShoppingList')}
            onChange={e => setShoppingListId(e.target.value)}
          >
            {shoppingLists.map(l => (
              <MenuItem key={l.id} value={l.id}>
                {l.emoji ? `${l.emoji} ` : ''}{l.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {error && (
          <Typography color="error" variant="body2">{error}</Typography>
        )}

        {!loading && !error && items.length === 0 && (
          <Typography color="text.secondary" variant="body2">
            {t('cooking.noIngredientsFound')}
          </Typography>
        )}

        {!loading && items.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {t('cooking.selectToAdd')}
            </Typography>
            <List dense disablePadding>
              {items.map(item => {
                const key = item.title.toLowerCase()
                const checked = selected.has(key)
                return (
                  <ListItem
                    key={item.title}
                    disablePadding
                    sx={{ py: 0.5 }}
                    onClick={() => !item.isAlreadyOnList && toggleItem(item.title)}
                    style={{ cursor: item.isAlreadyOnList ? 'default' : 'pointer' }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        checked={checked}
                        disabled={item.isAlreadyOnList}
                        size="small"
                        onChange={() => toggleItem(item.title)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{item.title}</span>
                          {item.quantity && (
                            <Typography variant="caption" color="text.secondary">
                              {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                            </Typography>
                          )}
                          {item.isAlreadyOnList && (
                            <Chip
                              label={t('cooking.alreadyOnList')}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                )
              })}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{t('common.cancel', 'Cancel')}</Button>
        <Button
          variant="contained"
          onClick={handlePush}
          disabled={saving || selectedCount === 0}
        >
          {t('cooking.addSelected', { count: selectedCount })}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
