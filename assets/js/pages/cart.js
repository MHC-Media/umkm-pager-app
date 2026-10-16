/* cart.js — Keranjang belanja (harga & stok disegarkan dari server) */
(function () {
  function refresh() {
    var items = Cart.get();
    if (!items.length) return Promise.resolve();
    return Api.post('cart.validate', { items: items.map(function (i) { return { product_id: i.id }; }) }).then(function (r) {
      if (!r.success) return;
      var map = {}; r.data.forEach(function (p) { map[p.product_id] = p; });
      var out = [], changed = false;
      items.forEach(function (i) {
        var p = map[i.id];
        if (!p || !p.available) { changed = true; return; }
        if (p.harga !== i.harga || p.stok !== i.stok) changed = true;
        i.harga = p.harga; i.stok = p.stok; i.nama = p.nama_produk; i.foto = p.foto_utama; i.umkm_nama = p.umkm_nama; i.umkm_id = p.umkm_id;
        i.qty = Math.min(i.qty, p.stok); out.push(i);
      });
      Cart.set(out);
      if (changed) UI.toast('Keranjang diperbarui sesuai harga & stok terbaru.', 'info');
    });
  }

  function ongkirFor(sub) {
    var s = App.settings, flat = Number(s.ongkir_flat) || 0, free = Number(s.gratis_ongkir_min) || 0;
    return free > 0 && sub >= free ? 0 : flat;
  }

  function render() {
    var items = Cart.get();
    if (!items.length) {
      UI.html('#app', '<div class="mx-auto grid max-w-2xl p-6">' + UI.empty('shopping-cart', 'Keranjang masih kosong', 'Yuk, temukan produk berkualitas dari UMKM warga Kelurahan Pager.', '<a class="btn btn-primary" href="' + E.link('products.html') + '">Mulai Belanja</a>') + '</div>');
      return;
    }
    var groups = {};
    items.forEach(function (i) { (groups[i.umkm_id] = groups[i.umkm_id] || { nama: i.umkm_nama, items: [] }).items.push(i); });
    var total = 0, ongkir = 0, sub = 0;
    var html = Object.keys(groups).map(function (k) {
      var g = groups[k], gs = g.items.reduce(function (s, i) { return s + i.harga * i.qty; }, 0);
      sub += gs; ongkir += ongkirFor(gs);
      return '<div class="card space-y-3 p-4"><h2 class="flex items-center gap-2 text-sm font-bold">' + UI.icon('store') + E.esc(g.nama) + '</h2>' + g.items.map(function (i) {
        return '<div class="flex gap-3 border-t pt-3"><img data-fallback src="' + E.img(i.foto) + '" alt="" class="h-20 w-20 flex-shrink-0 rounded-xl bg-gray-100 object-cover">' +
          '<div class="flex-1"><a href="' + E.link('product-detail.html', { slug: i.slug }) + '" class="line-clamp-2 text-sm font-semibold">' + E.esc(i.nama) + '</a><p class="text-sm font-bold text-primary-600">' + E.rp(i.harga) + '</p>' +
          '<div class="mt-2 flex items-center gap-2"><button class="btn btn-outline btn-sm" data-action="dec" data-id="' + E.esc(i.id) + '" aria-label="Kurangi">' + UI.icon('minus') + '</button><span class="w-6 text-center text-sm font-semibold">' + i.qty + '</span>' +
          '<button class="btn btn-outline btn-sm" data-action="inc" data-id="' + E.esc(i.id) + '" aria-label="Tambah"' + (i.qty >= i.stok ? ' disabled' : '') + '>' + UI.icon('plus') + '</button>' +
          '<button class="ml-auto p-1 text-red-500" data-action="del" data-id="' + E.esc(i.id) + '" aria-label="Hapus">' + UI.icon('trash-2', 'w-4 h-4') + '</button></div>' +
          (i.stok <= 5 ? '<p class="mt-1 text-xs text-amber-600">Sisa stok ' + i.stok + '</p>' : '') + '</div></div>';
      }).join('') + '</div>';
    }).join('');
    total = sub + ongkir;
    UI.html('#app', '<div class="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-3"><div class="space-y-4 lg:col-span-2"><h1 class="text-xl font-bold">Keranjang Belanja</h1>' + html + '</div>' +
      '<aside class="card h-fit space-y-3 p-5"><h2 class="border-b pb-3 font-bold">Ringkasan</h2><div class="flex justify-between text-sm"><span class="text-gray-500">Subtotal</span><span class="font-semibold">' + E.rp(sub) + '</span></div>' +
      '<div class="flex justify-between text-sm"><span class="text-gray-500">Ongkir (' + Object.keys(groups).length + ' toko)</span><span class="font-semibold">' + E.rp(ongkir) + '</span></div>' +
      '<div class="flex justify-between border-t pt-3 text-base font-bold"><span>Total</span><span class="text-primary-600">' + E.rp(total) + '</span></div>' +
      '<a class="btn btn-primary w-full" href="' + E.link('checkout.html') + '">Lanjut ke Checkout</a></aside></div>');
  }

  App.start({ nav: 'cart' }, function () {
    UI.html('#app', '<div class="mx-auto max-w-6xl p-6">' + UI.skeletons(2, 'h-32 mb-3') + '</div>');
    return App.loadSettings().then(function () { render(); return refresh().then(render); });
  });
  App.on('inc', function (el) { var i = Cart.get().filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (i) { Cart.setQty(i.id, i.qty + 1); render(); } });
  App.on('dec', function (el) { var i = Cart.get().filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (i) { Cart.setQty(i.id, i.qty - 1); render(); } });
  App.on('del', function (el) { Cart.remove(el.getAttribute('data-id')); render(); });
})();
