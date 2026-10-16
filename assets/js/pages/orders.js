/* orders.js — Pesanan saya: status, batalkan, konfirmasi terima, ulasan */
(function () {
  var list = [], filter = '';
  var STEPS = { BARU: 'Pesanan dibuat', DIPROSES: 'Diproses penjual', DIKIRIM: 'Dikirim', SELESAI: 'Selesai', BATAL: 'Dibatalkan' };

  function card(o) {
    return '<div class="card space-y-3 p-4"><div class="flex flex-wrap items-center justify-between gap-2"><div><p class="text-xs text-gray-500">' + E.esc(o.order_no) + ' &middot; ' + E.tgl(o.created_at) + '</p><p class="font-semibold">' + E.esc(o.umkm_nama) + '</p></div>' + UI.badge(o.status) + '</div>' +
      o.items.map(function (i) { return '<div class="flex items-center gap-3 text-sm"><img data-fallback loading="lazy" src="' + E.img(i.foto) + '" alt="" class="h-12 w-12 rounded-lg object-cover"><span class="flex-1 line-clamp-1">' + E.esc(i.nama_produk) + ' &times;' + i.qty + '</span><span>' + E.rp(i.subtotal) + '</span></div>'; }).join('') +
      '<div class="flex items-center justify-between border-t pt-3"><span class="text-sm">Total <b class="text-primary-600">' + E.rp(o.total) + '</b></span><button class="btn btn-outline btn-sm" data-action="detail" data-no="' + E.esc(o.order_no) + '">Detail</button></div></div>';
  }
  function draw() {
    var rows = list.filter(function (o) { return !filter || o.status === filter; });
    UI.html('#box', rows.length ? rows.map(card).join('') : UI.empty('package', 'Belum ada pesanan', 'Pesanan Anda akan muncul di sini.', '<a class="btn btn-primary" href="' + E.link('products.html') + '">Mulai Belanja</a>'));
    UI.html('#tabs', [''].concat(['BARU', 'DIPROSES', 'DIKIRIM', 'SELESAI', 'BATAL']).map(function (s) {
      return '<button class="tab ' + (filter === s ? 'tab-active' : 'border') + '" data-action="flt" data-s="' + s + '">' + (s || 'Semua') + '</button>';
    }).join(''));
  }
  function load() {
    return Api.post('orders.list').then(function (r) {
      if (!r.success) { UI.html('#box', UI.error(r.message, 'retry')); return; }
      list = r.data; draw();
    });
  }
  App.start({ nav: 'orders' }, function () {
    if (!App.requireLogin()) return;
    UI.html('#app', '<div class="mx-auto max-w-3xl space-y-4 px-4 py-6"><h1 class="text-xl font-bold">Pesanan Saya</h1><div id="tabs" class="no-scrollbar flex gap-2 overflow-x-auto"></div><div id="box" class="space-y-3">' + UI.skeletons(2, 'h-32') + '</div></div>');
    return load();
  });
  App.on('flt', function (el) { filter = el.getAttribute('data-s'); draw(); });
  App.on('retry', load);

  var modal = null;
  function find(no) { return list.filter(function (o) { return o.order_no === no; })[0]; }
  App.on('detail', function (el) {
    var o = find(el.getAttribute('data-no')); if (!o) return;
    var acts = '';
    if (o.status === 'BARU') acts += '<button class="btn btn-danger btn-sm" data-action="cancel" data-no="' + E.esc(o.order_no) + '">Batalkan Pesanan</button>';
    if (o.status === 'DIKIRIM') acts += '<button class="btn btn-primary btn-sm" data-action="complete" data-no="' + E.esc(o.order_no) + '">Pesanan Diterima</button>';
    var items = o.items.map(function (i) {
      return '<div class="flex items-center gap-3 text-sm"><span class="flex-1">' + E.esc(i.nama_produk) + ' &times;' + i.qty + '</span><span>' + E.rp(i.subtotal) + '</span>' +
        (o.status === 'SELESAI' ? '<button class="btn btn-soft btn-sm" data-action="review" data-no="' + E.esc(o.order_no) + '" data-pid="' + E.esc(i.product_id) + '" data-name="' + E.esc(i.nama_produk) + '">Ulas</button>' : '') + '</div>';
    }).join('');
    modal = UI.modal('<div class="space-y-4 text-sm"><div class="flex items-center justify-between">' + UI.badge(o.status) + UI.badge(o.status_bayar) + '</div>' +
      '<div class="space-y-2">' + items + '</div><div class="space-y-1 border-t pt-3"><div class="flex justify-between"><span class="text-gray-500">Subtotal</span><span>' + E.rp(o.subtotal) + '</span></div>' +
      (o.diskon ? '<div class="flex justify-between"><span class="text-gray-500">Diskon</span><span>-' + E.rp(o.diskon) + '</span></div>' : '') +
      '<div class="flex justify-between"><span class="text-gray-500">Ongkir</span><span>' + E.rp(o.ongkir) + '</span></div><div class="flex justify-between font-bold"><span>Total</span><span>' + E.rp(o.total) + '</span></div></div>' +
      '<div class="space-y-1 border-t pt-3"><p><b>Penerima:</b> ' + E.esc(o.nama) + ' (' + E.esc(o.whatsapp) + ')</p><p><b>Alamat:</b> ' + E.esc(o.alamat) + '</p><p><b>Pembayaran:</b> ' + E.esc(o.metode) + '</p></div>' +
      '<div class="space-y-2 border-t pt-3"><p class="font-semibold">Riwayat Status</p>' + o.history.map(function (h) { return '<p class="flex justify-between text-xs"><span>' + E.esc(STEPS[h.status] || h.status) + (h.catatan && h.catatan !== 'Pesanan dibuat' ? ' — ' + E.esc(h.catatan) : '') + '</span><span class="text-gray-500">' + E.tgl(h.waktu) + '</span></p>'; }).join('') + '</div>' +
      '<div class="flex flex-wrap gap-2 border-t pt-3">' + acts + '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" href="' + E.esc(E.waLink(o.umkm_wa, 'Halo, saya menanyakan pesanan ' + o.order_no)) + '">' + UI.icon('message-circle') + ' Hubungi Penjual</a></div></div>',
      { title: 'Pesanan ' + o.order_no, size: 'max-w-xl' });
  });
  App.on('cancel', function (el) {
    UI.confirm('Batalkan pesanan?', 'Pesanan yang dibatalkan tidak dapat dikembalikan.', { danger: true, ok: 'Ya, batalkan' }).then(function (ok) {
      if (!ok) return;
      Api.post('orders.cancel', { order_no: el.getAttribute('data-no') }).then(function (r) { UI.toast(r.message || (r.success ? 'Dibatalkan' : 'Gagal'), r.success ? 'success' : 'error'); if (r.success) { if (modal) modal.close(); load(); } });
    });
  });
  App.on('complete', function (el) {
    Api.post('orders.complete', { order_no: el.getAttribute('data-no') }).then(function (r) { UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); if (r.success) { if (modal) modal.close(); load(); } });
  });
  App.on('review', function (el) {
    var no = el.getAttribute('data-no'), pid = el.getAttribute('data-pid');
    var m = UI.modal('<form data-form="review" class="space-y-3"><p class="text-sm font-semibold">' + E.esc(el.getAttribute('data-name')) + '</p><div><label class="label" for="rt">Rating</label><select id="rt" class="input"><option value="5">5 - Sangat baik</option><option value="4">4 - Baik</option><option value="3">3 - Cukup</option><option value="2">2 - Kurang</option><option value="1">1 - Buruk</option></select></div>' +
      '<div><label class="label" for="kmt">Komentar</label><textarea id="kmt" class="input" rows="3" maxlength="400"></textarea></div><button class="btn btn-primary w-full" type="submit">Kirim Ulasan</button></form>', { title: 'Beri Ulasan' });
    m.body.querySelector('form').dataset.no = no; m.body.querySelector('form').dataset.pid = pid;
    m.body.querySelector('form').addEventListener('submit', function () { setTimeout(function () { m.close(); }, 0); });
  });
  App.form('review', function (f) {
    Api.post('reviews.add', { order_no: f.dataset.no, product_id: f.dataset.pid, rating: Number(f.querySelector('#rt').value), komentar: f.querySelector('#kmt').value }).then(function (r) { UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); });
  });
})();
