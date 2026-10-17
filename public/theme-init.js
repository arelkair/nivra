try {
  var stored = JSON.parse(localStorage.getItem('nivra-theme'))
  var dark = stored === 'dark' || (stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  if (dark) document.documentElement.classList.add('dark')
  document.documentElement.style.backgroundColor = dark ? '#0b0b0c' : '#f2f1ed'
  var accent = JSON.parse(localStorage.getItem('nivra-accent'))
  if (accent && accent !== 'basico') document.documentElement.dataset.accent = accent
} catch {}
