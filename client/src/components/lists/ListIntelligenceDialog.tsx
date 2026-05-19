import { useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog,
  DialogContent, DialogTitle, Divider, IconButton,
  Typography,
} from '@mui/material'
import CloseRoundedIcon       from '@mui/icons-material/CloseRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded'
import AddRoundedIcon         from '@mui/icons-material/AddRounded'
import CheckRoundedIcon       from '@mui/icons-material/CheckRounded'
import { useTranslation }     from 'react-i18next'
import { aiApi }              from '../../api/aiApi'
import { computeRecurringItems } from '../../api/aiApi'
import type { AiListIntelligenceResponse, AiListCategory } from '../../api/aiApi'
import type { PersonalList }  from '../../types'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  lists:   PersonalList[]
  /** If provided, allows adding suggested items to a specific list */
  onAddItemsToList?: (items: string[]) => void
  currentListTitle?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ListIntelligenceDialog({ open, onClose, lists, onAddItemsToList, currentListTitle }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('he') ? 'he' : 'en'

  const [loading, setLoading]    = useState(false)
  const [result,  setResult]     = useState<AiListIntelligenceResponse | null>(null)
  const [error,   setError]      = useState<string | null>(null)
  const [added,   setAdded]      = useState<Set<string>>(new Set())

  const hasSufficientData = lists.length >= 2

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await aiApi.analyzeLists(lists, lang)
      setResult(res)
    } catch {
      setError(t('ai.lists.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = (item: string) => {
    setAdded(prev => new Set([...prev, item]))
    onAddItemsToList?.([item])
  }

  const handleAddCategory = (items: string[]) => {
    const newItems = items.filter(i => !added.has(i))
    setAdded(prev => new Set([...prev, ...newItems]))
    onAddItemsToList?.(newItems)
  }

  const handleClose = () => {
    setResult(null)
    setError(null)
    setAdded(new Set())
    onClose()
  }

  // Quick client-side preview of recurring items (no AI needed)
  const recurringPreview = computeRecurringItems(lists).slice(0, 8)

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 4, maxHeight: '92vh' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCartRoundedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="h6" fontWeight={800} sx={{ flex: 1, fontSize: '1rem' }}>
            {t('ai.lists.title')}
          </Typography>
          <IconButton size="small" onClick={handleClose}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {t('ai.lists.subtitle', { count: lists.length })}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>

        {!hasSufficientData && (
          <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
            {t('ai.lists.needMoreLists')}
          </Alert>
        )}

        {/* ── Quick preview (always shown if data exists) ── */}
        {recurringPreview.length > 0 && !result && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
              {t('ai.lists.recurringPreview')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {recurringPreview.map(item => (
                <Chip
                  key={item.title}
                  label={`${item.title} ×${item.occurrences}`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(124,92,255,0.08)',
                    color: 'primary.main',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    border: '1px solid rgba(124,92,255,0.15)',
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* ── Analyze button ── */}
        {!result && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: hasSufficientData ? 2 : 0, gap: 2 }}>
            {hasSufficientData && recurringPreview.length === 0 && (
              <Typography sx={{ fontSize: 48 }}>🛒</Typography>
            )}
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 300 }}>
              {t('ai.lists.description')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeRoundedIcon />}
              onClick={handleAnalyze}
              disabled={!hasSufficientData}
              sx={{ borderRadius: 3, fontWeight: 700, px: 3 }}
            >
              {t('ai.lists.analyzeBtn')}
            </Button>
          </Box>
        )}

        {/* ── Loading ── */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, gap: 2 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">{t('ai.lists.analyzing')}</Typography>
          </Box>
        )}

        {/* ── Error ── */}
        {error && (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography color="error.main" variant="body2" sx={{ mb: 2 }}>{error}</Typography>
            <Button variant="outlined" onClick={handleAnalyze} size="small">{t('common.retry', 'Retry')}</Button>
          </Box>
        )}

        {/* ── Results ── */}
        {result && (
          <Box>
            {/* Overall message */}
            <Box sx={{ p: 1.75, borderRadius: 3, mb: 2, bgcolor: '#EDE9FF', border: '1.5px solid rgba(124,92,255,0.2)' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0, mt: 0.2 }} />
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.6 }}>
                  {result.overallMessage}
                </Typography>
              </Box>
              {result.shoppingPattern && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  📊 {result.shoppingPattern}
                </Typography>
              )}
            </Box>

            {/* Weekly staples */}
            {(result.weeklyStaples ?? []).length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
                  🔁 {t('ai.lists.weeklyStaples')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {(result.weeklyStaples ?? []).map(item => (
                    <ItemChip key={item} title={item} added={added.has(item)} canAdd={!!onAddItemsToList} onAdd={() => handleAddItem(item)} />
                  ))}
                </Box>
              </Box>
            )}

            {/* Might need soon */}
            {(result.mightNeedSoon ?? []).length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>
                  ⏰ {t('ai.lists.mightNeedSoon')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {(result.mightNeedSoon ?? []).map(item => (
                    <ItemChip key={item} title={item} added={added.has(item)} canAdd={!!onAddItemsToList} onAdd={() => handleAddItem(item)} />
                  ))}
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Smart template by category */}
            {(result.smartTemplate ?? []).length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                  📋 {t('ai.lists.smartTemplate')}
                  {currentListTitle && (
                    <Typography component="span" variant="caption" color="primary.main" sx={{ ml: 1, fontWeight: 600 }}>
                      → {currentListTitle}
                    </Typography>
                  )}
                </Typography>

                {(result.smartTemplate ?? []).map((cat: AiListCategory) => {
                  const allAdded = cat.items.every(i => added.has(i))
                  return (
                    <Box key={cat.name} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{cat.emoji}</span> {cat.name}
                        </Typography>
                        {onAddItemsToList && (
                          <Button
                            size="small"
                            disabled={allAdded}
                            onClick={() => handleAddCategory(cat.items)}
                            startIcon={allAdded ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : <AddRoundedIcon sx={{ fontSize: 14 }} />}
                            sx={{ fontSize: '0.62rem', height: 22, borderRadius: 1.5 }}
                          >
                            {allAdded ? t('ai.lists.allAdded') : t('ai.lists.addAll')}
                          </Button>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(cat.items ?? []).map(item => (
                          <ItemChip key={item} title={item} added={added.has(item)} canAdd={!!onAddItemsToList} onAdd={() => handleAddItem(item)} />
                        ))}
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )}

            {/* Re-analyze */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button size="small" startIcon={<AutoAwesomeRoundedIcon />} onClick={handleAnalyze} sx={{ fontSize: '0.75rem', color: 'primary.main' }}>
                {t('ai.lists.reanalyze')}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── ItemChip ──────────────────────────────────────────────────────────────────

function ItemChip({ title, added, canAdd, onAdd }: { title: string; added: boolean; canAdd: boolean; onAdd: () => void }) {
  return (
    <Chip
      label={title}
      size="small"
      onClick={canAdd && !added ? onAdd : undefined}
      icon={added ? <CheckRoundedIcon sx={{ fontSize: '12px !important', color: '#4CAF50 !important' }} /> : (canAdd ? <AddRoundedIcon sx={{ fontSize: '12px !important' }} /> : undefined)}
      sx={{
        fontSize: '0.72rem',
        height: 24,
        cursor: canAdd && !added ? 'pointer' : 'default',
        bgcolor: added ? '#E8F5E9' : 'rgba(124,92,255,0.07)',
        color: added ? '#2E7D32' : 'text.primary',
        border: `1px solid ${added ? '#C8E6C9' : 'rgba(124,92,255,0.2)'}`,
        fontWeight: 500,
        transition: 'all 0.15s',
        '&:hover': canAdd && !added ? { bgcolor: 'rgba(124,92,255,0.14)', transform: 'translateY(-1px)' } : {},
      }}
    />
  )
}
