/* products.js — Katalog produk dengan pencarian, filter, urutan, paginasi */
(function () {
  var state = { q: E.qs('q'), kategori: E.qs('kategori'), sort: E.qs('sort') || 'terbaru', page: Number(E.qs('page')) || 1, umkm: E.qs('umkm') };
  var cats = [];

  function sync() {
    var p = {}; ['q', 'kategori', 'sort', 'umkm'].forEach(function (k) { if (state[k] && !(k === 'sort' && state[k] === 'terbaru')) p[k] = state[k]; });
    if (state.page > 1) p.page = state.page;
    history.replaceState(null, '', location.pathname + (Object.keys(p).length ? '?' + new URLSearchParams(p).toString() : ''));
  }

  function chips() {
    var all = [{ id: '', nama: 'Semua' }].concat(cats);
    UI.html('#chips', all.map(function (c) {
      return '<button class="tab ' + (state.kategori === c.id ? 'tab-active' : 'border') + '" data-action="cat" data-id="' + E.esc(c.id) + '">' + E.esc(c.nama) + '</button>';
    }).join(''));
  }

  function load() {
    UI.html('#grid', UI.skeletons(8));
    sync();
    Api.get('products', { q: state.q, kategori: state.kategori, sort: state.sort, page: state.page, limit: 12, umkm: state.umkm }).then(function (r) {
      if (!r.success) { UI.html('#grid', UI.error(r.message, 'retry')); return; }
      var d = r.data;
      document.getElementById('count').textContent = d.total + ' produk ditemukan';
      UI.html('#grid', d.items.length ? d.items.map(UI.productCard).join('') + UI.pager(d.page, d.pages, 'page')
        : UI.empty('search', 'Produk tidak ditemukan', 'Coba kata kunci atau kategori lain.'));
    });
  }

  App.start({ nav: 'products' }, function () {
    UI.html('#app', '<div class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8"><div><h1 class="text-2xl font-bold">Produk UMKM</h1><p id="count" class="text-sm text-gray-500">Memuat...</p></div>' +
      '<form data-form="search" class="flex flex-col gap-3 sm:flex-row"><div class="relative flex-1"><span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">' + UI.icon('search', 'w-4 h-4') + '</span>' +
      '<input id="q" type="search" class="input pl-10" placeholder="Cari produk atau nama UMKM..." value="' + E.esc(state.q) + '" aria-label="Cari"></div>' +
      '<select id="sort" class="input sm:!w-52" aria-label="Urutkan"><option value="terbaru">Terbaru</option><option value="terlaris">Terlaris</option><option value="rating">Rating tertinggi</option><option value="termurah">Harga termurah</option><option value="termahal">Harga termahal</option></select></form>' +
      '<div id="chips" class="no-scrollbar flex gap-2 overflow-x-auto pb-1"></div>' +
      '<div id="grid" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"></div></div>');
    document.getElementById('sort').value = state.sort;
    if (E.qs('focus')) document.getElementById('q').focus();
    document.getElementById('sort').addEventListener('change', function (e) { state.sort = e.target.value; state.page = 1; load(); });
    document.getElementById('q').addEventListener('input', E.debounce(function (e) { state.q = e.target.value.trim(); state.page = 1; load(); }, 450));
    Api.get('categories', {}, { ttl: 120 }).then(function (r) { if (r.success) { cats = r.data; chips(); } });
    chips(); load();
  });

  App.form('search', function () { state.q = document.getElementById('q').value.trim(); state.page = 1; load(); });
  App.on('cat', function (el) { state.kategori = el.getAttribute('data-id'); state.page = 1; chips(); load(); });
  App.on('page', function (el) { state.page = Number(el.getAttribute('data-page')); load(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  App.on('retry', load);
})();
