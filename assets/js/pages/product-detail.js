/* product-detail.js — Halaman detail produk */
(function () {
  var P = null, qty = 1;

  function render(d) {
    P = d.product; var u = d.umkm;
    document.title = P.nama_produk + ' - ' + App.name();
    var imgs = [P.foto_utama].concat(P.foto_galeri || []).filter(function (x) { return E.url(x); });
    if (!imgs.length) imgs = [''];
    var disc = P.harga_coret > P.harga ? Math.round((1 - P.harga / P.harga_coret) * 100) : 0;
    var waText = 'Halo ' + u.nama_usaha + ', saya tertarik dengan produk "' + P.nama_produk + '" di ' + App.name() + '.';
    UI.html('#app', '<div class="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">' +
      '<nav class="text-xs text-gray-500"><a class="hover:text-primary-600" href="' + E.link('index.html') + '">Beranda</a> / <a class="hover:text-primary-600" href="' + E.link('products.html') + '">Produk</a> / <span>' + E.esc(P.nama_produk) + '</span></nav>' +
      '<div class="grid gap-8 md:grid-cols-2"><div class="space-y-3"><div class="aspect-square overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-700"><img id="main-img" data-fallback src="' + E.img(imgs[0]) + '" alt="' + E.esc(P.nama_produk) + '" class="h-full w-full object-cover"></div>' +
      (imgs.length > 1 ? '<div class="flex gap-2 overflow-x-auto">' + imgs.map(function (i, n) { return '<button data-action="thumb" data-src="' + E.esc(E.url(i)) + '" class="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 ' + (n === 0 ? 'border-primary-600' : 'border-transparent') + '"><img data-fallback src="' + E.img(i) + '" alt="" class="h-full w-full object-cover"></button>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="space-y-4"><h1 class="text-2xl font-bold">' + E.esc(P.nama_produk) + '</h1>' +
      '<div class="flex flex-wrap items-center gap-3">' + UI.stars(P.rating, P.jumlah_ulasan) + '<span class="text-sm text-gray-500">' + (P.terjual || 0) + ' terjual</span></div>' +
      '<div><span class="text-3xl font-extrabold text-primary-600">' + E.rp(P.harga) + '</span>' + (disc ? ' <span class="ml-2 text-sm text-gray-400 line-through">' + E.rp(P.harga_coret) + '</span> <span class="badge bg-red-100 text-red-700">-' + disc + '%</span>' : '') + '</div>' +
      '<p class="text-sm ' + (P.stok > 0 ? 'text-gray-600 dark:text-gray-300' : 'font-semibold text-red-600') + '">' + (P.stok > 0 ? 'Stok: ' + P.stok + ' ' + E.esc(P.satuan) : 'Stok habis') + '</p>' +
      '<div class="flex items-center gap-3"><span class="label !mb-0">Jumlah</span><div class="flex items-center gap-2"><button class="btn btn-outline btn-sm" data-action="qty-minus" aria-label="Kurangi">' + UI.icon('minus') + '</button><span id="qty" class="w-8 text-center font-semibold">1</span><button class="btn btn-outline btn-sm" data-action="qty-plus" aria-label="Tambah">' + UI.icon('plus') + '</button></div></div>' +
      '<div class="flex flex-wrap gap-3"><button class="btn btn-primary flex-1" data-action="buy-now"' + (P.stok <= 0 ? ' disabled' : '') + '>Beli Sekarang</button><button class="btn btn-soft flex-1" data-action="add-detail"' + (P.stok <= 0 ? ' disabled' : '') + '>' + UI.icon('shopping-cart') + ' Keranjang</button>' +
      '<button class="btn btn-outline" data-action="wish" id="wish-btn" aria-label="Simpan ke favorit">' + UI.icon('heart', 'w-5 h-5') + '</button></div>' +
      '<a target="_blank" rel="noopener noreferrer" class="btn btn-outline w-full" href="' + E.esc(E.waLink(u.whatsapp, waText)) + '">' + UI.icon('message-circle') + ' Tanya Penjual via WhatsApp</a>' +
      '<div class="card space-y-1 p-4"><h2 class="text-sm font-bold">Deskripsi</h2><p class="whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">' + E.esc(P.deskripsi || 'Belum ada deskripsi.') + '</p></div></div></div>' +
      '<a href="' + E.link('umkm-detail.html', { slug: u.slug }) + '" class="card flex items-center gap-4 p-4 transition hover:shadow-md"><img data-fallback src="' + E.img(u.logo) + '" alt="" class="h-14 w-14 rounded-xl object-cover"><div><p class="text-xs text-gray-500">Dijual oleh</p><p class="font-semibold">' + E.esc(u.nama_usaha) + '</p><p class="text-xs text-gray-500">' + E.esc(u.alamat) + '</p></div></a>' +
      '<section><h2 class="mb-3 text-lg font-bold">Ulasan Pembeli (' + d.reviews.length + ')</h2><div class="space-y-3">' +
      (d.reviews.length ? d.reviews.map(function (r) { return '<div class="card p-4"><div class="flex items-center justify-between"><span class="text-sm font-semibold">' + E.esc(r.nama) + '</span>' + UI.stars(r.rating) + '</div>' + (r.komentar ? '<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">' + E.esc(r.komentar) + '</p>' : '') + '<p class="mt-1 text-xs text-gray-400">' + E.tgl(r.tanggal, false) + '</p></div>'; }).join('') : '<p class="text-sm text-gray-500">Belum ada ulasan.</p>') + '</div></section>' +
      (d.related.length ? '<section><h2 class="mb-3 text-lg font-bold">Produk Serupa</h2><div class="grid grid-cols-2 gap-4 md:grid-cols-4">' + d.related.map(UI.productCard).join('') + '</div></section>' : '') + '</div>');
    if (Auth.user()) Api.post('wishlist.list').then(function (r) { if (r.success && r.data.some(function (x) { return x.id === P.id; })) setWish(true); });
  }

  function setWish(on) {
    var b = document.getElementById('wish-btn'); if (!b) return;
    b.classList.toggle('text-red-600', on);
    var svg = b.querySelector('svg'); if (svg) svg.classList.toggle('fill-red-500', on);
  }

  App.start({ nav: 'products' }, function () {
    var slug = E.qs('slug');
    UI.html('#app', '<div class="mx-auto max-w-6xl px-4 py-6"><div class="grid gap-8 md:grid-cols-2"><div class="skeleton aspect-square"></div><div class="space-y-3"><div class="skeleton h-8"></div><div class="skeleton h-10 w-1/2"></div><div class="skeleton h-40"></div></div></div></div>');
    if (!slug) { UI.html('#app', '<div class="grid p-6">' + UI.empty('search', 'Produk tidak ditentukan', '', '<a class="btn btn-primary" href="' + E.link('products.html') + '">Lihat Semua Produk</a>') + '</div>'); return; }
    return Api.get('product', { slug: slug }).then(function (r) {
      if (!r.success) { UI.html('#app', '<div class="mx-auto grid max-w-lg p-6">' + UI.empty('alert-triangle', 'Produk tidak ditemukan', r.message, '<a class="btn btn-primary" href="' + E.link('products.html') + '">Lihat Produk Lain</a>') + '</div>'); return; }
      render(r.data);
    });
  });

  App.on('thumb', function (el) {
    document.getElementById('main-img').src = el.getAttribute('data-src') || '';
    el.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.remove('border-primary-600'); b.classList.add('border-transparent'); });
    el.classList.add('border-primary-600'); el.classList.remove('border-transparent');
  });
  App.on('qty-minus', function () { qty = Math.max(1, qty - 1); document.getElementById('qty').textContent = qty; });
  App.on('qty-plus', function () { qty = Math.min(P.stok, 99, qty + 1); document.getElementById('qty').textContent = qty; });
  App.on('add-detail', function () { Cart.add(P, qty); UI.toast('Ditambahkan ke keranjang', 'success'); });
  App.on('buy-now', function () { Cart.add(P, qty); App.go('cart.html'); });
  App.on('wish', function () {
    if (!Auth.user()) { App.requireLogin(); return; }
    Api.post('wishlist.toggle', { product_id: P.id }).then(function (r) {
      if (r.success) { setWish(r.data.wished); UI.toast(r.data.wished ? 'Disimpan ke favorit' : 'Dihapus dari favorit', 'info'); } else UI.toast(r.message, 'error');
    });
  });
})();
