import {
  Box, Checkbox, Collapse, Divider, FormControlLabel,
  TextField, Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { CoachSettings } from '../../hooks/useFocusCoach'

interface Props {
  open:        boolean
  settings:    CoachSettings
  onChange:    (patch: Partial<CoachSettings>) => void
}

const FILTER_KEYS: Array<{ key: keyof CoachSettings; i18n: string }> = [
  { key: 'includeBeforeTargetTime', i18n: 'coach.filterBeforeTime' },
  { key: 'includeUrgent',           i18n: 'coach.filterUrgent'     },
  { key: 'includeFrog',             i18n: 'coach.filterFrog'       },
  { key: 'includeTwoMin',           i18n: 'coach.filterTwoMin'     },
  { key: 'includeEasy',             i18n: 'coach.filterEasy'       },
]

export default function CoachSettingsPanel({ open, settings, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <Collapse in={open}>
      <Divider sx={{ mx: 2 }} />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
          {t('coach.settingsTitle')}
        </Typography>

        {/* Target time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
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

        {/* Filter checkboxes */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {FILTER_KEYS.map(({ key, i18n: label }) => (
            <FormControlLabel
              key={key}
              control={
                <Checkbox
                  size="small"
                  checked={settings[key] as boolean}
                  onChange={e => onChange({ [key]: e.target.checked })}
                  sx={{ py: 0.25 }}
                />
              }
              label={
                <Typography variant="body2">{t(label)}</Typography>
              }
              sx={{ m: 0 }}
            />
          ))}
        </Box>
      </Box>
    </Collapse>
  )
}
