/* theme.js — dimuat di <head> agar mode gelap diterapkan sebelum halaman tampil (tanpa kedip) */
(function () {
  try {
    var t = localStorage.getItem('pager_theme');
    if (t === 'dark' || (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) { /* abaikan */ }
})();
