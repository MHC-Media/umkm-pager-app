/**
 * common.js — Inti frontend: utilitas, komponen UI, keranjang, layout, inisialisasi halaman.
 * Aturan keamanan: SELURUH data dinamis wajib melalui E.esc() sebelum masuk innerHTML.
 */
(function () {
  'use strict';

  var ROOT = (function () {
    var s = document.currentScript;
    return s && s.src ? s.src.replace(/assets\/js\/common\.js.*$/, '') : './';
  })();

  /* ========================= UTILITAS ========================= */
  var PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e5e7eb"/>' +
    '<g fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M38 48h44l4 8H34z"/><path d="M40 56v24h40V56"/><path d="M54 80V66h12v14"/></g></svg>');

  var E = {
    esc: function (v) {
      return String(v == null ? '' : v).replace(/[&<>"'`]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c];
      });
    },
    /** URL gambar/tautan yang aman (hanya https, http relatif, atau data:image) */
    url: function (u) {
      u = String(u || '').trim();
      return /^https:\/\//i.test(u) || /^data:image\//i.test(u) ? u : '';
    },
    img: function (u) { return E.esc(E.url(u) || PLACEHOLDER); },
    rp: function (n) { return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID'); },
    /** "2026-10-15 12:45:00" -> "15/10/2026 12:45 WIB" */
    tgl: function (s, withTime) {
      var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(s || ''));
      if (!m) return s ? E.esc(s) : '-';
      var d = m[3] + '/' + m[2] + '/' + m[1];
      return withTime === false || !m[4] ? d : d + ' ' + m[4] + ':' + m[5] + ' WIB';
    },
    qs: function (k) { return new URLSearchParams(location.search).get(k) || ''; },
    debounce: function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 300); }; },
    initial: function (n) { return String(n || '?').trim().charAt(0).toUpperCase(); },
    link: function (page, params) {
      var q = params ? '?' + new URLSearchParams(params).toString() : '';
      return ROOT + page + q;
    },
    waLink: function (num, text) { return 'https://wa.me/' + String(num).replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : ''); },
    /** Hindari formula injection saat ekspor CSV/Excel */
    cell: function (v) {
      var s = String(v == null ? '' : v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    }
  };

  var STATUS_COLOR = {
    BARU: 'bg-blue-100 text-blue-700', DIPROSES: 'bg-amber-100 text-amber-700', DIKIRIM: 'bg-indigo-100 text-indigo-700',
    SELESAI: 'bg-green-100 text-green-700', BATAL: 'bg-red-100 text-red-700',
    ACTIVE: 'bg-green-100 text-green-700', PENDING: 'bg-amber-100 text-amber-700', REJECTED: 'bg-red-100 text-red-700',
    SUSPENDED: 'bg-gray-200 text-gray-700', BLOCKED: 'bg-red-100 text-red-700', DRAFT: 'bg-gray-200 text-gray-700',
    HIDDEN: 'bg-gray-200 text-gray-700', PUBLISHED: 'bg-green-100 text-green-700', APPROVED: 'bg-green-100 text-green-700',
    LUNAS: 'bg-green-100 text-green-700', BELUM_BAYAR: 'bg-amber-100 text-amber-700',
    ADMIN: 'bg-purple-100 text-purple-700', UMKM: 'bg-primary-100 text-primary-700', WARGA: 'bg-gray-200 text-gray-700'
  };

  /* ========================= KOMPONEN UI ========================= */
  var reg = {};   // registri produk untuk tombol "tambah ke keranjang"

  var UI = {
    icon: function (n, cls) { return window.Icons ? Icons.svg(n, cls || 'w-4 h-4') : ''; },
    badge: function (st, label) {
      return '<span class="badge ' + (STATUS_COLOR[st] || 'bg-gray-200 text-gray-700') + '">' + E.esc(label || String(st).replace('_', ' ')) + '</span>';
    },
    stars: function (r, count) {
      r = Number(r) || 0; var out = '<span class="inline-flex items-center gap-0.5" aria-label="Rating ' + r + ' dari 5">';
      for (var i = 1; i <= 5; i++) out += UI.icon('star', 'w-3.5 h-3.5 ' + (i <= Math.round(r) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'));
      return out + (count !== undefined ? '<span class="ml-1 text-xs text-gray-500">' + (r ? r.toFixed(1) : '0') + ' (' + count + ')</span>' : '') + '</span>';
    },
    html: function (el, html) {
      if (typeof el === 'string') el = document.querySelector(el);
      if (!el) return;
      el.innerHTML = html;
      if (window.Icons) Icons.render(el);
      el.querySelectorAll('[data-w]').forEach(function (b) { b.style.width = Math.max(0, Math.min(100, Number(b.getAttribute('data-w')) || 0)) + '%'; });
    },
    skeletons: function (n, cls) { var s = ''; for (var i = 0; i < n; i++) s += '<div class="skeleton ' + (cls || 'h-64') + '"></div>'; return s; },
    empty: function (icon, title, text, cta) {
      return '<div class="col-span-full card p-10 text-center space-y-3"><div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/40">' +
        UI.icon(icon, 'w-7 h-7') + '</div><h3 class="font-bold">' + E.esc(title) + '</h3>' +
        (text ? '<p class="mx-auto max-w-sm text-sm text-gray-500">' + E.esc(text) + '</p>' : '') + (cta || '') + '</div>';
    },
    error: function (msg, retryAction) {
      return '<div class="col-span-full card p-8 text-center space-y-3"><div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">' +
        UI.icon('alert-triangle', 'w-7 h-7') + '</div><p class="text-sm text-gray-600 dark:text-gray-300">' + E.esc(msg || 'Terjadi kesalahan.') + '</p>' +
        (retryAction ? '<button class="btn btn-outline btn-sm" data-action="' + retryAction + '">' + UI.icon('refresh-cw') + ' Coba lagi</button>' : '') + '</div>';
    },
    productCard: function (p) {
      reg[p.id] = p;
      var disc = p.harga_coret > p.harga ? Math.round((1 - p.harga / p.harga_coret) * 100) : 0;
      return '<div class="card group relative flex flex-col overflow-hidden transition hover:shadow-md">' +
        '<a href="' + E.link('product-detail.html', { slug: p.slug }) + '" class="block" aria-label="' + E.esc(p.nama_produk) + '">' +
        '<div class="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700"><img loading="lazy" data-fallback src="' + E.img(p.foto_utama) + '" alt="' + E.esc(p.nama_produk) + '" class="h-full w-full object-cover transition duration-300 group-hover:scale-105">' +
        (disc ? '<span class="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-' + disc + '%</span>' : '') +
        (p.stok <= 0 ? '<span class="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">Stok Habis</span>' : '') + '</div></a>' +
        '<div class="flex flex-1 flex-col p-3">' +
        '<a href="' + E.link('umkm-detail.html', { slug: p.umkm_slug }) + '" class="mb-1 line-clamp-1 text-xs text-gray-500 hover:text-primary-600">' + E.esc(p.umkm_nama) + '</a>' +
        '<a href="' + E.link('product-detail.html', { slug: p.slug }) + '" class="line-clamp-2 flex-1 text-sm font-semibold hover:text-primary-600">' + E.esc(p.nama_produk) + '</a>' +
        '<div class="mt-2"><span class="font-bold text-primary-600 dark:text-primary-400">' + E.rp(p.harga) + '</span>' +
        (disc ? ' <span class="text-xs text-gray-400 line-through">' + E.rp(p.harga_coret) + '</span>' : '') + '</div>' +
        '<div class="mt-1 flex items-center justify-between text-xs text-gray-500">' + UI.stars(p.rating, p.jumlah_ulasan) + '<span>' + (p.terjual || 0) + ' terjual</span></div>' +
        '<button class="btn btn-soft btn-sm mt-3 w-full" data-action="add-cart" data-id="' + E.esc(p.id) + '"' + (p.stok <= 0 ? ' disabled' : '') + '>' + UI.icon('shopping-cart') + ' Keranjang</button>' +
        '</div></div>';
    },
    umkmCard: function (u) {
      return '<a href="' + E.link('umkm-detail.html', { slug: u.slug }) + '" class="card flex items-center gap-3 p-4 transition hover:shadow-md">' +
        '<img data-fallback src="' + E.img(u.logo) + '" alt="" class="h-14 w-14 flex-shrink-0 rounded-xl bg-gray-100 object-cover" loading="lazy">' +
        '<div class="min-w-0"><h3 class="line-clamp-1 font-semibold">' + E.esc(u.nama_usaha) + '</h3>' +
        '<p class="line-clamp-1 text-xs text-gray-500">' + E.esc(u.alamat) + '</p>' +
        '<p class="mt-1 text-xs text-primary-600">' + (u.jumlah_produk || 0) + ' produk</p></div></a>';
    },
    pager: function (page, pages, action) {
      if (pages <= 1) return '';
      var out = '<div class="col-span-full mt-4 flex items-center justify-center gap-2">';
      out += '<button class="btn btn-outline btn-sm" data-action="' + action + '" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>' + UI.icon('chevron-left') + ' Sebelumnya</button>';
      out += '<span class="text-sm text-gray-500">Hal. ' + page + ' / ' + pages + '</span>';
      out += '<button class="btn btn-outline btn-sm" data-action="' + action + '" data-page="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>Berikutnya ' + UI.icon('chevron-right') + '</button></div>';
      return out;
    },

    /* ---- toast ---- */
    toast: function (msg, type) {
      var box = document.getElementById('toast-box');
      if (!box) { box = document.createElement('div'); box.id = 'toast-box'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
        box.className = 'fixed left-1/2 top-4 z-[100] flex w-[92%] max-w-sm -translate-x-1/2 flex-col gap-2'; document.body.appendChild(box); }
      var colors = { success: 'bg-primary-700', error: 'bg-red-600', info: 'bg-gray-800', warn: 'bg-amber-600' };
      var t = document.createElement('div');
      t.className = 'rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ' + (colors[type || 'info'] || colors.info);
      t.textContent = msg;
      box.appendChild(t);
      setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, type === 'error' ? 5000 : 3000);
    },

    /* ---- modal ---- */
    modal: function (html, opts) {
      opts = opts || {};
      var wrap = document.createElement('div');
      wrap.className = 'fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4';
      wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
      wrap.innerHTML = '<div class="card flex max-h-[92vh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-2xl ' + (opts.size || 'max-w-lg') + '">' +
        '<div class="flex items-center justify-between border-b p-4"><h3 class="font-bold">' + E.esc(opts.title || '') + '</h3>' +
        '<button class="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700" data-modal-close aria-label="Tutup">' + UI.icon('x', 'w-5 h-5') + '</button></div>' +
        '<div class="modal-body overflow-y-auto p-4">' + html + '</div></div>';
      document.body.appendChild(wrap);
      if (window.Icons) Icons.render(wrap);
      var prevFocus = document.activeElement;
      var h = {
        el: wrap, body: wrap.querySelector('.modal-body'),
        close: function () { wrap.remove(); document.removeEventListener('keydown', onKey); if (prevFocus && prevFocus.focus) prevFocus.focus(); if (opts.onClose) opts.onClose(); }
      };
      function onKey(e) { if (e.key === 'Escape') h.close(); }
      document.addEventListener('keydown', onKey);
      wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.closest('[data-modal-close]')) h.close(); });
      var first = wrap.querySelector('input,select,textarea,button:not([data-modal-close])'); if (first) first.focus();
      return h;
    },
    confirm: function (title, text, opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        var m = UI.modal('<p class="mb-5 text-sm text-gray-600 dark:text-gray-300">' + E.esc(text) + '</p><div class="flex justify-end gap-2">' +
          '<button class="btn btn-outline" data-no>Batal</button><button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-yes>' + E.esc(opts.ok || 'Ya, lanjutkan') + '</button></div>',
          { title: title, size: 'max-w-sm', onClose: function () { resolve(false); } });
        m.el.addEventListener('click', function (e) {
          if (e.target.closest('[data-yes]')) { resolve(true); m.el.remove(); }
          else if (e.target.closest('[data-no]')) { m.close(); }
        });
      });
    },
    busy: function (btn, on, label) {
      if (!btn) return;
      if (on) { btn.dataset.old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> ' + E.esc(label || 'Memproses...'); }
      else { btn.disabled = false; if (btn.dataset.old) btn.innerHTML = btn.dataset.old; if (window.Icons) Icons.render(btn); }
    },

    /* ---- gambar: pilih, kompres di klien, unggah ---- */
    compress: function (file, maxSide) {
      return new Promise(function (resolve, reject) {
        if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Format gambar harus JPG, PNG, atau WEBP.'));
        var img = new Image(); var url = URL.createObjectURL(file);
        img.onload = function () {
          var s = Math.min(1, (maxSide || 1000) / Math.max(img.width, img.height));
          var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          var data = c.toDataURL('image/jpeg', 0.82);
          resolve({ mime: 'image/jpeg', data: data.split(',')[1] });
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Gambar tidak dapat dibaca.')); };
        img.src = url;
      });
    },
    uploadFile: function (file, maxSide) {
      return UI.compress(file, maxSide).then(function (img) {
        return Api.post('upload.image', img).then(function (r) {
          if (!r.success) throw new Error(r.message);
          return r.data.url;
        });
      });
    },
    csv: function (filename, columns, rows) {
      var lines = [columns.map(function (c) { return E.cell(c.label); }).join(',')];
      rows.forEach(function (r) { lines.push(columns.map(function (c) { return E.cell(typeof c.get === 'function' ? c.get(r) : r[c.key]); }).join(',')); });
      var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
  };

  /* ========================= KERANJANG ========================= */
  var CART_KEY = 'pager_cart_v2';
  var Cart = {
    get: function () { try { var c = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(c) ? c : []; } catch (e) { return []; } },
    set: function (items) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* abaikan */ } Cart.badge(); },
    count: function () { return Cart.get().reduce(function (s, i) { return s + i.qty; }, 0); },
    add: function (p, qty) {
      qty = qty || 1;
      var items = Cart.get(), it = items.filter(function (i) { return i.id === p.id; })[0];
      var max = Math.min(99, p.stok || 99);
      if (it) it.qty = Math.min(max, it.qty + qty);
      else items.push({ id: p.id, slug: p.slug, nama: p.nama_produk, harga: p.harga, foto: p.foto_utama, umkm_id: p.umkm_id, umkm_nama: p.umkm_nama, stok: p.stok, qty: Math.min(max, qty) });
      Cart.set(items);
    },
    setQty: function (id, qty) {
      var items = Cart.get().map(function (i) { if (i.id === id) i.qty = Math.max(0, Math.min(99, qty, i.stok || 99)); return i; }).filter(function (i) { return i.qty > 0; });
      Cart.set(items);
    },
    remove: function (id) { Cart.set(Cart.get().filter(function (i) { return i.id !== id; })); },
    clear: function () { Cart.set([]); },
    badge: function () {
      var n = Cart.count();
      document.querySelectorAll('[data-cart-badge]').forEach(function (b) { b.textContent = n > 99 ? '99+' : n; b.classList.toggle('hidden', n === 0); });
    }
  };

  /* ========================= APP / LAYOUT ========================= */
  var handlers = {}, forms = {};
  var App = {
    root: ROOT,
    settings: {},
    on: function (name, fn) { handlers[name] = fn; },
    form: function (name, fn) { forms[name] = fn; },

    loadSettings: function () {
      var cached = null;
      try { cached = JSON.parse(sessionStorage.getItem('pager_settings') || 'null'); } catch (e) { cached = null; }
      if (cached && cached.exp > Date.now()) { App.settings = cached.v; return Promise.resolve(App.settings); }
      return Api.get('settings', {}, { ttl: 60 }).then(function (r) {
        if (r.success) { App.settings = r.data; try { sessionStorage.setItem('pager_settings', JSON.stringify({ v: r.data, exp: Date.now() + 300000 })); } catch (e) { /* abaikan */ } }
        return App.settings;
      });
    },
    name: function () { return App.settings.app_name || (window.APP_CONFIG && APP_CONFIG.APP_NAME) || 'UMKM Kelurahan Pager'; },

    requireLogin: function () {
      if (Auth.user()) return true;
      var here = location.href.split('#')[0];
      var rel = here.indexOf(ROOT) === 0 ? here.slice(ROOT.length) : 'index.html';
      location.replace(E.link('login.html', { next: rel || 'index.html' }));
      return false;
    },
    guard: function (roles) {
      var u = Auth.user();
      if (!u) { App.requireLogin(); return false; }
      if (u.must_change && !/profile\.html$/.test(location.pathname)) { location.replace(E.link('profile.html', { ganti: 1 })); return false; }
      if (roles && roles.indexOf(u.role) < 0) { location.replace(E.link('index.html')); return false; }
      return true;
    },

    start: function (opts, fn) {
      function go() {
        if (opts.roles && !App.guard(opts.roles)) return;
        if (!opts.roles && Auth.user() && Auth.user().must_change && !/profile\.html$/.test(location.pathname)) { location.replace(E.link('profile.html', { ganti: 1 })); return; }
        Layout.render(opts);
        Cart.badge();
        App.loadSettings().then(function () { Layout.refreshBrand(); });
        if (!Api.configured()) UI.toast('URL backend belum diatur di assets/js/config.js', 'warn');
        Promise.resolve(fn && fn()).catch(function (e) { console.error(e); UI.html('#app', '<div class="grid">' + UI.error('Terjadi kesalahan saat memuat halaman.') + '</div>'); });
        registerSW();
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    },

    logout: function () {
      return Api.post('auth.logout').then(function () { Auth.clear(); location.href = E.link('index.html'); });
    },

    go: function (page, params) { location.href = E.link(page, params); },
    afterLogin: function (user) {
      var next = E.qs('next');
      if (next && /^[a-z0-9\-/]+\.html(\?[^#]*)?$/i.test(next) && next.indexOf('//') < 0) { location.href = ROOT + next; return; }
      if (user.must_change) return App.go('profile.html', { ganti: 1 });
      if (user.role === 'ADMIN') return App.go('admin/dashboard.html');
      if (user.role === 'UMKM') return App.go('seller/dashboard.html');
      App.go('index.html');
    }
  };

  var Layout = {
    render: function (opts) {
      var app = document.getElementById('app');
      var main = app ? app.outerHTML : '<main id="app"></main>';
      var kind = opts.layout || 'public';
      var u = Auth.user();
      var brand = '<a href="' + ROOT + 'index.html" class="flex items-center gap-3"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white shadow-md">P</div>' +
        '<div class="leading-tight"><span class="block text-base font-bold text-gray-900 dark:text-white" data-brand>' + E.esc(App.name()) + '</span><span class="block text-xs text-gray-500 dark:text-gray-400">Kelurahan Digital</span></div></a>';
      var themeBtn = '<button class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" data-action="toggle-theme" aria-label="Ganti tema">' + UI.icon('moon', 'w-5 h-5 dark:hidden') + UI.icon('sun', 'w-5 h-5 hidden dark:block') + '</button>';

      if (kind === 'dash') {
        document.body.className = 'min-h-screen flex flex-col';
        document.body.innerHTML = '<header class="sticky top-0 z-40 border-b bg-white/95 backdrop-blur dark:bg-gray-800/95"><div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">' +
          brand + '<div class="flex items-center gap-1">' + '<a href="' + ROOT + 'index.html" class="btn btn-outline btn-sm hidden sm:inline-flex">' + UI.icon('store') + ' Lihat Toko</a>' + themeBtn +
          '<button class="btn btn-outline btn-sm" data-action="logout">' + UI.icon('log-out') + ' <span class="hidden sm:inline">Keluar</span></button></div></div></header>' +
          '<div class="flex-1 mx-auto w-full max-w-7xl px-4 py-6">' + main + '</div>';
      } else if (kind === 'bare') {
        document.body.className = 'min-h-screen flex flex-col';
        document.body.innerHTML = '<div class="flex flex-1 flex-col">' + main + '</div>';
      } else {
        var nav = [['index.html', 'Beranda', 'home'], ['products.html', 'Produk', 'products'], ['umkm.html', 'Direktori UMKM', 'umkm'], ['berita.html', 'Berita & Event', 'berita']];
        var navHtml = nav.map(function (n) {
          return '<a href="' + ROOT + n[0] + '" class="' + (opts.nav === n[2] ? 'font-semibold text-primary-600 dark:text-primary-400' : 'hover:text-primary-600') + ' transition">' + n[1] + '</a>';
        }).join('');
        var acct;
        if (u) {
          var dash = u.role === 'ADMIN' ? '<a class="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" href="' + ROOT + 'admin/dashboard.html">Dasbor Admin</a>' :
            u.role === 'UMKM' ? '<a class="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" href="' + ROOT + 'seller/dashboard.html">Dasbor Toko</a>' : '';
          acct = '<div class="relative" data-dropdown><button class="flex items-center gap-2 rounded-xl p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700" data-action="toggle-menu" aria-haspopup="true" aria-label="Menu akun">' +
            '<span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">' + E.esc(E.initial(u.nama)) + '</span></button>' +
            '<div class="card absolute right-0 mt-2 hidden w-52 overflow-hidden py-1 shadow-lg" data-menu><div class="border-b px-4 py-2"><p class="line-clamp-1 text-sm font-semibold">' + E.esc(u.nama) + '</p><p class="text-xs text-gray-500">' + E.esc(u.role) + '</p></div>' +
            dash + '<a class="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" href="' + ROOT + 'orders.html">Pesanan Saya</a>' +
            '<a class="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700" href="' + ROOT + 'profile.html">Profil & Keamanan</a>' +
            '<button class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700" data-action="logout">Keluar</button></div></div>';
        } else {
          acct = '<a href="' + ROOT + 'login.html" class="btn btn-primary btn-sm">' + UI.icon('log-in') + ' Masuk</a>';
        }
        var bn = [['index.html', 'Beranda', 'home', 'home'], ['products.html', 'Produk', 'grid', 'products'], ['cart.html', 'Keranjang', 'shopping-cart', 'cart'], ['orders.html', 'Pesanan', 'package', 'orders'], [u ? 'profile.html' : 'login.html', 'Akun', 'user', 'profile']];
        var bnHtml = bn.map(function (n) {
          var active = opts.nav === n[3];
          return '<a href="' + ROOT + n[0] + '" class="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ' + (active ? 'text-primary-600 font-semibold' : 'text-gray-500 dark:text-gray-400') + '">' +
            UI.icon(n[2], 'w-5 h-5') + '<span>' + n[1] + '</span>' + (n[3] === 'cart' ? '<span data-cart-badge class="absolute right-[22%] top-1 hidden h-4 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">0</span>' : '') + '</a>';
        }).join('');
        document.body.className = 'min-h-screen flex flex-col pb-16 md:pb-0';
        document.body.innerHTML =
          '<div id="offline-bar" class="hidden bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white">Anda sedang offline. Beberapa fitur tidak tersedia.</div>' +
          '<header class="sticky top-0 z-40 border-b bg-white/95 backdrop-blur dark:bg-gray-800/95"><div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">' + brand +
          '<nav class="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Menu utama">' + navHtml + '</nav>' +
          '<div class="flex items-center gap-1">' +
          '<form action="' + ROOT + 'products.html" class="relative hidden lg:block"><input name="q" type="search" placeholder="Cari produk..." aria-label="Cari produk" class="input !w-52 !rounded-full !py-1.5 pl-9"><span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">' + UI.icon('search') + '</span></form>' +
          '<a href="' + ROOT + 'products.html?focus=1" class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 lg:hidden" aria-label="Cari">' + UI.icon('search', 'w-5 h-5') + '</a>' +
          '<a href="' + ROOT + 'cart.html" class="relative hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 md:block" aria-label="Keranjang">' + UI.icon('shopping-cart', 'w-5 h-5') +
          '<span data-cart-badge class="absolute right-0 top-0 hidden h-4 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">0</span></a>' +
          themeBtn + acct + '</div></div></header>' +
          '<div class="flex-1">' + main + '</div>' +
          '<footer class="mt-12 border-t bg-white py-8 dark:bg-gray-800"><div class="mx-auto max-w-7xl space-y-3 px-4 text-center text-sm text-gray-500 dark:text-gray-400">' +
          '<p class="font-semibold text-gray-700 dark:text-gray-200" data-brand>' + E.esc(App.name()) + '</p><p data-foot-alamat></p><p data-foot-jam></p>' +
          '<p data-foot-wa></p><button class="btn btn-outline btn-sm hidden" id="install-btn" data-action="install-app">' + UI.icon('download') + ' Pasang Aplikasi</button>' +
          '<p>&copy; ' + new Date().getFullYear() + ' Kelurahan Pager. Semua hak dilindungi.</p></div></footer>' +
          '<nav class="fixed inset-x-0 bottom-0 z-40 flex border-t bg-white shadow-lg dark:bg-gray-800 md:hidden" aria-label="Menu bawah">' + bnHtml + '</nav>';
      }
      if (window.Icons) Icons.render(document.body);
      if (!navigator.onLine) { var ob = document.getElementById('offline-bar'); if (ob) ob.classList.remove('hidden'); }
      if (deferredPrompt) { var ib = document.getElementById('install-btn'); if (ib) ib.classList.remove('hidden'); }
    },
    refreshBrand: function () {
      document.querySelectorAll('[data-brand]').forEach(function (e) { e.textContent = App.name(); });
      var s = App.settings;
      var a = document.querySelector('[data-foot-alamat]'); if (a) a.textContent = s.alamat_kelurahan || '';
      var j = document.querySelector('[data-foot-jam]'); if (j) j.textContent = s.jam_layanan ? 'Layanan: ' + s.jam_layanan : '';
      var w = document.querySelector('[data-foot-wa]');
      if (w && s.wa_admin) w.innerHTML = '<a class="inline-flex items-center gap-1 text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer" href="' + E.esc(E.waLink(s.wa_admin, 'Halo admin ' + App.name())) + '">' + UI.icon('message-circle') + ' Hubungi Admin via WhatsApp</a>';
      if (window.Icons) Icons.render(document.body);
    }
  };

  /* ========================= EVENT GLOBAL ========================= */
  document.addEventListener('click', function (e) {
    var menuBtn = e.target.closest('[data-action="toggle-menu"]');
    document.querySelectorAll('[data-dropdown]').forEach(function (d) {
      var m = d.querySelector('[data-menu]');
      if (menuBtn && d.contains(menuBtn)) m.classList.toggle('hidden'); else m.classList.add('hidden');
    });
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var name = el.getAttribute('data-action');
    if (builtin[name]) { builtin[name](el, e); return; }
    if (handlers[name]) handlers[name](el, e);
  });

  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-form]');
    if (!f) return;
    var name = f.getAttribute('data-form');
    if (forms[name]) { e.preventDefault(); forms[name](f, e); }
  });

  // gambar gagal dimuat -> placeholder (tanpa atribut inline agar sesuai CSP)
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.hasAttribute('data-fallback') && !t.dataset.failed) { t.dataset.failed = '1'; t.src = PLACEHOLDER; }
  }, true);

  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredPrompt = e;
    var b = document.getElementById('install-btn'); if (b) b.classList.remove('hidden');
  });
  window.addEventListener('online', function () { var b = document.getElementById('offline-bar'); if (b) b.classList.add('hidden'); });
  window.addEventListener('offline', function () { var b = document.getElementById('offline-bar'); if (b) b.classList.remove('hidden'); });
  window.addEventListener('pager:unauthorized', function () {
    UI.toast('Sesi berakhir. Silakan masuk kembali.', 'warn');
    setTimeout(function () { if (!/login\.html$/.test(location.pathname)) App.requireLogin(); }, 600);
  });
  window.addEventListener('pager:mustchange', function () { if (!/profile\.html$/.test(location.pathname)) location.replace(E.link('profile.html', { ganti: 1 })); });
  window.addEventListener('pager:maintenance', function (ev) {
    var app = document.getElementById('app');
    if (app) UI.html(app, '<div class="mx-auto max-w-lg p-10 text-center"><div class="card space-y-3 p-8"><div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">' + UI.icon('wrench', 'w-7 h-7') + '</div><h1 class="text-lg font-bold">Sedang Pemeliharaan</h1><p class="text-sm text-gray-500">' + E.esc(ev.detail) + '</p></div></div>');
  });

  var builtin = {
    'toggle-theme': function () {
      var dark = document.documentElement.classList.toggle('dark');
      try { localStorage.setItem('pager_theme', dark ? 'dark' : 'light'); } catch (e) { /* abaikan */ }
    },
    'logout': function () { App.logout(); },
    'toggle-menu': function () { /* ditangani di atas */ },
    'install-app': function (el) {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; el.classList.add('hidden'); });
    },
    'add-cart': function (el) {
      var p = reg[el.getAttribute('data-id')];
      if (!p) return;
      Cart.add(p, 1);
      UI.toast('"' + p.nama_produk + '" ditambahkan ke keranjang', 'success');
    }
  };

  function registerSW() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT }).catch(function () { /* abaikan */ });
    }
  }

  window.E = E; window.UI = UI; window.Cart = Cart; window.App = App; window.Layout = Layout;
})();
