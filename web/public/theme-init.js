(() => {
  let preference = 'system';
  try { const value = localStorage.getItem('buggd.theme'); if (['light','dark','system'].includes(value)) preference = value; } catch {}
  const resolved = preference === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
})();
