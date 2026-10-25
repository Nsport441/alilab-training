// Operator-only translations. Keep account IDs, API payloads and provider identifiers
// untouched; translate only strings rendered to the administrator.
import { baseLang, getLang } from '../lib/i18n-core.js'
import fa from './admin-fa.json'

export function adminText(value) {
  if (typeof value !== 'string') return value
  return baseLang(getLang()) === 'fa' ? (fa[value] ?? value) : value
}

export function adminDirection() {
  return baseLang(getLang()) === 'fa' ? 'rtl' : 'ltr'
}
