import { useState, useEffect } from 'react'
import {
  Box, Chip, CircularProgress, Divider, IconButton, Slider,
  Switch, TextField, ToggleButton, ToggleButtonGroup,
  Typography, Alert, Snackbar,
} from '@mui/material'
import AddRoundedIcon    from '@mui/icons-material/AddRounded'
import CloseRoundedIcon  from '@mui/icons-material/CloseRounded'
import SaveRoundedIcon   from '@mui/icons-material/SaveRounded'
import { useTranslation } from 'react-i18next'
import { userSettingsApi } from '../api'
import type { UserSettings } from '../types'

const DEFAULT_SETTINGS: UserSettings = {
  goalCategories:          ['home', 'work', 'health', 'personal'],
  coachTone:               'encouraging',
  coachFrequency:          'daily',
  workStartHour:           8,
  workEndHour:             20,
  firstDayOfWeek:          0,
  language:                'en',
  defaultReminderMinutes:  30,
  pushNotificationsEnabled: true,
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const [settings,     setSettings]     = useState<UserSettings>(DEFAULT_SETTINGS)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [newCategory,  setNewCategory]  = useState('')
  const [snack,        setSnack]        = useState<{ msg: string; severity: 'success' | 'error' } | null>(null)

  useEffect(() => {
    userSettingsApi.get()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async (patch: Partial<UserSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    setSaving(true)
    try {
      const saved = await userSettingsApi.update(next)
      setSettings(saved)
      setSnack({ msg: t('settings.saved'), severity: 'success' })
    } catch {
      setSnack({ msg: t('settings.saveError'), severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const addCategory = () => {
    const cat = newCategory.trim().toLowerCase()
    if (!cat || settings.goalCategories.includes(cat)) return
    const next = [...settings.goalCategories, cat]
    setNewCategory('')
    save({ goalCategories: next })
  }

  const removeCategory = (cat: string) => {
    save({ goalCategories: settings.goalCategories.filter((c) => c !== cat) })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 8 }}>

      {/* ── Header ── */}
      <Box sx={{
        px: 2, pt: 2.5, pb: 1.75,
        background: 'linear-gradient(135deg, #EDE9FF 0%, #F5F0FF 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Typography variant="h3" fontWeight={700}>{t('settings.title')}</Typography>
        {saving && <CircularProgress size={20} />}
        {!saving && <SaveRoundedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
      </Box>

      <Box sx={{ px: 2, pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Language ── */}
        <Section title={t('settings.language')}>
          <ToggleButtonGroup
            value={settings.language}
            exclusive
            onChange={(_, v) => { if (v) { save({ language: v }); i18n.changeLanguage(v) } }}
            size="small"
          >
            <ToggleButton value="en" sx={{ px: 3, fontWeight: 600 }}>EN</ToggleButton>
            <ToggleButton value="he" sx={{ px: 3, fontWeight: 600 }}>עב</ToggleButton>
          </ToggleButtonGroup>
        </Section>

        <Divider />

        {/* ── First day of week ── */}
        <Section title={t('settings.firstDayOfWeek')}>
          <ToggleButtonGroup
            value={settings.firstDayOfWeek}
            exclusive
            onChange={(_, v) => { if (v !== null) save({ firstDayOfWeek: v }) }}
            size="small"
          >
            <ToggleButton value={0} sx={{ px: 3, fontWeight: 600 }}>{t('settings.sunday')}</ToggleButton>
            <ToggleButton value={1} sx={{ px: 3, fontWeight: 600 }}>{t('settings.monday')}</ToggleButton>
          </ToggleButtonGroup>
        </Section>

        <Divider />

        {/* ── Goal categories ── */}
        <Section title={t('settings.goalCategories')} subtitle={t('settings.goalCategoriesHint')}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            {settings.goalCategories.map((cat) => (
              <Chip
                key={cat}
                label={t(`category.${cat}`, { defaultValue: cat })}
                onDelete={() => removeCategory(cat)}
                deleteIcon={<CloseRoundedIcon />}
                size="small"
                sx={{ fontWeight: 600, bgcolor: 'rgba(124,92,255,0.1)', color: 'primary.main' }}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder={t('settings.newCategory')}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCategory() }}
              sx={{ flex: 1, '& .MuiInputBase-root': { borderRadius: 2.5 } }}
            />
            <IconButton onClick={addCategory} size="small" sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 2, '&:hover': { bgcolor: 'primary.dark' } }}>
              <AddRoundedIcon />
            </IconButton>
          </Box>
        </Section>

        <Divider />

        {/* ── Personal coach ── */}
        <Section title={t('settings.coachTitle')} subtitle={t('settings.coachHint')}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block', fontWeight: 600 }}>
            {t('settings.coachTone')}
          </Typography>
          <ToggleButtonGroup
            value={settings.coachTone}
            exclusive
            onChange={(_, v) => { if (v) save({ coachTone: v }) }}
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="encouraging" sx={{ px: 2, fontWeight: 600, fontSize: '0.72rem' }}>😊 {t('settings.toneEncouraging')}</ToggleButton>
            <ToggleButton value="direct"      sx={{ px: 2, fontWeight: 600, fontSize: '0.72rem' }}>💼 {t('settings.toneDirect')}</ToggleButton>
            <ToggleButton value="strict"      sx={{ px: 2, fontWeight: 600, fontSize: '0.72rem' }}>⚡ {t('settings.toneStrict')}</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block', fontWeight: 600 }}>
            {t('settings.coachFrequency')}
          </Typography>
          <ToggleButtonGroup
            value={settings.coachFrequency}
            exclusive
            onChange={(_, v) => { if (v) save({ coachFrequency: v }) }}
            size="small"
          >
            <ToggleButton value="daily"    sx={{ px: 2, fontWeight: 600, fontSize: '0.72rem' }}>{t('settings.freqDaily')}</ToggleButton>
            <ToggleButton value="weekly"   sx={{ px: 2, fontWeight: 600, fontSize: '0.72rem' }}>{t('settings.freqWeekly')}</ToggleButton>
            <ToggleButton value="asNeeded" sx={{ px: 2, fontWeight: 600, fontSize: '0.72rem' }}>{t('settings.freqAsNeeded')}</ToggleButton>
          </ToggleButtonGroup>
        </Section>

        <Divider />

        {/* ── Working hours ── */}
        <Section title={t('settings.workingHours')} subtitle={t('settings.workingHoursHint')}>
          <Box sx={{ px: 1 }}>
            <Slider
              value={[settings.workStartHour, settings.workEndHour]}
              min={0} max={24} step={1}
              marks={[0,4,8,12,16,20,24].map((v) => ({ value: v, label: `${v}:00` }))}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}:00`}
              onChange={(_, v) => {
                const [s, e] = v as number[]
                setSettings((prev) => ({ ...prev, workStartHour: s, workEndHour: e }))
              }}
              onChangeCommitted={(_, v) => {
                const [s, e] = v as number[]
                save({ workStartHour: s, workEndHour: e })
              }}
              sx={{ color: 'primary.main' }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
            {settings.workStartHour}:00 – {settings.workEndHour}:00
          </Typography>
        </Section>

        <Divider />

        {/* ── Notifications ── */}
        <Section title={t('settings.notifications')}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2">{t('settings.pushNotifications')}</Typography>
            <Switch
              checked={settings.pushNotificationsEnabled}
              onChange={(e) => save({ pushNotificationsEnabled: e.target.checked })}
              color="primary"
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
            {t('settings.defaultReminderMinutes')}
          </Typography>
          <ToggleButtonGroup
            value={settings.defaultReminderMinutes}
            exclusive
            onChange={(_, v) => { if (v !== null) save({ defaultReminderMinutes: v }) }}
            size="small"
          >
            {[5, 15, 30, 60].map((m) => (
              <ToggleButton key={m} value={m} sx={{ px: 2, fontWeight: 600, fontSize: '0.72rem' }}>
                {m === 60 ? '1h' : `${m}m`}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Section>

      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity ?? 'info'} onClose={() => setSnack(null)} sx={{ width: '100%' }}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: subtitle ? 0.25 : 1 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, display: 'block' }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  )
}
