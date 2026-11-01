import i18n from '../i18n'
import { useAuth } from './auth'
import { useTutor } from './tutor'
import { useUi } from './ui'
import './progress'

/**
 * Wires the signed-in session to the rest of the app:
 * - on sign-in, applies the language and theme saved to the account;
 * - while signed in, saves language and theme changes back to the account;
 * - on sign-out, removes saved tutor conversations from this device (school computers are shared);
 * - on start-up, re-validates a stored session with the server.
 */

let applying = false

function applyAccountPreferences() {
  const prefs = useAuth.getState().user?.preferences
  if (!prefs) return
  applying = true
  if (prefs.language && prefs.language !== i18n.language) void i18n.changeLanguage(prefs.language)
  if (prefs.theme && prefs.theme !== useUi.getState().theme) useUi.getState().setTheme(prefs.theme)
  applying = false
}

function pushPreferences() {
  const { isAuthenticated, user, updatePreferences } = useAuth.getState()
  if (applying || !isAuthenticated || !user) return
  const next = { language: i18n.language, theme: useUi.getState().theme }
  if (next.language !== user.preferences.language || next.theme !== user.preferences.theme) void updatePreferences(next)
}

useAuth.subscribe((s, prev) => {
  if (s.user && s.user.id !== prev.user?.id) {
    applyAccountPreferences()
    // A new account has no saved preferences yet: adopt the current ones.
    pushPreferences()
  }
})
useAuth.subscribe((s, prev) => {
  if (prev.isAuthenticated && !s.isAuthenticated) useTutor.getState().clearAll()
})
useUi.subscribe((s, prev) => s.theme !== prev.theme && pushPreferences())
i18n.on('languageChanged', pushPreferences)

void useAuth.getState().refresh()
