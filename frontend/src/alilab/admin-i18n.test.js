import { afterEach, describe, expect, it } from 'vitest'
import { _setLangState } from '../lib/i18n-core.js'
import { adminDirection, adminText } from './admin-i18n.js'

afterEach(() => _setLangState('en', {}))

describe('localized admin surface', () => {
  it('renders Persian admin labels with RTL direction when Persian is selected', () => {
    _setLangState('fa', {})
    expect(adminDirection()).toBe('rtl')
    expect(adminText('Users')).toBe('کاربران')
    expect(adminText('Invite codes')).toBe('کدهای دعوت')
    expect(adminText('Delete account')).toBe('حذف حساب')
    expect(adminText('Activity log')).toBe('گزارش رویدادها')
  })

  it('keeps English UI and technical or unknown identifiers unchanged', () => {
    _setLangState('en', {})
    expect(adminDirection()).toBe('ltr')
    expect(adminText('Users')).toBe('Users')
    _setLangState('fa', {})
    expect(adminText('COACH_DISABLED')).toBe('COACH_DISABLED')
    expect(adminText('https://example.org')).toBe('https://example.org')
  })
})
