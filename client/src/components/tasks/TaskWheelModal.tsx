import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Button, Checkbox, Collapse, Dialog, DialogContent, DialogTitle,
  Divider, FormControlLabel, IconButton, List, ListItem, ListItemText,
  Switch, Tooltip, Typography,
} from '@mui/material'
import CloseRoundedIcon      from '@mui/icons-material/CloseRounded'
import CasinoRoundedIcon     from '@mui/icons-material/CasinoRounded'
import TuneRoundedIcon       from '@mui/icons-material/TuneRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import { useTranslation }    from 'react-i18next'
import { useNavigate }       from 'react-router-dom'
import { Difficulty, ExecutionType } from '../../types'
import type { TaskItem } from '../../types'

// ─── Local types ──────────────────────────────────────────────────────────────

interface WheelItem {
  id:           string
  title:        string
  isSubtask:    boolean
  parentId:     string
  parentTitle?: string
  duration?:    number
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const WHEEL_COLORS = [
  '#7C5CFF', '#FF6B9D', '#4ECDC4', '#F6AD55',
  '#68D391', '#FC8181', '#76E4F7', '#B794F4',
]

const MAX_SEGMENTS = 8

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function sectorPath(cx: number, cy: number, r: number, a1: number, a2: number) {
  const s  = polar(cx, cy, r, a1)
  const e  = polar(cx, cy, r, a2)
  const lg = a2 - a1 > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${lg} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`
}

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  tasks:   TaskItem[]
}

export default function TaskWheelModal({ open, onClose, tasks }: Props) {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const [includeSubtasks, setIncludeSubtasks] = useState(false)
  const [rotation,        setRotation]        = useState(0)
  const [spinning,        setSpinning]        = useState(false)
  const [selected,        setSelected]        = useState<WheelItem | null>(null)
  const [showResult,      setShowResult]      = useState(false)
  const [manageOpen,      setManageOpen]      = useState(false)
  // null = auto mode (use defaults), Set<string> = manual selection of task ids
  const [manualIds,       setManualIds]       = useState<Set<string> | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // All incomplete tasks for manual selection list
  const allIncomplete = useMemo(
    () => tasks.filter((tk) => !tk.isCompleted),
    [tasks],
  )

  // Auto-eligible: Quick OR Short execution, or Easy difficulty
  const autoEligibleIds = useMemo(() => new Set(
    allIncomplete
      .filter((tk) =>
        tk.executionType === ExecutionType.Quick ||
        tk.executionType === ExecutionType.Short ||
        tk.difficulty    === Difficulty.Easy,
      )
      .map((tk) => tk.id),
  ), [allIncomplete])

  // On open: reset spin state; init manualIds from auto-eligible if first open
  useEffect(() => {
    if (open) {
      setSelected(null)
      setShowResult(false)
      setSpinning(false)
      if (manualIds === null) {
        setManualIds(new Set(autoEligibleIds))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Active set of task ids for the wheel
  const activeIds = manualIds ?? autoEligibleIds

  // ── Build eligible list ──────────────────────────────────────────────────
  const eligible = useMemo<WheelItem[]>(() => {
    const items: WheelItem[] = []

    for (const tk of allIncomplete) {
      if (!activeIds.has(tk.id)) continue

      items.push({
        id:        tk.id,
        title:     tk.title,
        isSubtask: false,
        parentId:  tk.id,
        duration:  tk.durationMinutes,
      })

      if (includeSubtasks) {
        for (const sub of tk.subTasks ?? []) {
          if (!sub.isCompleted) {
            items.push({
              id:          sub.id,
              title:       sub.title,
              isSubtask:   true,
              parentId:    tk.id,
              parentTitle: tk.title,
            })
          }
        }
      }
    }

    return items
  }, [allIncomplete, activeIds, includeSubtasks])

  const display = useMemo(() => eligible.slice(0, MAX_SEGMENTS), [eligible])

  // ── Toggle task in manual selection ─────────────────────────────────────
  const toggleTask = (id: string) => {
    setManualIds((prev) => {
      const base = prev ?? new Set(autoEligibleIds)
      const next = new Set(base)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setShowResult(false)
  }

  const selectAll = () => {
    setManualIds(new Set(allIncomplete.map((t) => t.id)))
    setShowResult(false)
  }

  const clearAll = () => {
    setManualIds(new Set())
    setShowResult(false)
  }

  // ── Spin ────────────────────────────────────────────────────────────────
  const spin = useCallback(() => {
    if (spinning || display.length === 0) return
    if (timerRef.current) clearTimeout(timerRef.current)

    const idx       = Math.floor(Math.random() * display.length)
    const segAngle  = 360 / display.length
    const targetMod = ((360 - (idx + 0.5) * segAngle) % 360 + 360) % 360
    const curMod    = ((rotation % 360) + 360) % 360
    const diff      = (targetMod - curMod + 360) % 360
    const newRot    = rotation + 1800 + diff   // 5 full turns + fine alignment

    setShowResult(false)
    setSelected(display[idx])
    setSpinning(true)
    setRotation(newRot)

    timerRef.current = setTimeout(() => {
      setSpinning(false)
      setShowResult(true)
    }, 3500)
  }, [spinning, display, rotation])

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSpinning(false)
    setShowResult(false)
    setSelected(null)
    onClose()
  }

  const segAngle = display.length > 0 ? 360 / display.length : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 4, pb: 2 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2.5, pb: 1 }}>
        <Typography fontWeight={700} fontSize="1rem">🎡 {t('wheel.cardTitle')}</Typography>
        <IconButton size="small" onClick={handleClose} edge="end">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0, overflow: 'hidden' }}>

        {/* Subtasks toggle + manage button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={includeSubtasks}
                onChange={(e) => { setIncludeSubtasks(e.target.checked); setShowResult(false) }}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                {t('wheel.includeSubtasks')}
              </Typography>
            }
          />
          <Tooltip title={t('wheel.manageTasks')}>
            <IconButton size="small" onClick={() => setManageOpen((v) => !v)} color={manageOpen ? 'primary' : 'default'}>
              <TuneRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── Manage panel ── */}
        <Collapse in={manageOpen}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 1.5, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 0.75, bgcolor: 'action.hover' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                {t('wheel.manageTasks')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button size="small" variant="text" sx={{ fontSize: '0.65rem', minWidth: 0, py: 0, px: 0.75 }} onClick={selectAll}>
                  {t('wheel.selectAll')}
                </Button>
                <Button size="small" variant="text" color="error" sx={{ fontSize: '0.65rem', minWidth: 0, py: 0, px: 0.75 }} onClick={clearAll}>
                  {t('wheel.clearAll')}
                </Button>
              </Box>
            </Box>
            <Divider />
            <List dense disablePadding sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {allIncomplete.length === 0 ? (
                <ListItem><ListItemText secondary={t('wheel.noTasks')} /></ListItem>
              ) : allIncomplete.map((tk) => (
                <ListItem key={tk.id} disablePadding sx={{ px: 1 }}>
                  <FormControlLabel
                    sx={{ width: '100%', m: 0 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={activeIds.has(tk.id)}
                        onChange={() => toggleTask(tk.id)}
                        sx={{ py: 0.5 }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" noWrap sx={{ flex: 1 }}>{tk.title}</Typography>
                        {autoEligibleIds.has(tk.id) && (
                          <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.6rem', flexShrink: 0 }}>
                            ⚡
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Collapse>

        {display.length === 0 ? (

          /* No eligible tasks */
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 40, mb: 1 }}>🌀</Typography>
            <Typography variant="body2" color="text.secondary">{t('wheel.noTasks')}</Typography>
          </Box>

        ) : (
          <>
            {/* ── Wheel ── */}
            <Box sx={{ position: 'relative', width: 260, height: 260, mx: 'auto', mb: 0.5 }}>

              {/* Fixed pointer at the top */}
              <Box sx={{
                position: 'absolute', top: -6, left: '50%',
                transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft:     '9px solid transparent',
                borderRight:    '9px solid transparent',
                borderTop:      '18px solid',
                borderTopColor: 'text.primary',
                zIndex: 10,
              }} />

              {/* Rotating disc */}
              <Box sx={{
                width: '100%', height: '100%',
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? 'transform 3.5s cubic-bezier(0.25, 0.1, 0.12, 0.99)'
                  : 'none',
                transformOrigin: 'center',
              }}>
                <svg viewBox="0 0 300 300" width="260" height="260" style={{ display: 'block' }}>
                  {display.map((item, i) => {
                    const s   = i * segAngle
                    const e   = (i + 1) * segAngle
                    const mid = (i + 0.5) * segAngle
                    const tp  = polar(150, 150, 82, mid)
                    const col = WHEEL_COLORS[i % WHEEL_COLORS.length]

                    return (
                      <g key={item.id}>
                        {display.length === 1 ? (
                          <circle cx="150" cy="150" r="130" fill={col} />
                        ) : (
                          <path
                            d={sectorPath(150, 150, 130, s, e)}
                            fill={col}
                            stroke="white"
                            strokeWidth="1.5"
                          />
                        )}
                        <text
                          x={tp.x} y={tp.y}
                          fill="white"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${mid}, ${tp.x}, ${tp.y})`}
                          style={{ userSelect: 'none', pointerEvents: 'none' }}
                        >
                          {trunc(item.title, 9)}
                        </text>
                      </g>
                    )
                  })}

                  {/* Hub */}
                  <circle cx="150" cy="150" r="18" fill="white" stroke="#E0E0E0" strokeWidth="2.5" />
                  <circle cx="150" cy="150" r="8"  fill="#7C5CFF" />
                </svg>
              </Box>
            </Box>

            {/* Spin button */}
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Button
                variant="contained"
                size="large"
                onClick={spin}
                disabled={spinning}
                startIcon={<CasinoRoundedIcon />}
                sx={{ borderRadius: 3, px: 4, fontWeight: 700 }}
              >
                {spinning ? t('wheel.spinning') : t('wheel.spin')}
              </Button>
            </Box>

            {/* Result card */}
            {showResult && selected && (
              <Box sx={{
                mt: 2.5, p: 2, borderRadius: 3,
                border: '1.5px solid rgba(124,92,255,0.25)',
                bgcolor: 'rgba(124,92,255,0.05)',
                textAlign: 'center',
              }}>
                <Typography
                  variant="caption" fontWeight={700} color="primary.main"
                  sx={{ letterSpacing: 0.4, textTransform: 'uppercase' }}
                >
                  {t('wheel.result')}
                </Typography>

                <Typography variant="body1" fontWeight={700} sx={{ mt: 0.75, lineHeight: 1.4 }}>
                  {selected.title}
                </Typography>

                {selected.isSubtask && selected.parentTitle && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    ↳ {selected.parentTitle}
                  </Typography>
                )}

                {!selected.isSubtask && selected.duration != null && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {selected.duration} {t('task.minutesShort')}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained" size="small"
                    onClick={() => { handleClose(); navigate('/tasks') }}
                    sx={{ borderRadius: 2.5, fontWeight: 700 }}
                  >
                    {t('wheel.startNow')}
                  </Button>
                  <Button
                    variant="outlined" size="small"
                    onClick={spin}
                    sx={{ borderRadius: 2.5 }}
                  >
                    {t('wheel.pickAnother')}
                  </Button>
                  <Button
                    variant="text" size="small"
                    onClick={handleClose}
                    sx={{ borderRadius: 2.5 }}
                  >
                    {t('wheel.close')}
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
