import {
  Box, Collapse, Divider, FormControlLabel, IconButton,
  Switch, TextField, Typography,
} from '@mui/material'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShoppingListSettings } from '../../types'

interface Props {
  settings: ShoppingListSettings
  onChange: (patch: Partial<ShoppingListSettings>) => void
}

export default function ShoppingSettingsPanel({ settings, onChange }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Box sx={{ mb: 1 }}>
      {/* Toggle row */}
      <Box
        onClick={() => setOpen((p) => !p)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 0.75,
          cursor: 'pointer',
          borderRadius: 2,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' },
        }}
      >
        <SettingsRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ flex: 1, letterSpacing: 0.3 }}>
          {t('shopping.settings')}
        </Typography>
        <IconButton
          size="small"
          disableRipple
          sx={{
            p: 0,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
          }}
        >
          <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
        </IconButton>
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 2, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Divider sx={{ mb: 1 }} />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={settings.enableSmartSuggestions}
                onChange={(e) => onChange({ enableSmartSuggestions: e.target.checked })}
              />
            }
            label={<Typography variant="body2">{t('shopping.enableSuggestions')}</Typography>}
          />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={settings.groupByDepartment}
                onChange={(e) => onChange({ groupByDepartment: e.target.checked })}
              />
            }
            label={<Typography variant="body2">{t('shopping.groupByDept')}</Typography>}
          />

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={settings.showBoughtSection}
                onChange={(e) => onChange({ showBoughtSection: e.target.checked })}
              />
            }
            label={<Typography variant="body2">{t('shopping.showBoughtSection')}</Typography>}
          />

          {settings.enableSmartSuggestions && (
            <Box sx={{ mt: 0.5 }}>
              <TextField
                label={t('shopping.occasionalInterval')}
                type="number"
                size="small"
                value={settings.occasionalIntervalDays}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v) && v > 0) onChange({ occasionalIntervalDays: v })
                }}
                inputProps={{ min: 1, max: 365 }}
                helperText={t('shopping.occasionalIntervalHint')}
                sx={{ width: 180 }}
              />
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}
