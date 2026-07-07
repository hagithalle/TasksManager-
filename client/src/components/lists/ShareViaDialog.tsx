import { useState } from 'react'
import {
  Alert, Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import WhatsappIcon from '@mui/icons-material/WhatsApp'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import { useTranslation } from 'react-i18next'
import type { PersonalList } from '../../types'
import { formatListForSharing, generateMailtoLink, generateWhatsAppLink } from '../../utils/listFormatter'

interface Props {
  open: boolean
  onClose: () => void
  list: PersonalList
}

export default function ShareViaDialog({ open, onClose, list }: Props) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email')
  const [emails, setEmails] = useState('')
  const [copied, setCopied] = useState(false)
  const [bodyAutocopied, setBodyAutocopied] = useState(false)

  const formattedText = formatListForSharing(list, (key) => t(key))
  const emailSubject = `${list.title} (${new Date().toLocaleDateString()})`

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for unsupported browsers
    }
  }

  const handleSendEmail = async () => {
    const emailList = emails
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'))

    if (emailList.length === 0) return

    const { url, bodyTruncated } = generateMailtoLink(emailList, emailSubject, formattedText)
    if (!url) return

    if (bodyTruncated) {
      // List too long for mailto URL — copy body text so user can paste it manually
      try { await navigator.clipboard.writeText(formattedText) } catch { /* ignore */ }
      setBodyAutocopied(true)
      setTimeout(() => setBodyAutocopied(false), 7000)
    }

    const a = document.createElement('a')
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleShareWhatsApp = () => {
    const link = generateWhatsAppLink(formattedText)
    window.open(link, '_blank')
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 4, maxHeight: '92vh' } }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem' }}>
            {t('list.shareVia', 'Share via')}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{ mt: 1, minHeight: 44 }}
        >
          <Tab
            label={t('share.email', 'Email')}
            value="email"
            icon={<EmailRoundedIcon sx={{ fontSize: 18, mr: 0.5 }} />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontSize: '0.9rem', minHeight: 44, gap: 0.5 }}
          />
          <Tab
            label="WhatsApp"
            value="whatsapp"
            icon={<WhatsappIcon sx={{ fontSize: 18, mr: 0.5 }} />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontSize: '0.9rem', minHeight: 44, gap: 0.5 }}
          />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* ── Email Tab ── */}
        {activeTab === 'email' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label={t('share.emailAddresses', 'Email addresses')}
              placeholder="email@example.com&#10;or comma-separated"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              variant="outlined"
              size="small"
            />

            {/* Text preview */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('share.preview', 'Preview')}:
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(124,92,255,0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(124,92,255,0.1)',
                  maxHeight: 200,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  lineHeight: 1.4,
                }}
              >
                {formattedText}
              </Box>
            </Box>

            {/* Buttons */}
            <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<EmailRoundedIcon />}
                onClick={handleSendEmail}
                disabled={!emails.trim()}
                sx={{ borderRadius: 2 }}
              >
                {t('share.sendEmail', 'Send Email')}
              </Button>
              <Tooltip title={copied ? t('share.copied', 'הועתק!') : t('share.copyText', 'העתק תוכן הרשימה')}>
                <Button
                  variant="outlined"
                  onClick={handleCopyText}
                  sx={{ borderRadius: 2, minWidth: 44, p: 1.25 }}
                >
                  <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />
                </Button>
              </Tooltip>
            </Box>

            {bodyAutocopied ? (
              <Alert severity="warning" sx={{ borderRadius: 2, mt: 1 }}>
                <Typography variant="caption">
                  {t('share.emailBodyCopied', 'הרשימה ארוכה מדי לשליחה ישירה — התוכן הועתק ללוח הגזירים. הדבק אותו בגוף המייל לאחר פתיחת הלקוח.')}
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2, mt: 1 }}>
                <Typography variant="caption">
                  {t('share.emailInfo', 'לחץ "שלח מייל" לפתוח את לקוח המייל, או העתק את תוכן הרשימה.')}
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* ── WhatsApp Tab ── */}
        {activeTab === 'whatsapp' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Text preview */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('share.preview', 'Preview')}:
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(76,175,80,0.08)',
                  borderRadius: 2,
                  border: '1px solid rgba(76,175,80,0.2)',
                  maxHeight: 300,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  lineHeight: 1.4,
                }}
              >
                {formattedText}
              </Box>
            </Box>

            {/* Button */}
            <Button
              fullWidth
              variant="contained"
              startIcon={<WhatsappIcon />}
              onClick={handleShareWhatsApp}
              sx={{ borderRadius: 2, bgcolor: '#25D366', '&:hover': { bgcolor: '#20ba5a' } }}
            >
              {t('share.shareWhatsapp', 'Share on WhatsApp')}
            </Button>

            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="caption">
                {t('share.whatsappInfo', 'Opens WhatsApp Web on desktop or your WhatsApp app on mobile. Paste the message in any chat.')}
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
