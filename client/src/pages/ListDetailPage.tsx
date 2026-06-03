import {
  Box, CircularProgress, Divider, IconButton, InputBase,
  LinearProgress, List, Menu, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listsApi, goalsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import type { Goal, PersonalList, PersonalListItem } from '../types'
import { ListType } from '../types/enums'
import ListItemRow from '../components/lists/ListItemRow'
import AddTaskDialog from '../components/tasks/AddTaskDialog'
import ListIntelligenceDialog from '../components/lists/ListIntelligenceDialog'
import ShareViaDialog from '../components/lists/ShareViaDialog'
import ShoppingListView from '../components/lists/ShoppingListView'
import CookingPlanView from '../components/lists/CookingPlanView'
import { detectDepartment } from '../components/lists/ShoppingItemDialog'

// ─── constants ────────────────────────────────────────────────────────────────
const LIST_TYPE_EMOJI: Record<ListType, string> = {
  [ListType.Checklist]:   '✅',
  [ListType.Shopping]:    '🛒',
  [ListType.Notes]:       '📝',
  [ListType.Ideas]:       '💡',
  [ListType.Equipment]:   '🎒',
  [ListType.CookingPlan]: '🍳',
}
const LIST_TYPE_OPTIONS: { type: ListType; emoji: string }[] = [
  { type: ListType.Checklist,   emoji: '✅' },
  { type: ListType.Shopping,    emoji: '🛒' },
  { type: ListType.Notes,       emoji: '📝' },
  { type: ListType.Ideas,       emoji: '💡' },
  { type: ListType.Equipment,   emoji: '🎒' },
  { type: ListType.CookingPlan, emoji: '🍳' },
]

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t }  = useTranslation()
  const { user } = useAuth()

  const [list,       setList]       = useState<PersonalList | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [adding,     setAdding]     = useState(false)
  const [newTitle,   setNewTitle]   = useState('')
  const [convertItem, setConvertItem] = useState<PersonalListItem | null>(null)
  const [goals,      setGoals]      = useState<Goal[]>([])
  const [allLists,   setAllLists]   = useState<PersonalList[]>([])
  const [aiOpen,         setAiOpen]         = useState(false)
  const [shareViaOpen,   setShareViaOpen]   = useState(false)
  const [typeAnchor,     setTypeAnchor]     = useState<null | HTMLElement>(null)
  const [titleDraft,     setTitleDraft]     = useState('')
  const [editingTitle,   setEditingTitle]   = useState(false)
  const [customEmoji,    setCustomEmoji]    = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    listsApi.getByUser(user.id).then(setAllLists).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    listsApi
      .getById(id)
      .then((l) => { setList(l); setTitleDraft(l.title) })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!user) return
    goalsApi.getByUser(user.id).then(setGoals).catch(() => {})
  }, [user])

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!list) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('common.noData')}</Typography>
      </Box>
    )
  }

  const isShopping   = list.listType === ListType.Shopping
  const isCookingPlan = list.listType === ListType.CookingPlan
  const items   = list.items
  const total   = isShopping
    ? list.shoppingItems.filter((i) => i.isActive).length
    : items.length
  const done    = isShopping
    ? list.shoppingItems.filter((i) => i.isActive && i.isBought).length
    : items.filter((i) => i.isCompleted).length
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total

  // ── handlers ────────────────────────────────────────────────────────────────

  async function toggleItem(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const updated = await listsApi.updateItem(itemId, { isCompleted: !item.isCompleted })
    setList((prev) => prev ? {
      ...prev,
      items: prev.items.map((i) => i.id === itemId ? updated : i),
    } : prev)
  }

  async function deleteItem(itemId: string) {
    await listsApi.deleteItem(itemId)
    setList((prev) => prev ? {
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
    } : prev)
  }

  async function renameItem(itemId: string, title: string) {
    const updated = await listsApi.updateItem(itemId, { title })
    setList((prev) => prev ? {
      ...prev,
      items: prev.items.map((i) => i.id === itemId ? updated : i),
    } : prev)
  }

  function handleConvertToTask(item: PersonalListItem) {
    setConvertItem(item)
  }

  async function handleTaskCreated() {
    // When a task is created from a list item, do not remove the item from the list.
    // Keep the item and simply clear the convert state.
    setConvertItem(null)
  }

  async function commitAdd() {
    const title = newTitle.trim()
    setNewTitle('')
    setAdding(false)
    if (!title || !id) return
    const newItem = await listsApi.addItem(id, { title })
    setList((prev) => prev ? { ...prev, items: [...prev.items, newItem] } : prev)
  }

  async function changeListType(newType: ListType) {
    if (!list || !id) return
    setTypeAnchor(null)
    const updated = await listsApi.update(id, { listType: newType, emoji: LIST_TYPE_EMOJI[newType] })
    setList(updated)
  }

  async function saveTitle() {
    const trimmed = titleDraft.trim()
    setEditingTitle(false)
    if (!trimmed || trimmed === list?.title || !id) return
    const updated = await listsApi.update(id, { title: trimmed })
    setList(updated)
  }

  async function saveCustomEmoji() {
    const e = customEmoji.trim()
    setCustomEmoji('')
    setTypeAnchor(null)
    if (!e || !id) return
    const updated = await listsApi.update(id, { emoji: e })
    setList(updated)
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <>
    <Box sx={{ pb: 4 }}>

      {/* ── Hero header ── */}
      <Box
        sx={{
          px: 2, pt: 3, pb: 2.5,
          background: 'linear-gradient(135deg, #EDE9FF 0%, #F3E5F5 100%)',
        }}
      >
        {/* Emoji circle — click to change list type */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Tooltip title={t(`listType.${list.listType}`)}>
            <Box
              onClick={(e) => setTypeAnchor(e.currentTarget)}
              sx={{
                width: 56, height: 56, borderRadius: '50%',
                bgcolor: allDone ? '#E8F5E9' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(124,92,255,0.12)',
                transition: 'background-color 0.3s',
                cursor: 'pointer',
                '&:hover': { boxShadow: '0 2px 12px rgba(124,92,255,0.22)' },
              }}
            >
              {list.emoji ?? LIST_TYPE_EMOJI[list.listType]}
            </Box>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {editingTitle ? (
              <InputBase
                inputRef={titleRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  saveTitle()
                  if (e.key === 'Escape') { setTitleDraft(list.title); setEditingTitle(false) }
                }}
                fullWidth
                autoFocus
                sx={{
                  fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.2,
                  '& input': { p: 0 },
                }}
              />
            ) : (
              <Typography
                variant="h3"
                fontWeight={700}
                noWrap
                onClick={() => { setTitleDraft(list.title); setEditingTitle(true) }}
                sx={{ cursor: 'text', '&:hover': { color: 'primary.main' } }}
              >
                {list.title}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {t('list.items', { count: total })}
            </Typography>
          </Box>
          {/* AI button */}
          {allLists.length >= 2 && (
            <Tooltip title={t('ai.lists.analyzeBtn')}>
              <IconButton
                size="small"
                onClick={() => setAiOpen(true)}
                sx={{ bgcolor: 'rgba(124,92,255,0.08)', '&:hover': { bgcolor: 'rgba(124,92,255,0.15)' } }}
              >
                <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Share via Email button */}
          <Tooltip title={t('share.email', 'Email')}>
            <IconButton
              size="small"
              onClick={() => setShareViaOpen(true)}
              sx={{ bgcolor: 'rgba(124,92,255,0.08)', '&:hover': { bgcolor: 'rgba(124,92,255,0.15)' } }}
            >
              <EmailRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            </IconButton>
          </Tooltip>

          {/* Share via WhatsApp button */}
          <Tooltip title="WhatsApp">
            <IconButton
              size="small"
              onClick={() => setShareViaOpen(true)}
              sx={{ bgcolor: 'rgba(76,175,80,0.08)', '&:hover': { bgcolor: 'rgba(76,175,80,0.15)' } }}
            >
              <WhatsAppIcon sx={{ fontSize: 18, color: '#25D366' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Progress bar + label */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.4 }}>
            {t('list.progress', { done, total })}
          </Typography>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ color: allDone ? '#4CAF50' : 'primary.main' }}
          >
            {pct}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            borderRadius: 4,
            height: 7,
            bgcolor: allDone ? 'rgba(76,175,80,0.15)' : 'rgba(124,92,255,0.12)',
            '& .MuiLinearProgress-bar': {
              bgcolor: allDone ? '#4CAF50' : '#7C5CFF',
              borderRadius: 4,
              transition: 'transform 0.4s ease',
            },
          }}
        />
      </Box>

      {/* ── List type picker menu ── */}
      <Menu
        anchorEl={typeAnchor}
        open={Boolean(typeAnchor)}
        onClose={() => setTypeAnchor(null)}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 160 } }}
      >
        {LIST_TYPE_OPTIONS.map(({ type, emoji }) => (
          <MenuItem
            key={type}
            selected={list.listType === type}
            onClick={() => changeListType(type)}
            sx={{ gap: 1 }}
          >
            <span>{emoji}</span>
            {t(`listType.${type}`)}
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <Box sx={{ px: 1.5, pb: 1 }}>
          <TextField
            size="small"
            variant="outlined"
            placeholder={t('list.customEmoji')}
            value={customEmoji}
            onChange={(e) => setCustomEmoji(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveCustomEmoji()
              e.stopPropagation()
            }}
            inputProps={{ maxLength: 4 }}
            sx={{ width: 140, '& input': { fontSize: '1.2rem', textAlign: 'center' } }}
          />
        </Box>
      </Menu>

      {/* ── Items list — branch by list type ── */}
      {isShopping ? (
        <ShoppingListView list={list} onUpdate={setList} />
      ) : isCookingPlan ? (
        <Box sx={{ px: 2, pt: 2 }}>
          <CookingPlanView list={list} allLists={allLists} onListUpdated={setList} />
        </Box>
      ) : (
      <Box sx={{ px: 2, pt: 2 }}>
        {items.length === 0 && !adding ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            {t('list.noItems')}
          </Typography>
        ) : (
          <Box
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              boxShadow: '0 1px 6px rgba(124,92,255,0.06)',
            }}
          >
            <List disablePadding>
              {items.map((item, index) => (
                <Box key={item.id}>
                  {index > 0 && <Divider sx={{ ml: 5.5 }} />}
                  <ListItemRow
                    item={item}
                    onToggle={toggleItem}
                    onDelete={deleteItem}
                    onRename={renameItem}
                    onConvertToTask={handleConvertToTask}
                  />
                </Box>
              ))}
            </List>

            {/* ── Add item input ── */}
            {adding && (
              <>
                {items.length > 0 && <Divider sx={{ ml: 5.5 }} />}
                <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 0.75, gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid', borderColor: 'divider', flexShrink: 0 }} />
                  <InputBase
                    inputRef={inputRef}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')  commitAdd()
                      if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
                    }}
                    onBlur={commitAdd}
                    placeholder={t('list.itemPlaceholder')}
                    fullWidth
                    sx={{ fontSize: '0.875rem', color: 'text.primary' }}
                  />
                </Box>
              </>
            )}
          </Box>
        )}

        {/* ── Add item trigger ── */}
        {!adding && (
          <Box
            onClick={() => setAdding(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              mt: 1.5,
              mx: 1,
              px: 2,
              py: 1.1,
              borderRadius: 2.5,
              cursor: 'pointer',
              border: '1.5px dashed',
              borderColor: 'rgba(124,92,255,0.35)',
              bgcolor: 'rgba(124,92,255,0.04)',
              color: 'primary.main',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: 'rgba(124,92,255,0.1)',
                borderColor: 'primary.main',
              },
            }}
          >
            <AddRoundedIcon sx={{ fontSize: 18 }} />
            <Typography variant="body2" fontWeight={600} color="primary.main">
              {t('list.addItem')}
            </Typography>
          </Box>
        )}
      </Box>
      )} {/* end non-shopping branch */}
    </Box>

    {/* ── Convert item to task dialog ── */}
    <AddTaskDialog
      open={!!convertItem}
      onClose={() => setConvertItem(null)}
      onAdd={handleTaskCreated}
      goals={goals}
      userId={user?.id ?? ''}
      defaultTitle={convertItem?.title ?? ''}
    />

    {/* ── List Intelligence dialog ── */}
    <ListIntelligenceDialog
      open={aiOpen}
      onClose={() => setAiOpen(false)}
      lists={isShopping
        ? allLists.filter((l) => l.listType === ListType.Shopping)
        : allLists}
      currentListTitle={list?.title}
      onAddItemsToList={async (items) => {
        if (!id) return
        if (isShopping) {
          for (const title of items) {
            const dept = detectDepartment(title) ?? 'other'
            const newItem = await listsApi.addShoppingItem(id, {
              title,
              department: dept,
              itemType: 'regular',
            }).catch(() => null)
            if (newItem) setList(prev => prev ? { ...prev, shoppingItems: [...prev.shoppingItems, newItem] } : prev)
          }
        } else {
          for (const title of items) {
            const newItem = await listsApi.addItem(id, { title }).catch(() => null)
            if (newItem) setList(prev => prev ? { ...prev, items: [...prev.items, newItem] } : prev)
          }
        }
      }}
    />

    {/* ── Share via dialog ── */}
    {list && (
      <ShareViaDialog
        open={shareViaOpen}
        onClose={() => setShareViaOpen(false)}
        list={list}
      />
    )}
    </>
  )
}
