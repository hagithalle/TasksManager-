import { useState } from 'react'
import { Box, Typography, Button, CircularProgress, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import { aiApi } from '../../api/aiApi'
import type { Goal } from '../../types/goal'
import { tasksApi } from '../../api'
import { Priority, ExecutionType } from '../../types/enums'

// ── localStorage cache helpers ─────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10)

function suggestionKey(goalId: string)  { return `goalSuggestion-${goalId}-${today()}` }
function dismissedKey(goalId: string)   { return `goalSuggestionDismissed-${goalId}-${today()}` }
const countKey = () => `goalSuggestionCount-${today()}`

export function isSuggestionDismissed(goalId: string): boolean {
  try { return localStorage.getItem(dismissedKey(goalId)) === '1' } catch { return false }
}

export function getSuggestionCount(): number {
  try { return parseInt(localStorage.getItem(countKey()) ?? '0', 10) } catch { return 0 }
}

function getCachedSuggestion(goalId: string): string | null {
  try { return localStorage.getItem(suggestionKey(goalId)) } catch { return null }
}

function cacheSuggestion(goalId: string, suggestion: string): void {
  try {
    localStorage.setItem(suggestionKey(goalId), suggestion)
    const count = getSuggestionCount() + 1
    localStorage.setItem(countKey(), String(count))
  } catch { /* ignore */ }
}

function dismiss(goalId: string): void {
  try { localStorage.setItem(dismissedKey(goalId), '1') } catch { /* ignore */ }
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  goal:   Goal
  userId: string
  onAddedToToday?: (taskTitle: string) => void
}

export default function GoalSuggestionCard({ goal, userId, onAddedToToday }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('he') ? 'he' : 'en'

  const [suggestion, setSuggestion] = useState<string | null>(() => getCachedSuggestion(goal.id))
  const [loading,    setLoading]    = useState(false)
  const [dismissed,  setDismissed]  = useState(false)
  const [added,      setAdded]      = useState(false)

  if (dismissed) return null

  async function load() {
    if (suggestion) return
    setLoading(true)
    try {
      const res = await aiApi.suggestGoalAction({
        goalId:          goal.id,
        goalTitle:       goal.title,
        goalDescription: goal.description,
        goalCategory:    goal.category,
        dueDate:         goal.dueDate,
        language:        lang,
      })
      cacheSuggestion(goal.id, res.suggestion)
      setSuggestion(res.suggestion)
    } catch {
      setSuggestion(t('coach.goalSuggestion.error', 'לא הצלחתי לייצר הצעה כעת'))
    } finally {
      setLoading(false)
    }
  }

  // Trigger load on first render if no cached suggestion
  if (!suggestion && !loading && !dismissed) {
    load()
  }

  async function handleAddToToday() {
    if (!suggestion) return
    try {
      await tasksApi.create({
        userId,
        title:         suggestion,
        priority:      Priority.Medium,
        executionType: ExecutionType.Short,
        goalId:        goal.id,
        dueDate:       today(),
      })
      setAdded(true)
      onAddedToToday?.(suggestion)
    } catch { /* silent — user can retry */ }
  }

  function handleDismiss() {
    dismiss(goal.id)
    setDismissed(true)
  }

  return (
    <Box
      sx={{
        borderRadius: 2.5,
        border: '1.5px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: 1.5,
        position: 'relative',
      }}
    >
      {/* Dismiss button */}
      <IconButton
        size="small"
        onClick={handleDismiss}
        sx={{ position: 'absolute', top: 4, right: 4, opacity: 0.5 }}
        aria-label={t('common.dismiss', 'סגור')}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      {/* Header */}
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        🎯 {goal.title}
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
          <CircularProgress size={14} />
          <Typography variant="body2" color="text.secondary">
            {t('coach.goalSuggestion.loading', 'מייצר הצעה…')}
          </Typography>
        </Box>
      )}

      {suggestion && !loading && (
        <>
          <Typography variant="body2" sx={{ mt: 0.5, mb: 1, pr: 2 }}>
            {suggestion}
          </Typography>

          {added ? (
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              ✓ {t('coach.goalSuggestion.added', 'נוספה לרשימה')}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="contained"
                onClick={handleAddToToday}
                sx={{ borderRadius: 2, fontSize: '0.7rem', fontWeight: 700, py: 0.4 }}
              >
                {t('coach.goalSuggestion.addToToday', 'הוסף להיום')}
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={handleDismiss}
                sx={{ borderRadius: 2, fontSize: '0.7rem', color: 'text.secondary' }}
              >
                {t('coach.goalSuggestion.notToday', 'לא היום')}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
