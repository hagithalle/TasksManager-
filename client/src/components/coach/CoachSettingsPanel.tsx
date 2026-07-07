import {
  Box, Collapse, Divider, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { CoachSettings } from '../../hooks/useFocusCoach'

interface Props {
  open:     boolean
  settings: CoachSettings
  onChange: (patch: Partial<CoachSettings>) => void
}

export default function CoachSettingsPanel({ open, settings, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <Collapse in={open}>
      <Divider sx={{ mx: 2 }} />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1.5 }}>
          {t('coach.settingsTitle')}
        </Typography>

        {/* Target time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, minWidth: 90 }}>
            {t('coach.targetTime')}
          </Typography>
          <TextField
            type="time"
            size="small"
            value={settings.targetTime}
            onChange={e => onChange({ targetTime: e.target.value })}
            inputProps={{ step: 300 }}
            sx={{ width: 110 }}
          />
        </Box>

        {/* Max tasks */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, minWidth: 90 }}>
            {t('coach.maxTasks', 'מקס׳ משימות')}
          </Typography>
          <TextField
            type="number"
            size="small"
            value={settings.maxTasks}
            onChange={e => onChange({ maxTasks: Math.max(1, Math.min(20, Number(e.target.value))) })}
            inputProps={{ min: 1, max: 20 }}
            sx={{ width: 80 }}
          />
        </Box>

        {/* Energy mode */}
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
            {t('coach.energyModeLabel', 'מצב אנרגיה')}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={settings.energyMode}
            onChange={(_, v) => v && onChange({ energyMode: v })}
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            <ToggleButton value="auto"      sx={{ px: 1, py: 0.25, fontSize: '0.7rem' }}>
              {t('coach.energyAuto', 'אוטומטי')}
            </ToggleButton>
            <ToggleButton value="morning"   sx={{ px: 1, py: 0.25, fontSize: '0.7rem' }}>
              {t('coach.energyMorning', '🌅 בוקר')}
            </ToggleButton>
            <ToggleButton value="afternoon" sx={{ px: 1, py: 0.25, fontSize: '0.7rem' }}>
              {t('coach.energyAfternoon', '☀️ צהריים')}
            </ToggleButton>
            <ToggleButton value="evening"   sx={{ px: 1, py: 0.25, fontSize: '0.7rem' }}>
              {t('coach.energyEvening', '🌙 ערב')}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
    </Collapse>
  )
}
