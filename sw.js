/* sw.js — Service worker UMKM Kelurahan Pager
 * - App shell (HTML/CSS/JS/ikon) di-cache; halaman: network-first dengan fallback cache/offline
 * - Aset statis: stale-while-revalidate
 * - Panggilan API (script.google.com) TIDAK pernah di-cache (data & token sesi)
 * Naikkan VERSION setiap kali file frontend diperbarui agar cache lama dibersihkan. */
const VERSION = 'v1.0.0';
const CACHE = 'umkm-pager-' + VERSION;
const IMG_CACHE = 'umkm-pager-img-' + VERSION;
const SHELL = [
  './', 'index.html', 'products.html', 'product-detail.html', 'umkm.html', 'umkm-detail.html', 'berita.html', 'login.html',
  'cart.html', 'checkout.html', 'orders.html', 'profile.html', 'offline.html', 'manifest.json',
  'assets/css/app.css', 'assets/js/theme.js', 'assets/js/config.js', 'assets/js/icons.js', 'assets/js/api.js', 'assets/js/common.js',
  'assets/js/pages/index.js', 'assets/js/pages/products.js', 'assets/js/pages/product-detail.js', 'assets/js/pages/umkm.js',
  'assets/js/pages/umkm-detail.js', 'assets/js/pages/berita.js', 'assets/js/pages/login.js', 'assets/js/pages/cart.js',
  'assets/js/pages/checkout.js', 'assets/js/pages/orders.js', 'assets/js/pages/profile.js',
  'assets/icons/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== IMG_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API backend & dashboard (butuh data segar + token): jangan disentuh
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('script.googleusercontent.com')) return;
  if (url.pathname.indexOf('/admin/') >= 0 || url.pathname.indexOf('/seller/') >= 0) return;

  // gambar lintas-origin (Drive/Google): cache dengan batas
  if (url.origin !== location.origin) {
    if (req.destination === 'image') {
      e.respondWith(caches.open(IMG_CACHE).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) { c.put(req, r.clone()); trim(c, 80); } return r; }).catch(() => hit);
        return hit || net;
      }));
    }
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('offline.html'))));
    return;
  }

  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => { if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});

async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}
