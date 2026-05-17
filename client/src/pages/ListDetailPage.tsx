import {
  Box, CircularProgress, Divider, IconButton, InputBase,
  LinearProgress, List, Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listsApi } from '../api'
import type { PersonalList } from '../types'
import ListItemRow from '../components/lists/ListItemRow'

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t }  = useTranslation()

  const [list,    setList]    = useState<PersonalList | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding,   setAdding]   = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    listsApi
      .getById(id)
      .then(setList)
      .finally(() => setLoading(false))
  }, [id])

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

  const items   = list.items
  const total   = items.length
  const done    = items.filter((i) => i.isCompleted).length
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

  async function commitAdd() {
    const title = newTitle.trim()
    setNewTitle('')
    setAdding(false)
    if (!title || !id) return
    const newItem = await listsApi.addItem(id, { title })
    setList((prev) => prev ? { ...prev, items: [...prev.items, newItem] } : prev)
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ pb: 4 }}>

      {/* ── Hero header ── */}
      <Box
        sx={{
          px: 2, pt: 3, pb: 2.5,
          background: 'linear-gradient(135deg, #EDE9FF 0%, #F3E5F5 100%)',
        }}
      >
        {/* Emoji + title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 56, height: 56, borderRadius: '50%',
              bgcolor: allDone ? '#E8F5E9' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(124,92,255,0.12)',
              transition: 'background-color 0.3s',
            }}
          >
            {list.emoji ?? '📋'}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h3" fontWeight={700} noWrap>
              {list.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('list.items', { count: total })}
            </Typography>
          </Box>
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

      {/* ── Items list ── */}
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
              gap: 0.75,
              mt: 1.5,
              px: 1,
              py: 0.75,
              borderRadius: 2,
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <IconButton size="small" sx={{ p: 0, color: 'primary.main' }} tabIndex={-1}>
              <AddRoundedIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" fontWeight={600} color="primary.main">
              {t('list.addItem')}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
