import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { TaskItem } from '../../types'

interface Props {
  progress:       number
  completedCount: number
  remaining:      number
  dailyTarget:    number
  tasks:          TaskItem[]
}

interface BannerConfig {
  emoji:          string
  bg:             string
  headlineKey:    string
  headlineParams: Record<string, unknown>
  tipKey:         string
}

function getBannerConfig(
  progress:       number,
  hour:           number,
  completedCount: number,
  remaining:      number,
  dailyTarget:    number,
): BannerConfig {
  if (progress >= 100)
    return {
      emoji: '🎉',
      bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      headlineKey: 'coach.insight.done',
      headlineParams: {},
      tipKey: 'coach.insight.doneTip',
    }
  if (progress >= 80)
    return {
      emoji: '⭐',
      bg: 'linear-gradient(135deg, #7c5cff 0%, #a78bfa 100%)',
      headlineKey: 'coach.insight.almostDone',
      headlineParams: { remaining },
      tipKey: 'coach.insight.almostDoneTip',
    }
  if (progress >= 50)
    return {
      emoji: '🔥',
      bg: 'linear-gradient(135deg, #ef4444 0%, #fb923c 100%)',
      headlineKey: 'coach.insight.halfway',
      headlineParams: { done: completedCount, total: dailyTarget },
      tipKey: 'coach.insight.halfwayTip',
    }
  if (progress >= 15)
    return {
      emoji: '🚀',
      bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      headlineKey: 'coach.insight.started',
      headlineParams: { done: completedCount, total: dailyTarget },
      tipKey: 'coach.insight.startedTip',
    }
  if (hour < 12)
    return {
      emoji: '🌅',
      bg: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
      headlineKey: 'coach.insight.morning',
      headlineParams: { count: dailyTarget },
      tipKey: 'coach.insight.morningTip',
    }
  if (hour < 17)
    return {
      emoji: '☀️',
      bg: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
      headlineKey: 'coach.insight.afternoon',
      headlineParams: { count: remaining || dailyTarget },
      tipKey: 'coach.insight.afternoonTip',
    }
  return {
    emoji: '🌙',
    bg: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
    headlineKey: 'coach.insight.evening',
    headlineParams: { count: remaining || dailyTarget },
    tipKey: 'coach.insight.eveningTip',
  }
}

/**
 * Derive a pattern insight from historical completedAt timestamps.
 * Returns a key + params once 5+ completions exist; null otherwise.
 */
function usePatternInsight(tasks: TaskItem[]): { key: string; params: Record<string, unknown> } | null {
  return useMemo(() => {
    const withTs = tasks.filter(t => t.completedAt)
    if (withTs.length < 5) return null

    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const recent = withTs.filter(t => new Date(t.completedAt!) >= monthAgo)
    if (recent.length < 5) return null

    // Bucket into morning / afternoon / evening
    const buckets = [0, 0, 0]
    recent.forEach(t => {
      const h = new Date(t.completedAt!).getHours()
      if (h < 12) buckets[0]++
      else if (h < 17) buckets[1]++
      else buckets[2]++
    })
    const best = buckets.indexOf(Math.max(...buckets))
    const bucketKey = (['morning', 'afternoon', 'evening'] as const)[best]
    return { key: `coach.pattern.${bucketKey}`, params: { count: recent.length } }
  }, [tasks])
}

export default function DailyInsightBanner({
  progress,
  completedCount,
  remaining,
  dailyTarget,
  tasks,
}: Props) {
  const { t }  = useTranslation()
  const hour   = new Date().getHours()
  const config = getBannerConfig(progress, hour, completedCount, remaining, dailyTarget)
  const pattern = usePatternInsight(tasks)

  return (
    <Box
      sx={{
        background:   config.bg,
        borderRadius: '12px 12px 0 0',
        px: 2,
        py: 1.5,
        display:     'flex',
        alignItems:  'center',
        gap:          1.5,
      }}
    >
      {/* Emoji */}
      <Typography sx={{ fontSize: 30, lineHeight: 1, flexShrink: 0 }}>
        {config.emoji}
      </Typography>

      {/* Text */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={800} color="white" sx={{ lineHeight: 1.25 }}>
          {t(config.headlineKey, config.headlineParams)}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.3, display: 'block', mt: 0.3 }}
        >
          {pattern ? t(pattern.key, pattern.params) : t(config.tipKey)}
        </Typography>
      </Box>
    </Box>
  )
}
