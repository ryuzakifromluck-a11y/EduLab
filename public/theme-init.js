// Apply the saved or system theme before first paint to avoid a flash.
// Loaded as a file (not an inline script) so the Content-Security-Policy can forbid inline scripts.
try {
  var t = localStorage.getItem('edulab-theme')
  var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  if (dark) document.documentElement.classList.add('dark')
} catch (e) {}
