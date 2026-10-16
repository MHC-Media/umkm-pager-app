/* umkm.js — Direktori UMKM */
(function () {
  var q = E.qs('q'), kat = E.qs('kategori'), cats = [];
  function chips() {
    UI.html('#chips', [{ id: '', nama: 'Semua' }].concat(cats).map(function (c) {
      return '<button class="tab ' + (kat === c.id ? 'tab-active' : 'border') + '" data-action="cat" data-id="' + E.esc(c.id) + '">' + E.esc(c.nama) + '</button>';
    }).join(''));
  }
  function load() {
    UI.html('#grid', UI.skeletons(6, 'h-24'));
    Api.get('umkm.list', { q: q, kategori: kat }).then(function (r) {
      if (!r.success) { UI.html('#grid', UI.error(r.message, 'retry')); return; }
      UI.html('#grid', r.data.length ? r.data.map(UI.umkmCard).join('') : UI.empty('store', 'UMKM tidak ditemukan', 'Coba kata kunci atau kategori lain.'));
    });
  }
  App.start({ nav: 'umkm' }, function () {
    UI.html('#app', '<div class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8"><div><h1 class="text-2xl font-bold">Direktori UMKM</h1><p class="text-sm text-gray-500">Usaha-usaha warga Kelurahan Pager</p></div>' +
      '<input id="q" type="search" class="input" placeholder="Cari nama usaha..." value="' + E.esc(q) + '" aria-label="Cari UMKM"><div id="chips" class="no-scrollbar flex gap-2 overflow-x-auto pb-1"></div>' +
      '<div id="grid" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"></div></div>');
    document.getElementById('q').addEventListener('input', E.debounce(function (e) { q = e.target.value.trim(); load(); }, 400));
    Api.get('categories', {}, { ttl: 120 }).then(function (r) { if (r.success) { cats = r.data; chips(); } });
    chips(); load();
  });
  App.on('cat', function (el) { kat = el.getAttribute('data-id'); chips(); load(); });
  App.on('retry', load);
})();
