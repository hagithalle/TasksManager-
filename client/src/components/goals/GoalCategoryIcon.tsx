import HomeRoundedIcon       from '@mui/icons-material/HomeRounded'
import WorkRoundedIcon       from '@mui/icons-material/WorkRounded'
import FavoriteRoundedIcon   from '@mui/icons-material/FavoriteRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import CodeRoundedIcon       from '@mui/icons-material/CodeRounded'
import StarRoundedIcon       from '@mui/icons-material/StarRounded'
import PersonRoundedIcon     from '@mui/icons-material/PersonRounded'
import CategoryRoundedIcon   from '@mui/icons-material/CategoryRounded'
import { Box } from '@mui/material'
import type { SvgIconComponent } from '@mui/icons-material'

interface CategoryMeta {
  Icon: SvgIconComponent
  bg: string
  color: string
}

const META: Record<string, CategoryMeta> = {
  home:     { Icon: HomeRoundedIcon,       bg: '#FFF3E0', color: '#E65100' },
  work:     { Icon: WorkRoundedIcon,       bg: '#E8F5E9', color: '#2E7D32' },
  health:   { Icon: FavoriteRoundedIcon,   bg: '#FCE4EC', color: '#C62828' },
  business: { Icon: TrendingUpRoundedIcon, bg: '#E3F2FD', color: '#1565C0' },
  python:   { Icon: CodeRoundedIcon,       bg: '#EDE9FF', color: '#5438CC' },
  hobby:    { Icon: StarRoundedIcon,       bg: '#FFFDE7', color: '#F57F17' },
  personal: { Icon: PersonRoundedIcon,     bg: '#F3E5F5', color: '#6A1B9A' },
}

const FALLBACK: CategoryMeta = { Icon: CategoryRoundedIcon, bg: '#ECEFF1', color: '#455A64' }

interface Props {
  category: string
  /** Diameter in px — defaults to 44 */
  size?: number
}

export default function GoalCategoryIcon({ category, size = 44 }: Props) {
  const { Icon, bg, color } = META[category?.toLowerCase()] ?? FALLBACK
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon sx={{ fontSize: size * 0.52, color }} />
    </Box>
  )
}
