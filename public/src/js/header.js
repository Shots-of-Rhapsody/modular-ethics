// Injects /partials/header.html into <div id="site-header"></div>
// Keeps header consistent across all pages (works on GitHub Pages).
(async () => {
  const mount = document.getElementById('site-header');
  if (!mount) return;
  try {
    const res = await fetch('/partials/header.html', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mount.innerHTML = await res.text();
  } catch (err) {
    console.error('[header] failed to load shared header:', err);
  }
})();
