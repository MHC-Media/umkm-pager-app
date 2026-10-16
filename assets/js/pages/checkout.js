/* checkout.js — Pembuatan pesanan (total dihitung ulang oleh server) */
(function () {
  var promo = { kode: '', diskon: 0 };
  function ongkirFor(sub) { var s = App.settings, flat = Number(s.ongkir_flat) || 0, free = Number(s.gratis_ongkir_min) || 0; return free > 0 && sub >= free ? 0 : flat; }
  function totals() {
    var items = Cart.get(), g = {}, sub = 0, ong = 0;
    items.forEach(function (i) { g[i.umkm_id] = (g[i.umkm_id] || 0) + i.harga * i.qty; sub += i.harga * i.qty; });
    Object.keys(g).forEach(function (k) { ong += ongkirFor(g[k]); });
    return { sub: sub, ong: ong, total: Math.max(0, sub - promo.diskon + ong), toko: Object.keys(g).length };
  }
  function summary() {
    var t = totals();
    UI.html('#sum', '<div class="flex justify-between text-sm"><span class="text-gray-500">Subtotal</span><span>' + E.rp(t.sub) + '</span></div>' +
      (promo.diskon ? '<div class="flex justify-between text-sm text-primary-600"><span>Diskon (' + E.esc(promo.kode) + ')</span><span>-' + E.rp(promo.diskon) + '</span></div>' : '') +
      '<div class="flex justify-between text-sm"><span class="text-gray-500">Ongkir (' + t.toko + ' toko)</span><span>' + E.rp(t.ong) + '</span></div>' +
      '<div class="flex justify-between border-t pt-2 font-bold"><span>Total</span><span class="text-primary-600">' + E.rp(t.total) + '</span></div>');
  }
  function done(orders) {
    UI.html('#app', '<div class="mx-auto max-w-lg space-y-4 px-4 py-8"><div class="card space-y-4 p-6 text-center"><div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">' + UI.icon('circle-check', 'w-8 h-8') + '</div>' +
      '<h1 class="text-xl font-bold">Pesanan Berhasil Dibuat</h1><p class="text-sm text-gray-500">Kirim detail pesanan ke penjual lewat WhatsApp agar segera diproses.</p>' +
      orders.map(function (o) {
        return '<div class="rounded-xl border p-3 text-left"><p class="text-xs text-gray-500">' + E.esc(o.order_no) + '</p><p class="font-semibold">' + E.esc(o.umkm_nama) + ' &middot; ' + E.rp(o.total) + '</p>' +
          '<a class="btn btn-primary btn-sm mt-2 w-full" target="_blank" rel="noopener noreferrer" href="' + E.esc(o.wa_url) + '">' + UI.icon('message-circle') + ' Kirim via WhatsApp</a></div>';
      }).join('') + '<a class="btn btn-outline w-full" href="' + E.link('orders.html') + '">Lihat Pesanan Saya</a></div></div>');
  }
  App.start({ nav: 'cart' }, function () {
    if (!App.requireLogin()) return;
    var items = Cart.get();
    if (!items.length) { App.go('cart.html'); return; }
    var u = Auth.user();
    return App.loadSettings().then(function () {
      var s = App.settings;
      UI.html('#app', '<div class="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-3"><form data-form="checkout" class="card space-y-5 p-5 lg:col-span-2" novalidate>' +
        '<h1 class="text-xl font-bold">Checkout</h1><div id="msg" role="alert" class="hidden rounded-lg bg-red-50 p-3 text-sm text-red-700"></div>' +
        '<div class="grid gap-4 sm:grid-cols-2"><div><label class="label" for="nama">Nama Penerima</label><input class="input" id="nama" required value="' + E.esc(u.nama) + '"></div>' +
        '<div><label class="label" for="wa">No. WhatsApp</label><input class="input" id="wa" type="tel" required value="' + E.esc(u.whatsapp) + '"></div></div>' +
        '<div><label class="label" for="alamat">Alamat Pengiriman</label><textarea class="input" id="alamat" rows="3" required placeholder="Jalan, RT/RW, nomor rumah, patokan">' + E.esc(u.alamat || '') + '</textarea></div>' +
        '<div><label class="label" for="catatan">Catatan (opsional)</label><input class="input" id="catatan" maxlength="200"></div>' +
        '<fieldset><legend class="label">Metode Pembayaran</legend><div class="grid gap-3 sm:grid-cols-3">' +
        [['WHATSAPP', 'Konfirmasi WhatsApp', 'Bayar sesuai kesepakatan dengan penjual'], ['COD', 'COD', 'Bayar tunai saat barang diterima'], ['TRANSFER', 'Transfer', 'Rekening dikirim penjual via WhatsApp']].map(function (m, n) {
          return '<label class="flex cursor-pointer flex-col rounded-xl border p-3 has-[:checked]:border-primary-600 has-[:checked]:bg-primary-50 dark:has-[:checked]:bg-primary-900/20"><span class="text-sm font-semibold">' + m[1] + '</span><span class="mt-1 text-xs text-gray-500">' + m[2] + '</span><input class="mt-2 accent-primary-600" type="radio" name="metode" value="' + m[0] + '"' + (n === 0 ? ' checked' : '') + '></label>';
        }).join('') + '</div><p class="mt-2 text-xs text-gray-500">' + E.esc(s.info_pembayaran || '') + '</p></fieldset>' +
        '<div><label class="label" for="kode">Kode Promo</label><div class="flex gap-2"><input class="input uppercase" id="kode" maxlength="30"><button type="button" class="btn btn-outline" data-action="promo">Terapkan</button></div></div>' +
        '<button class="btn btn-primary w-full" type="submit">' + UI.icon('message-circle') + ' Buat Pesanan</button></form>' +
        '<aside class="card h-fit space-y-3 p-5"><h2 class="border-b pb-3 font-bold">Pesanan Anda</h2>' + items.map(function (i) {
          return '<div class="flex justify-between gap-2 text-sm"><span class="line-clamp-1">' + E.esc(i.nama) + ' &times;' + i.qty + '</span><span>' + E.rp(i.harga * i.qty) + '</span></div>';
        }).join('') + '<div id="sum" class="space-y-2 border-t pt-3"></div><p class="text-xs text-gray-500">Total akhir dihitung ulang oleh server sesuai harga & stok terbaru.</p></aside></div>');
      summary();
    });
  });
  App.on('promo', function (el) {
    var kode = document.getElementById('kode').value.trim();
    if (!kode) { promo = { kode: '', diskon: 0 }; summary(); return; }
    var sub = totals().sub; UI.busy(el, true, '...');
    Api.post('promo.check', { kode: kode, subtotal: sub }).then(function (r) {
      UI.busy(el, false);
      if (!r.success) { promo = { kode: '', diskon: 0 }; summary(); return UI.toast(r.message, 'error'); }
      promo = { kode: r.data.kode, diskon: r.data.diskon }; summary(); UI.toast('Promo diterapkan: -' + E.rp(r.data.diskon), 'success');
    });
  });
  App.form('checkout', function (form) {
    var btn = form.querySelector('[type=submit]'), box = document.getElementById('msg');
    var body = {
      items: Cart.get().map(function (i) { return { product_id: i.id, qty: i.qty }; }), nama: form.nama.value.trim(), whatsapp: form.wa.value.trim(),
      alamat: form.alamat.value.trim(), catatan: form.catatan.value.trim(), metode: form.metode.value, kode_promo: promo.kode
    };
    UI.busy(btn, true, 'Memproses...');
    Api.post('orders.create', body).then(function (r) {
      UI.busy(btn, false);
      if (!r.success) { box.textContent = r.message; box.classList.remove('hidden'); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      Cart.clear(); done(r.data.orders);
    });
  });
})();
