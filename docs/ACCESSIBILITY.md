# Accessibility

EduLab targets WCAG 2.1 AA. Every page has been checked with axe-core
(WCAG 2 A/AA + best-practice rules) in light and dark themes, at desktop and phone widths.

## Conventions

- **Announcements.** Use `announce(message, 'polite' | 'assertive')` from `src/lib/announce.ts`
  for dynamic changes a screen reader should speak (e.g. "Experiment completed",
  "Quiz score: 4/5"). The live regions are rendered once by `<LiveAnnouncer />` in
  `AppLayout`; do not add ad-hoc `aria-live` regions for transient messages.
- **Reduced motion.** `useReducedMotion()` (React) and `prefersReducedMotion()` (plain code,
  e.g. before starting confetti) live in `src/lib/hooks.ts`. Simulations start paused, the hero
  scene is static, camera damping is off and hover transforms use `motion-safe:`. A global CSS
  rule shortens CSS animations and transitions.
- **Dialogs / overlays.** Follow Presentation Mode (`ExperimentShell.tsx`): portal to `<body>`,
  set `inert` on `#root`, move focus into the dialog, trap Tab, close on Escape and return
  focus to the control that opened it.
- **Option groups.** `Segmented` is a radio group: one Tab stop, arrow keys / Home / End select.
- **Charts.** Wrap Recharts in `role="figure"` with an `aria-label` (never `role="img"`, which
  hides Recharts' keyboard accessibility layer).
- **Colour.** Text tokens (`ink`, `muted`, `faint`, subject `*-ink`, `warn`, `ok`) all meet
  4.5:1 on `surface`, `surface-2` and `surface-3` in both themes. Do not lower opacity on
  containers that hold text; dim only decorative parts.

## Keyboard

| Where | Keys |
| --- | --- |
| Anywhere | Tab / Shift+Tab, "Skip to content" link first |
| 3D view (focused) | ←/→ orbit, ↑/↓ tilt, + / − zoom, 0 reset camera |
| Chart (focused) | ←/→ step through data points |
| Presentation Mode | Space play/pause, R reset, ←/→ adjust, G graph, C controls, Esc exit |
| Mobile menu | Esc closes and returns focus to the menu button |

After each route change focus moves to `<main>` and the new page heading is announced.
