/* index.js — Beranda */
App.start({ nav: 'home' }, function () {
  UI.html('#app', '<section class="bg-gradient-to-br from-primary-900 via-primary-800 to-gray-900 px-4 py-14 text-white sm:px-6 lg:py-20">' +
    '<div class="mx-auto max-w-4xl space-y-6 text-center" id="hero"><div class="skeleton mx-auto h-40 max-w-2xl opacity-20"></div></div></section>' +
    '<div class="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">' +
    '<section><div class="mb-5 flex items-end justify-between"><div><h2 class="text-xl font-bold">Kategori Pilihan</h2><p class="text-sm text-gray-500">Jelajahi produk berdasarkan jenis usaha warga</p></div></div><div id="cats" class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">' + UI.skeletons(8, 'h-24') + '</div></section>' +
    '<section><div class="mb-5 flex items-end justify-between"><div><h2 class="text-xl font-bold">Produk Unggulan</h2><p class="text-sm text-gray-500">Pilihan terbaik warga Kelurahan Pager</p></div><a href="' + E.link('products.html') + '" class="text-sm font-semibold text-primary-600">Lihat semua</a></div><div id="featured" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">' + UI.skeletons(4) + '</div></section>' +
    '<section><div class="mb-5 flex items-end justify-between"><div><h2 class="text-xl font-bold">UMKM Terbaru</h2><p class="text-sm text-gray-500">Kenali usaha-usaha warga</p></div><a href="' + E.link('umkm.html') + '" class="text-sm font-semibold text-primary-600">Direktori UMKM</a></div><div id="umkm" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"></div></section>' +
    '<section id="newest-sec" hidden><div class="mb-5"><h2 class="text-xl font-bold">Baru Ditambahkan</h2></div><div id="newest" class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"></div></section>' +
    '<section id="news-sec" hidden><div class="mb-5 flex items-end justify-between"><h2 class="text-xl font-bold">Berita & Event</h2><a href="' + E.link('berita.html') + '" class="text-sm font-semibold text-primary-600">Semua berita</a></div><div id="news" class="grid gap-4 md:grid-cols-3"></div></section>' +
    '<section class="card flex flex-col items-center gap-4 bg-primary-50 p-8 text-center dark:bg-primary-900/20"><h2 class="text-xl font-bold">Punya usaha di Kelurahan Pager?</h2><p class="max-w-xl text-sm text-gray-600 dark:text-gray-300">Daftarkan UMKM Anda gratis, tampilkan produk, dan terima pesanan langsung dari warga lewat WhatsApp.</p><a class="btn btn-primary" href="' + E.link('login.html', { daftar: 'umkm' }) + '">Daftar sebagai UMKM</a></section></div>');

  function hero(banners) {
    var b = banners[0];
    var bg = b && E.url(b.gambar) ? ' <img data-fallback src="' + E.img(b.gambar) + '" alt="" class="mx-auto max-h-48 rounded-2xl object-cover shadow-xl">' : '';
    UI.html('#hero',
      '<span class="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-800/80 px-3 py-1.5 text-xs font-semibold text-primary-200">' + UI.icon('store') + ' Resmi Warga Kelurahan Pager</span>' +
      '<h1 class="text-3xl font-extrabold tracking-tight sm:text-5xl">' + E.esc(b ? b.judul : 'Belanja Produk Lokal') + (b ? '' : ' <span class="text-primary-400">Kelurahan Pager</span>') + '</h1>' +
      '<p class="mx-auto max-w-2xl text-base text-gray-200 sm:text-lg">' + E.esc(b && b.subjudul ? b.subjudul : (App.settings.tagline || 'Temukan produk berkualitas, kuliner khas, dan kerajinan terbaik langsung dari UMKM warga.')) + '</p>' + bg +
      '<form action="' + E.link('products.html') + '" class="mx-auto flex max-w-2xl items-center rounded-xl bg-white p-2 shadow-2xl dark:bg-gray-800"><span class="pl-3 text-gray-400">' + UI.icon('search', 'w-5 h-5') + '</span>' +
      '<input name="q" type="search" aria-label="Cari produk" placeholder="Cari produk atau nama UMKM..." class="w-full bg-transparent px-3 py-2 text-sm text-gray-800 focus:outline-none dark:text-white sm:text-base"><button class="btn btn-primary">Cari</button></form>');
  }
  hero([]);

  return Api.get('home').then(function (r) {
    if (!r.success) {
      UI.html('#featured', UI.error(r.message, 'reload')); return;
    }
    var d = r.data;
    hero(d.banners || []);
    UI.html('#cats', d.categories.length ? d.categories.map(function (c) {
      return '<a href="' + E.link('products.html', { kategori: c.id }) + '" class="card group flex flex-col items-center gap-2 p-3 text-center transition hover:border-primary-500">' +
        '<span class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:scale-110 dark:bg-primary-900/40">' + UI.icon(Icons.has(c.icon) ? c.icon : 'tag', 'w-6 h-6') + '</span>' +
        '<span class="text-xs font-semibold">' + E.esc(c.nama) + '</span></a>';
    }).join('') : '<p class="col-span-full text-sm text-gray-500">Kategori belum tersedia.</p>');
    UI.html('#featured', d.featured.length ? d.featured.map(UI.productCard).join('') : UI.empty('package', 'Belum ada produk', 'Produk UMKM akan tampil di sini setelah penjual menambahkannya.'));
    UI.html('#umkm', d.umkm.length ? d.umkm.map(UI.umkmCard).join('') : '<p class="text-sm text-gray-500">Belum ada UMKM terdaftar.</p>');
    if (d.newest.length) { document.getElementById('newest-sec').hidden = false; UI.html('#newest', d.newest.map(UI.productCard).join('')); }
    if (d.news.length) {
      document.getElementById('news-sec').hidden = false;
      UI.html('#news', d.news.map(function (n) {
        return '<a href="' + E.link('berita.html', { slug: n.slug }) + '" class="card overflow-hidden transition hover:shadow-md">' +
          (E.url(n.gambar) ? '<img loading="lazy" data-fallback src="' + E.img(n.gambar) + '" alt="" class="h-40 w-full object-cover">' : '') +
          '<div class="space-y-1 p-4"><div class="flex items-center gap-2 text-xs text-gray-500">' + UI.badge(n.tipe === 'EVENT' ? 'UMKM' : 'WARGA', n.tipe) + E.tgl(n.tanggal, false) + '</div>' +
          '<h3 class="line-clamp-2 font-semibold">' + E.esc(n.judul) + '</h3><p class="line-clamp-2 text-sm text-gray-500">' + E.esc(n.ringkasan) + '</p></div></a>';
      }).join(''));
    }
  });
});
App.on('reload', function () { location.reload(); });
