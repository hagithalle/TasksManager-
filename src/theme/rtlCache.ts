import createCache from '@emotion/cache'
import rtlPlugin from 'stylis-plugin-rtl'
import { prefixer } from 'stylis'

/**
 * Emotion cache for RTL languages (Hebrew, Arabic, …).
 * The `muirtl` key prefix prevents style collisions with the LTR cache.
 */
export const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
})

/**
 * Emotion cache for LTR languages (English, …).
 */
export const ltrCache = createCache({
  key: 'muiltr',
  stylisPlugins: [prefixer],
})
