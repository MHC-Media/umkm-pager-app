/* berita.js — Berita & Event */
(function () {
  var tipe = '';
  function list() {
    UI.html('#box', UI.skeletons(3, 'h-48'));
    Api.get('news.list', { tipe: tipe }).then(function (r) {
      if (!r.success) { UI.html('#box', UI.error(r.message, 'retry')); return; }
      UI.html('#box', r.data.length ? r.data.map(function (n) {
        return '<a href="' + E.link('berita.html', { slug: n.slug }) + '" class="card overflow-hidden transition hover:shadow-md">' +
          (E.url(n.gambar) ? '<img loading="lazy" data-fallback src="' + E.img(n.gambar) + '" alt="" class="h-44 w-full object-cover">' : '') +
          '<div class="space-y-1 p-4"><div class="flex items-center gap-2 text-xs text-gray-500">' + UI.badge(n.tipe === 'EVENT' ? 'PENDING' : 'ACTIVE', n.tipe) + (n.tipe === 'EVENT' && n.tanggal_event ? E.tgl(n.tanggal_event) : E.tgl(n.tanggal, false)) + '</div>' +
          '<h3 class="font-semibold">' + E.esc(n.judul) + '</h3><p class="line-clamp-3 text-sm text-gray-500">' + E.esc(n.ringkasan) + '</p></div></a>';
      }).join('') : UI.empty('newspaper', 'Belum ada berita', ''));
    });
  }
  function tabs() {
    UI.html('#tabs', [['', 'Semua'], ['BERITA', 'Berita'], ['EVENT', 'Event']].map(function (t) {
      return '<button class="tab ' + (tipe === t[0] ? 'tab-active' : 'border') + '" data-action="tipe" data-t="' + t[0] + '">' + t[1] + '</button>';
    }).join(''));
  }
  App.start({ nav: 'berita' }, function () {
    var slug = E.qs('slug');
    if (slug) {
      return Api.get('news.detail', { slug: slug }).then(function (r) {
        if (!r.success) { UI.html('#app', '<div class="mx-auto grid max-w-lg p-6">' + UI.empty('newspaper', 'Berita tidak ditemukan', r.message, '<a class="btn btn-primary" href="' + E.link('berita.html') + '">Semua Berita</a>') + '</div>'); return; }
        var n = r.data; document.title = n.judul + ' - ' + App.name();
        UI.html('#app', '<article class="mx-auto max-w-3xl space-y-4 px-4 py-6"><a class="text-sm text-primary-600" href="' + E.link('berita.html') + '">&larr; Semua berita</a>' +
          '<div class="flex items-center gap-2 text-xs text-gray-500">' + UI.badge(n.tipe === 'EVENT' ? 'PENDING' : 'ACTIVE', n.tipe) + E.tgl(n.tanggal, false) + '</div>' +
          '<h1 class="text-2xl font-bold">' + E.esc(n.judul) + '</h1>' +
          (n.tipe === 'EVENT' ? '<div class="card flex flex-wrap gap-4 p-3 text-sm">' + (n.tanggal_event ? '<span class="flex items-center gap-1">' + UI.icon('calendar') + E.tgl(n.tanggal_event) + '</span>' : '') + (n.lokasi ? '<span class="flex items-center gap-1">' + UI.icon('map-pin') + E.esc(n.lokasi) + '</span>' : '') + '</div>' : '') +
          (E.url(n.gambar) ? '<img data-fallback src="' + E.img(n.gambar) + '" alt="" class="w-full rounded-2xl object-cover">' : '') +
          '<div class="whitespace-pre-line leading-relaxed text-gray-700 dark:text-gray-200">' + E.esc(n.isi) + '</div></article>');
      });
    }
    UI.html('#app', '<div class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8"><h1 class="text-2xl font-bold">Berita & Event</h1><div id="tabs" class="flex gap-2"></div><div id="box" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"></div></div>');
    tabs(); list();
  });
  App.on('tipe', function (el) { tipe = el.getAttribute('data-t'); tabs(); list(); });
  App.on('retry', list);
})();
