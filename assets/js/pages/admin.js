/* admin.js — Dasbor admin kelurahan */
(function () {
  var tab = 'ringkasan';
  var TABS = [['ringkasan', 'Ringkasan', 'layout-dashboard'], ['umkm', 'UMKM', 'store'], ['pesanan', 'Pesanan', 'clipboard-list'], ['produk', 'Produk', 'package'], ['pengguna', 'Pengguna', 'users'],
    ['kategori', 'Kategori', 'tag'], ['promo', 'Promo', 'ticket'], ['banner', 'Banner', 'image'], ['berita', 'Berita', 'newspaper'], ['ulasan', 'Ulasan', 'star'], ['pengaturan', 'Pengaturan', 'settings'], ['sistem', 'Backup & Log', 'database']];
  var cache = {};
  var umkmFilter = 'PENDING';

  /* konfigurasi CRUD generik */
  var CRUD = {
    kategori: { entity: 'categories', key: 'id', title: 'Kategori', cols: [['nama', 'Nama'], ['icon', 'Ikon'], ['urutan', 'Urutan'], ['aktif', 'Aktif', 'bool']],
      fields: [['nama', 'Nama', 'text', true], ['icon', 'Nama ikon (mis. utensils, coffee, tag)', 'text'], ['urutan', 'Urutan', 'number'], ['aktif', 'Aktif', 'check']] },
    promo: { entity: 'promos', key: 'kode', title: 'Promo', cols: [['kode', 'Kode'], ['tipe', 'Tipe'], ['nilai', 'Nilai'], ['min_belanja', 'Min. belanja', 'rp'], ['terpakai', 'Terpakai'], ['kuota', 'Kuota'], ['aktif', 'Aktif', 'bool']],
      fields: [['kode', 'Kode (huruf/angka)', 'text', true], ['deskripsi', 'Deskripsi', 'text'], ['tipe', 'Tipe', 'select', false, ['PERSEN', 'NOMINAL']], ['nilai', 'Nilai (% atau Rp)', 'number', true],
        ['min_belanja', 'Minimal belanja (Rp)', 'number'], ['maks_diskon', 'Maks. diskon (Rp, untuk persen)', 'number'], ['kuota', 'Kuota (0 = tak terbatas)', 'number'], ['mulai', 'Mulai (YYYY-MM-DD)', 'text'], ['selesai', 'Selesai (YYYY-MM-DD)', 'text'], ['aktif', 'Aktif', 'check']] },
    banner: { entity: 'banners', key: 'id', title: 'Banner', cols: [['judul', 'Judul'], ['subjudul', 'Subjudul'], ['urutan', 'Urutan'], ['aktif', 'Aktif', 'bool']],
      fields: [['judul', 'Judul', 'text', true], ['subjudul', 'Subjudul', 'text'], ['gambar', 'Gambar', 'image'], ['link', 'Tautan', 'text'], ['urutan', 'Urutan', 'number'], ['aktif', 'Aktif', 'check']] },
    berita: { entity: 'news', key: 'id', title: 'Berita / Event', cols: [['judul', 'Judul'], ['tipe', 'Tipe'], ['status', 'Status', 'badge'], ['created_at', 'Dibuat', 'date']],
      fields: [['judul', 'Judul', 'text', true], ['tipe', 'Tipe', 'select', false, ['BERITA', 'EVENT']], ['ringkasan', 'Ringkasan', 'text'], ['isi', 'Isi', 'textarea'], ['gambar', 'Gambar', 'image'],
        ['tanggal_event', 'Tanggal event (YYYY-MM-DD)', 'text'], ['lokasi', 'Lokasi', 'text'], ['status', 'Status', 'select', false, ['PUBLISHED', 'DRAFT']]] }
  };

  function shell() {
    UI.html('#app', '<div class="space-y-5"><div><h1 class="text-2xl font-bold">Portal Admin Kelurahan</h1><p class="text-sm text-gray-500">Kontrol, verifikasi, dan pengelolaan marketplace UMKM</p></div>' +
      '<div class="no-scrollbar flex gap-2 overflow-x-auto" role="tablist">' + TABS.map(function (t) {
        return '<button role="tab" class="tab ' + (tab === t[0] ? 'tab-active' : 'border') + '" data-action="tab" data-tab="' + t[0] + '">' + UI.icon(t[2]) + ' ' + t[1] + '</button>'; }).join('') + '</div><div id="pane"></div></div>');
    show();
  }
  function show() {
    UI.html('#pane', UI.skeletons(1, 'h-40'));
    if (CRUD[tab]) return pCrud(tab);
    ({ ringkasan: pRingkasan, umkm: pUmkm, pesanan: pPesanan, produk: pProduk, pengguna: pPengguna, ulasan: pUlasan, pengaturan: pPengaturan, sistem: pSistem })[tab]();
  }
  function err(r) { UI.html('#pane', '<div class="grid">' + UI.error(r.message, 'reload') + '</div>'); }
  function table(cols, rows, rowFn, empty) {
    return '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50 dark:bg-gray-700/50"><tr>' + cols.map(function (c) { return '<th class="th">' + c + '</th>'; }).join('') + '</tr></thead><tbody class="divide-y">' +
      (rows.length ? rows.map(rowFn).join('') : '<tr><td class="td py-10 text-center text-gray-500" colspan="' + cols.length + '">' + (empty || 'Tidak ada data.') + '</td></tr>') + '</tbody></table></div>';
  }
  function toolbar(entity, extra) {
    return '<div class="flex flex-wrap items-center gap-2"><input class="input !w-64" type="search" placeholder="Cari..." aria-label="Cari" data-search="' + entity + '" value="' + E.esc((cache['q_' + entity]) || '') + '">' + (extra || '') + '</div>';
  }
  function list(entity, cb) { Api.post('admin.list', { entity: entity, q: cache['q_' + entity] || '', limit: 300 }).then(function (r) { if (!r.success) return err(r); cb(r.data.rows, r.data.total); }); }

  function pRingkasan() {
    Api.post('admin.stats').then(function (r) {
      if (!r.success) return err(r);
      var d = r.data, s = d.stats, max = Math.max.apply(null, d.harian.map(function (x) { return x.pesanan; }).concat([1]));
      function box(l, v, i) { return '<div class="card flex items-center gap-4 p-5"><div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/40">' + UI.icon(i, 'w-5 h-5') + '</div><div><p class="text-xs font-semibold uppercase text-gray-500">' + l + '</p><p class="text-2xl font-extrabold">' + v + '</p></div></div>'; }
      UI.html('#pane', '<div class="space-y-5"><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">' + box('Total Pengguna', s.total_users, 'users') + box('UMKM Aktif', s.total_umkm, 'store') + box('Menunggu Verifikasi', s.total_umkm_pending, 'clock') +
        box('Total Produk', s.total_products, 'package') + box('Total Pesanan', s.total_orders, 'clipboard-list') + box('Omzet (Selesai)', E.rp(s.omzet), 'wallet') + '</div>' +
        '<div class="grid gap-4 lg:grid-cols-2"><div class="card p-5"><h2 class="mb-4 font-bold">Pesanan 7 Hari Terakhir</h2><div class="flex h-40 items-end gap-2">' + d.harian.map(function (x) {
          return '<div class="flex flex-1 flex-col items-center justify-end gap-1"><span class="text-xs font-semibold">' + x.pesanan + '</span><div class="w-full rounded-t bg-primary-600" data-h="' + Math.round(x.pesanan / max * 100) + '"></div><span class="text-[10px] text-gray-500">' + x.tanggal.slice(8) + '/' + x.tanggal.slice(5, 7) + '</span></div>'; }).join('') + '</div></div>' +
        '<div class="card space-y-3 p-5"><h2 class="font-bold">Pesanan per Status</h2>' + Object.keys(d.per_status).map(function (k) {
          var tot = Math.max(s.total_orders, 1); return '<div><div class="mb-1 flex justify-between text-xs"><span>' + k + '</span><b>' + d.per_status[k] + '</b></div><div class="h-2 rounded-full bg-gray-100 dark:bg-gray-700"><div class="h-2 rounded-full bg-primary-600" data-w="' + (d.per_status[k] / tot * 100) + '"></div></div></div>'; }).join('') + '</div></div>' +
        '<div class="card p-5"><h2 class="mb-3 font-bold">Produk Terlaris</h2>' + (d.produk_terlaris.length ? '<ol class="list-decimal space-y-1 pl-5 text-sm">' + d.produk_terlaris.map(function (p) { return '<li>' + E.esc(p.nama_produk) + ' — <b>' + p.terjual + '</b> terjual</li>'; }).join('') + '</ol>' : '<p class="text-sm text-gray-500">Belum ada penjualan.</p>') + '</div>' +
        '<div><h2 class="mb-2 font-bold">Menunggu Verifikasi (' + d.pending_umkm.length + ')</h2>' + table(['Usaha', 'Kategori', 'Pemilik', 'WhatsApp', 'Aksi'], d.pending_umkm, function (u) {
          return '<tr><td class="td font-semibold">' + E.esc(u.nama_usaha) + '</td><td class="td">' + E.esc(u.kategori) + '</td><td class="td">' + E.esc(u.pemilik) + '</td><td class="td">' + E.esc(u.whatsapp) + '</td><td class="td whitespace-nowrap">' +
            '<button class="btn btn-primary btn-sm" data-action="verify" data-id="' + E.esc(u.id) + '" data-st="ACTIVE">Setujui</button> <button class="btn btn-outline btn-sm text-red-600" data-action="verify" data-id="' + E.esc(u.id) + '" data-st="REJECTED">Tolak</button></td></tr>'; }, 'Tidak ada pendaftaran yang menunggu.') + '</div></div>');
      document.querySelectorAll('[data-h]').forEach(function (b) { b.style.height = Math.max(4, Number(b.getAttribute('data-h')) * 1.2) + 'px'; });
    });
  }

  App.on('verify', function (el) {
    var st = el.getAttribute('data-st'), id = el.getAttribute('data-id');
    function run(note) {
      Api.post('admin.umkm.verify', { umkm_id: id, status: st, catatan: note || '' }).then(function (r) { UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); show(); });
    }
    if (st === 'ACTIVE') return UI.confirm('Setujui UMKM', 'UMKM akan tampil di marketplace publik.').then(function (ok) { if (ok) run(); });
    var m = UI.modal('<form data-form="verify-note" class="space-y-3"><label class="label" for="vn">Catatan untuk penjual (opsional)</label><textarea id="vn" class="input" rows="3" maxlength="200"></textarea><button class="btn btn-danger w-full" type="submit">Ubah status menjadi ' + st + '</button></form>', { title: 'Alasan' });
    window.__vn = { m: m, run: run };
  });
  App.form('verify-note', function () { var n = document.getElementById('vn').value; window.__vn.m.close(); window.__vn.run(n); });

  function pUmkm() {
    Api.post('admin.umkm.list', { status: umkmFilter }).then(function (r) {
      if (!r.success) return err(r);
      UI.html('#pane', '<div class="space-y-4"><div class="no-scrollbar flex gap-2 overflow-x-auto">' + ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', ''].map(function (s) {
        return '<button class="tab ' + (umkmFilter === s ? 'tab-active' : 'border') + '" data-action="ufilter" data-s="' + s + '">' + (s || 'Semua') + '</button>'; }).join('') + '</div>' +
        table(['Usaha', 'Kategori', 'Pemilik', 'WhatsApp', 'Status', 'Aksi'], r.data, function (u) {
          return '<tr><td class="td"><p class="font-semibold">' + E.esc(u.nama_usaha) + '</p><p class="text-xs text-gray-500">' + E.esc(u.alamat) + '</p></td><td class="td">' + E.esc(u.kategori) + '</td><td class="td">' + E.esc(u.pemilik) + '</td><td class="td">' + E.esc(u.whatsapp) + '</td><td class="td">' + UI.badge(u.status) + '</td><td class="td whitespace-nowrap">' +
            (u.status !== 'ACTIVE' ? '<button class="btn btn-primary btn-sm" data-action="verify" data-id="' + E.esc(u.id) + '" data-st="ACTIVE">Aktifkan</button> ' : '') +
            (u.status === 'ACTIVE' ? '<button class="btn btn-outline btn-sm text-red-600" data-action="verify" data-id="' + E.esc(u.id) + '" data-st="SUSPENDED">Tangguhkan</button>' : '') +
            (u.status === 'PENDING' ? '<button class="btn btn-outline btn-sm text-red-600" data-action="verify" data-id="' + E.esc(u.id) + '" data-st="REJECTED">Tolak</button>' : '') + '</td></tr>'; }, 'Tidak ada data.') + '</div>');
    });
  }
  App.on('ufilter', function (el) { umkmFilter = el.getAttribute('data-s'); pUmkm(); });

  function pPesanan() {
    list('orders', function (rows, total) {
      UI.html('#pane', '<div class="space-y-4"><div class="flex flex-wrap items-center justify-between gap-2">' + toolbar('orders') + '<button class="btn btn-outline btn-sm" data-action="csv-orders">' + UI.icon('download') + ' Ekspor CSV</button></div>' +
        table(['No. Order', 'Tanggal', 'Toko', 'Pembeli', 'Metode', 'Total', 'Status', 'Bayar'], rows, function (o) {
          return '<tr><td class="td font-semibold">' + E.esc(o.order_no) + '</td><td class="td">' + E.tgl(o.created_at) + '</td><td class="td">' + E.esc(o.umkm_nama) + '</td><td class="td">' + E.esc(o.nama) + '</td><td class="td">' + E.esc(o.metode) + '</td><td class="td">' + E.rp(o.total) + '</td><td class="td">' + UI.badge(o.status) + '</td><td class="td">' + UI.badge(o.status_bayar) + '</td></tr>'; }) +
        '<p class="text-xs text-gray-500">Menampilkan ' + rows.length + ' dari ' + total + ' pesanan.</p></div>');
      cache.orders = rows;
    });
  }
  App.on('csv-orders', function () {
    UI.csv('pesanan-' + new Date().toISOString().slice(0, 10) + '.csv', [['order_no', 'No Order'], ['created_at', 'Tanggal'], ['umkm_nama', 'Toko'], ['nama', 'Pembeli'], ['whatsapp', 'WA'], ['metode', 'Metode'], ['subtotal', 'Subtotal'], ['ongkir', 'Ongkir'], ['diskon', 'Diskon'], ['total', 'Total'], ['status', 'Status'], ['status_bayar', 'Pembayaran']].map(function (c) { return { key: c[0], label: c[1] }; }), cache.orders || []);
  });

  function pProduk() {
    list('products', function (rows) {
      UI.html('#pane', '<div class="space-y-4">' + toolbar('products') + table(['Produk', 'Toko', 'Harga', 'Stok', 'Status', 'Unggulan', 'Aksi'], rows, function (p) {
        return '<tr><td class="td"><div class="flex items-center gap-2"><img data-fallback class="h-10 w-10 rounded-lg object-cover" src="' + E.img(p.foto_utama) + '" alt=""><span class="font-semibold">' + E.esc(p.nama_produk) + '</span></div></td><td class="td">' + E.esc(p.umkm_nama) + '</td><td class="td">' + E.rp(p.harga) + '</td><td class="td">' + p.stok + '</td><td class="td">' + UI.badge(p.status) + '</td>' +
          '<td class="td"><button class="btn btn-sm ' + (p.unggulan ? 'btn-primary' : 'btn-outline') + '" data-action="p-feature" data-id="' + E.esc(p.id) + '" data-v="' + (p.unggulan ? '' : '1') + '">' + UI.icon('star') + '</button></td>' +
          '<td class="td whitespace-nowrap"><button class="btn btn-outline btn-sm" data-action="p-toggle" data-id="' + E.esc(p.id) + '" data-v="' + (p.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE') + '">' + (p.status === 'ACTIVE' ? 'Sembunyikan' : 'Aktifkan') + '</button> <button class="btn btn-outline btn-sm text-red-600" data-action="del" data-entity="products" data-id="' + E.esc(p.id) + '" aria-label="Hapus">' + UI.icon('trash-2') + '</button></td></tr>'; }) + '</div>');
    });
  }
  function save(entity, data, done) { Api.post('admin.save', { entity: entity, data: data }).then(function (r) { UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); if (r.success) (done || show)(); }); }
  App.on('p-feature', function (el) { save('products', { id: el.getAttribute('data-id'), unggulan: !!el.getAttribute('data-v') }); });
  App.on('p-toggle', function (el) { save('products', { id: el.getAttribute('data-id'), status: el.getAttribute('data-v') }); });

  App.on('del', function (el) {
    UI.confirm('Hapus data', 'Data akan dihapus permanen. Lanjutkan?', { danger: true, ok: 'Hapus' }).then(function (ok) {
      if (!ok) return;
      Api.post('admin.delete', { entity: el.getAttribute('data-entity'), id: el.getAttribute('data-id') }).then(function (r) { UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); show(); });
    });
  });

  function pPengguna() {
    list('users', function (rows) {
      var me = Auth.user();
      UI.html('#pane', '<div class="space-y-4">' + toolbar('users') + table(['Nama', 'Kontak', 'Peran', 'Status', 'Terdaftar', 'Aksi'], rows, function (u) {
        var self = u.id === me.id;
        return '<tr><td class="td font-semibold">' + E.esc(u.nama) + '</td><td class="td"><p>' + E.esc(u.whatsapp || '-') + '</p><p class="text-xs text-gray-500">' + E.esc(u.email) + '</p></td>' +
          '<td class="td">' + (self ? UI.badge(u.role) : '<select class="input !w-28 !py-1" data-change="u-role" data-id="' + E.esc(u.id) + '">' + ['WARGA', 'UMKM', 'ADMIN'].map(function (r) { return '<option' + (u.role === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select>') + '</td>' +
          '<td class="td">' + UI.badge(u.status) + '</td><td class="td">' + E.tgl(u.created_at, false) + '</td><td class="td whitespace-nowrap">' + (self ? '<span class="text-xs text-gray-400">Akun Anda</span>' :
            '<button class="btn btn-outline btn-sm" data-action="u-status" data-id="' + E.esc(u.id) + '" data-v="' + (u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE') + '">' + (u.status === 'ACTIVE' ? 'Blokir' : 'Aktifkan') + '</button> <button class="btn btn-outline btn-sm" data-action="u-reset" data-id="' + E.esc(u.id) + '">' + UI.icon('key-round') + ' Reset</button>') + '</td></tr>'; }) + '</div>');
    });
  }
  App.on('u-status', function (el) { save('users', { id: el.getAttribute('data-id'), status: el.getAttribute('data-v') }); });
  App.on('u-reset', function (el) {
    UI.confirm('Reset password', 'Buat password sementara untuk pengguna ini? Semua sesi aktifnya akan diakhiri.').then(function (ok) {
      if (!ok) return;
      Api.post('admin.user.reset', { user_id: el.getAttribute('data-id') }).then(function (r) {
        if (!r.success) return UI.toast(r.message, 'error');
        UI.modal('<p class="text-sm">Sampaikan password sementara ini kepada pengguna (hanya tampil sekali):</p><p class="my-4 select-all rounded-xl bg-gray-100 p-4 text-center font-mono text-lg font-bold dark:bg-gray-700">' + E.esc(r.data.password_sementara) + '</p><p class="text-xs text-gray-500">Pengguna wajib menggantinya saat masuk.</p>', { title: 'Password Sementara', size: 'max-w-sm' });
      });
    });
  });
  document.addEventListener('change', function (e) {
    var s = e.target.closest && e.target.closest('[data-change="u-role"]');
    if (s) save('users', { id: s.getAttribute('data-id'), role: s.value });
  });

  function pUlasan() {
    list('reviews', function (rows) {
      UI.html('#pane', '<div class="space-y-4">' + table(['Produk', 'Pengulas', 'Rating', 'Komentar', 'Status', 'Aksi'], rows, function (r) {
        return '<tr><td class="td">' + E.esc(r.produk) + '</td><td class="td">' + E.esc(r.nama) + '</td><td class="td">' + UI.stars(r.rating) + '</td><td class="td max-w-xs">' + E.esc(r.komentar) + '</td><td class="td">' + UI.badge(r.status) + '</td>' +
          '<td class="td whitespace-nowrap"><button class="btn btn-outline btn-sm" data-action="r-toggle" data-id="' + E.esc(r.id) + '" data-v="' + (r.status === 'APPROVED' ? 'HIDDEN' : 'APPROVED') + '">' + (r.status === 'APPROVED' ? 'Sembunyikan' : 'Tampilkan') + '</button> <button class="btn btn-outline btn-sm text-red-600" data-action="del" data-entity="reviews" data-id="' + E.esc(r.id) + '" aria-label="Hapus">' + UI.icon('trash-2') + '</button></td></tr>'; }, 'Belum ada ulasan.') + '</div>');
    });
  }
  App.on('r-toggle', function (el) { save('reviews', { id: el.getAttribute('data-id'), status: el.getAttribute('data-v') }); });

  /* ---- CRUD generik ---- */
  function pCrud(name) {
    var c = CRUD[name];
    list(c.entity, function (rows) {
      cache['rows_' + name] = rows;
      UI.html('#pane', '<div class="space-y-4"><div class="flex justify-between gap-2">' + toolbar(c.entity) + '<button class="btn btn-primary" data-action="c-form">' + UI.icon('plus') + ' Tambah</button></div>' +
        table(c.cols.map(function (x) { return x[1]; }).concat(['Aksi']), rows, function (r) {
          return '<tr>' + c.cols.map(function (x) {
            var v = r[x[0]];
            return '<td class="td">' + (x[2] === 'bool' ? UI.badge(v ? 'ACTIVE' : 'DRAFT', v ? 'Ya' : 'Tidak') : x[2] === 'badge' ? UI.badge(v) : x[2] === 'rp' ? E.rp(v) : x[2] === 'date' ? E.tgl(v, false) : E.esc(v)) + '</td>'; }).join('') +
            '<td class="td whitespace-nowrap"><button class="btn btn-outline btn-sm" data-action="c-form" data-id="' + E.esc(r[c.key]) + '" aria-label="Ubah">' + UI.icon('pencil') + '</button> <button class="btn btn-outline btn-sm text-red-600" data-action="del" data-entity="' + c.entity + '" data-id="' + E.esc(r[c.key]) + '" aria-label="Hapus">' + UI.icon('trash-2') + '</button></td></tr>'; }, 'Belum ada data.') + '</div>');
    });
  }
  App.on('c-form', function (el) {
    var c = CRUD[tab], id = el.getAttribute('data-id');
    var r = (cache['rows_' + tab] || []).filter(function (x) { return String(x[c.key]) === id; })[0] || {};
    var html = c.fields.map(function (f) {
      var n = f[0], v = r[n] === undefined ? (f[2] === 'check' ? true : '') : r[n], id2 = 'cf-' + n;
      if (f[2] === 'check') return '<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="' + n + '"' + (v ? ' checked' : '') + ' class="accent-primary-600"> ' + f[1] + '</label>';
      var lab = '<label class="label" for="' + id2 + '">' + f[1] + '</label>';
      if (f[2] === 'select') return '<div>' + lab + '<select id="' + id2 + '" name="' + n + '" class="input">' + f[4].map(function (o) { return '<option' + (v === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>';
      if (f[2] === 'textarea') return '<div>' + lab + '<textarea id="' + id2 + '" name="' + n + '" rows="6" maxlength="6000" class="input">' + E.esc(v) + '</textarea></div>';
      if (f[2] === 'image') return '<div>' + lab + '<div class="flex items-center gap-3"><img data-fallback id="prev-' + n + '" src="' + E.img(v) + '" class="h-16 w-24 rounded-lg bg-gray-100 object-cover" alt=""><input type="hidden" id="' + n + '" name="' + n + '" value="' + E.esc(E.url(v)) + '"><label class="btn btn-outline btn-sm cursor-pointer">' + UI.icon('upload') + ' Pilih<input type="file" class="hidden" accept="image/jpeg,image/png,image/webp" data-upload="' + n + '"></label></div></div>';
      return '<div>' + lab + '<input id="' + id2 + '" name="' + n + '" type="' + f[2] + '" class="input"' + (f[3] ? ' required' : '') + (f[2] === 'text' ? ' maxlength="200"' : '') + ' value="' + E.esc(v) + '"' + (c.key === n && id ? ' readonly' : '') + '></div>';
    }).join('');
    window.__cm = UI.modal('<form data-form="c-save" class="space-y-3" novalidate><input type="hidden" name="__id" value="' + E.esc(id || '') + '">' + html + '<button class="btn btn-primary w-full" type="submit">Simpan</button></form>', { title: (id ? 'Ubah ' : 'Tambah ') + c.title });
  });
  App.form('c-save', function (f) {
    var c = CRUD[tab], fd = new FormData(f), data = {};
    c.fields.forEach(function (x) { data[x[0]] = x[2] === 'check' ? fd.get(x[0]) !== null : fd.get(x[0]); });
    var id = fd.get('__id'); if (id) data[c.key] = id;
    Api.post('admin.save', { entity: c.entity, data: data }).then(function (r) { UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); if (r.success) { window.__cm.close(); show(); } });
  });
  document.addEventListener('change', function (e) {
    var inp = e.target.closest && e.target.closest('[data-upload]');
    if (!inp || !inp.files[0]) return;
    var t = inp.getAttribute('data-upload'); UI.toast('Mengunggah...', 'info');
    UI.uploadFile(inp.files[0], 1400).then(function (url) { document.getElementById(t).value = url; document.getElementById('prev-' + t).src = url; UI.toast('Gambar terunggah', 'success'); }).catch(function (er) { UI.toast(er.message, 'error'); });
  });
  document.addEventListener('input', E.debounce(function (e) {
    var s = e.target.closest && e.target.closest('[data-search]');
    if (!s) return; cache['q_' + s.getAttribute('data-search')] = s.value; var pos = s.selectionStart; show();
    setTimeout(function () { var n = document.querySelector('[data-search]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 600);
  }, 500));

  function pPengaturan() {
    Api.post('admin.settings.get').then(function (r) {
      if (!r.success) return err(r);
      var s = r.data;
      function t(k, l, type) { return '<div><label class="label" for="s-' + k + '">' + l + '</label><input id="s-' + k + '" name="' + k + '" type="' + (type || 'text') + '" class="input" value="' + E.esc(s[k]) + '"></div>'; }
      function c(k, l) { return '<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="' + k + '" class="accent-primary-600"' + (s[k] === 'true' ? ' checked' : '') + '> ' + l + '</label>'; }
      UI.html('#pane', '<form data-form="set-save" class="card mx-auto max-w-2xl space-y-3 p-5" novalidate>' + t('app_name', 'Nama aplikasi') + t('tagline', 'Tagline') + t('wa_admin', 'WhatsApp admin (628...)') + t('alamat_kelurahan', 'Alamat kantor kelurahan') + t('jam_layanan', 'Jam layanan') +
        '<div class="grid gap-3 sm:grid-cols-2">' + t('ongkir_flat', 'Ongkir flat per toko (Rp)', 'number') + t('gratis_ongkir_min', 'Gratis ongkir min. belanja (Rp, 0 = nonaktif)', 'number') + '</div>' +
        '<div><label class="label" for="s-info">Info pembayaran</label><textarea id="s-info" name="info_pembayaran" class="input" rows="2">' + E.esc(s.info_pembayaran) + '</textarea></div>' +
        c('register_open', 'Pendaftaran akun warga dibuka') + c('umkm_register_open', 'Pendaftaran UMKM dibuka') + c('maintenance', 'Mode pemeliharaan (hanya admin yang dapat mengakses)') +
        t('maintenance_msg', 'Pesan pemeliharaan') + '<button class="btn btn-primary w-full" type="submit">Simpan Pengaturan</button></form>');
    });
  }
  App.form('set-save', function (f) {
    var fd = new FormData(f), d = {};
    ['app_name', 'tagline', 'wa_admin', 'alamat_kelurahan', 'jam_layanan', 'ongkir_flat', 'gratis_ongkir_min', 'info_pembayaran', 'maintenance_msg'].forEach(function (k) { d[k] = fd.get(k); });
    ['register_open', 'umkm_register_open', 'maintenance'].forEach(function (k) { d[k] = fd.get(k) !== null; });
    Api.post('admin.settings.save', { settings: d }).then(function (r) { UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); try { sessionStorage.removeItem('pager_settings'); } catch (e) { /* abaikan */ } });
  });

  function pSistem() {
    Promise.all([Api.post('admin.backup.list'), Api.post('admin.list', { entity: 'logs', limit: 100 })]).then(function (rs) {
      var bk = rs[0].success ? rs[0].data : [], lg = rs[1].success ? rs[1].data.rows : [];
      UI.html('#pane', '<div class="space-y-5"><div class="card space-y-3 p-5"><div class="flex flex-wrap items-center justify-between gap-2"><div><h2 class="font-bold">Backup Database</h2><p class="text-sm text-gray-500">Salinan Spreadsheet disimpan di Google Drive. Backup otomatis berjalan tiap hari pukul 02.00.</p></div><button class="btn btn-primary" data-action="backup">' + UI.icon('database') + ' Backup Sekarang</button></div>' +
        (bk.length ? '<ul class="divide-y text-sm">' + bk.map(function (b) { return '<li class="flex justify-between py-2"><span>' + E.esc(b.name) + '</span><a class="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer" href="' + E.esc(E.url(b.url)) + '">Buka</a></li>'; }).join('') + '</ul>' : '<p class="text-sm text-gray-500">Belum ada backup.</p>') + '</div>' +
        '<div><h2 class="mb-2 font-bold">Log Aktivitas Terbaru</h2>' + table(['Waktu', 'Peran', 'Aksi', 'Detail'], lg, function (l) { return '<tr><td class="td whitespace-nowrap">' + E.tgl(l.waktu) + '</td><td class="td">' + E.esc(l.role) + '</td><td class="td font-semibold">' + E.esc(l.aksi) + '</td><td class="td">' + E.esc(l.detail) + '</td></tr>'; }) + '</div></div>');
    });
  }
  App.on('backup', function (el) {
    UI.busy(el, true, 'Membuat backup...');
    Api.post('admin.backup.run').then(function (r) { UI.busy(el, false); UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); if (r.success) pSistem(); });
  });

  App.on('tab', function (el) { tab = el.getAttribute('data-tab'); shell(); });
  App.on('reload', show);
  App.start({ layout: 'dash', roles: ['ADMIN'] }, shell);
})();
