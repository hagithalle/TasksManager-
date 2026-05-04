import { Box, LinearProgress, Typography } from '@mui/material'

interface Props {
  done:  number
  total: number
  /** Height of the bar in px. Default 5 */
  height?: number
  /** Show the done/total label. Default true */
  showLabel?: boolean
}

/** Reusable mini progress bar for subtasks. Turns green when all done. */
export default function SubProgressBar({ done, total, height = 5, showLabel = true }: Props) {
  if (total === 0) return null

  const pct      = Math.round((done / total) * 100)
  const allDone  = done === total
  const barColor = allDone ? '#4CAF50' : '#7C5CFF'

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          flex: 1,
          borderRadius: 4,
          height,
          bgcolor: 'rgba(124,92,255,0.10)',
          '& .MuiLinearProgress-bar': {
            bgcolor: barColor,
            borderRadius: 4,
            transition: 'transform 0.4s ease',
          },
        }}
      />
      {showLabel && (
        <Typography
          variant="caption"
          fontWeight={allDone ? 700 : 400}
          sx={{ color: allDone ? '#4CAF50' : 'text.secondary', flexShrink: 0, minWidth: 28, textAlign: 'end' }}
        >
          {done}/{total}
        </Typography>
      )}
    </Box>
  )
}
