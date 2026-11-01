import { describe, expect, it } from 'vitest'
import { INSTALL_SNOOZE_MS, installBannerAllowed, isIosSafari } from './pwa'

describe('installBannerAllowed', () => {
  const now = 1_800_000_000_000

  it('shows when never dismissed', () => {
    expect(installBannerAllowed(null, now)).toBe(true)
  })

  it('stays hidden during the snooze window', () => {
    expect(installBannerAllowed(String(now - 1000), now)).toBe(false)
    expect(installBannerAllowed(String(now - INSTALL_SNOOZE_MS + 1), now)).toBe(false)
  })

  it('shows again once the snooze window has passed', () => {
    expect(installBannerAllowed(String(now - INSTALL_SNOOZE_MS), now)).toBe(true)
  })

  it('ignores corrupt stored values', () => {
    expect(installBannerAllowed('yes', now)).toBe(true)
  })
})

describe('isIosSafari', () => {
  const iphoneSafari =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  const iphoneChrome =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
  const ipadAsMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
  const android = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

  it('detects Safari on iPhone and on iPadOS (which reports a Mac with touch)', () => {
    expect(isIosSafari(iphoneSafari)).toBe(true)
    expect(isIosSafari(ipadAsMac, 5)).toBe(true)
  })

  it('ignores desktop Safari, other iOS browsers and Android', () => {
    expect(isIosSafari(ipadAsMac, 0)).toBe(false)
    expect(isIosSafari(iphoneChrome)).toBe(false)
    expect(isIosSafari(android)).toBe(false)
  })
})
