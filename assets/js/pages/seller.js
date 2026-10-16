/* seller.js — Dasbor penjual UMKM: ringkasan, produk, pesanan, profil toko */
(function () {
  var tab = 'ringkasan', cats = [], products = [], umkm = null, statusFilter = '';
  var TABS = [['ringkasan', 'Ringkasan', 'layout-dashboard'], ['produk', 'Produk', 'package'], ['pesanan', 'Pesanan', 'clipboard-list'], ['profil', 'Profil Toko', 'store']];
  var NEXT = { BARU: [['DIPROSES', 'Proses'], ['BATAL', 'Tolak']], DIPROSES: [['DIKIRIM', 'Kirim'], ['BATAL', 'Batalkan']], DIKIRIM: [['SELESAI', 'Selesai']], SELESAI: [], BATAL: [] };

  function shell() {
    UI.html('#app', '<div class="space-y-5"><div><h1 class="text-2xl font-bold">Dasbor Toko</h1><p class="text-sm text-gray-500">Kelola produk, pesanan, dan profil usaha Anda</p></div>' +
      '<div class="no-scrollbar flex gap-2 overflow-x-auto" role="tablist">' + TABS.map(function (t) {
        return '<button role="tab" class="tab ' + (tab === t[0] ? 'tab-active' : 'border') + '" data-action="tab" data-tab="' + t[0] + '">' + UI.icon(t[2]) + ' ' + t[1] + '</button>';
      }).join('') + '</div><div id="pane"></div></div>');
    show();
  }
  function show() { UI.html('#pane', UI.skeletons(1, 'h-40')); ({ ringkasan: pRingkasan, produk: pProduk, pesanan: pPesanan, profil: pProfil })[tab](); }

  function pRingkasan() {
    Api.post('seller.stats').then(function (r) {
      if (!r.success) return UI.html('#pane', '<div class="grid">' + UI.error(r.message, 'reload') + '</div>');
      var d = r.data, notice = '';
      if (d.umkm_status === 'PENDING') notice = '<div class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Toko Anda sedang <b>menunggu verifikasi</b> admin kelurahan. Produk akan tampil di marketplace setelah disetujui.</div>';
      if (d.umkm_status === 'REJECTED') notice = '<div class="rounded-xl bg-red-50 p-4 text-sm text-red-800">Pendaftaran <b>ditolak</b>' + (d.catatan_admin ? ': ' + E.esc(d.catatan_admin) : '') + '. Perbaiki data di tab Profil Toko lalu simpan untuk mengajukan ulang.</div>';
      if (d.umkm_status === 'SUSPENDED') notice = '<div class="rounded-xl bg-red-50 p-4 text-sm text-red-800">Toko Anda <b>ditangguhkan</b>. Hubungi admin kelurahan.</div>';
      function box(l, v, i) { return '<div class="card flex items-center gap-4 p-5"><div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/40">' + UI.icon(i, 'w-5 h-5') + '</div><div><p class="text-xs font-semibold uppercase text-gray-500">' + l + '</p><p class="text-2xl font-extrabold">' + v + '</p></div></div>'; }
      UI.html('#pane', '<div class="space-y-5">' + notice + '<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">' +
        box('Produk', d.produk, 'package') + box('Pesanan Baru', d.per_status.BARU, 'clipboard-list') + box('Stok Menipis', d.stok_menipis, 'alert-triangle') + box('Omzet Selesai', E.rp(d.omzet), 'wallet') + '</div>' +
        '<div class="card p-5"><h2 class="mb-3 font-bold">Pesanan per Status</h2><div class="flex flex-wrap gap-3">' + Object.keys(d.per_status).map(function (s) { return '<span>' + UI.badge(s) + ' <b>' + d.per_status[s] + '</b></span>'; }).join('') + '</div></div></div>');
    });
  }

  function pProduk() {
    Promise.all([Api.post('seller.products.list'), cats.length ? { success: true, data: cats } : Api.get('categories', {}, { ttl: 120 })]).then(function (rs) {
      if (!rs[0].success) return UI.html('#pane', '<div class="grid">' + UI.error(rs[0].message, 'reload') + '</div>');
      products = rs[0].data; if (rs[1].success) cats = rs[1].data;
      UI.html('#pane', '<div class="space-y-4"><div class="flex justify-end"><button class="btn btn-primary" data-action="prod-form">' + UI.icon('plus') + ' Tambah Produk</button></div>' +
        '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50 dark:bg-gray-700/50"><tr><th class="th">Produk</th><th class="th">Harga</th><th class="th">Stok</th><th class="th">Status</th><th class="th text-center">Aksi</th></tr></thead><tbody class="divide-y">' +
        (products.length ? products.map(function (p) {
          return '<tr><td class="td"><div class="flex items-center gap-3"><img data-fallback src="' + E.img(p.foto_utama) + '" alt="" class="h-12 w-12 rounded-lg object-cover"><span class="font-semibold">' + E.esc(p.nama_produk) + '</span></div></td>' +
            '<td class="td font-bold text-primary-600">' + E.rp(p.harga) + '</td><td class="td ' + (p.stok <= 3 ? 'font-bold text-red-600' : '') + '">' + p.stok + ' ' + E.esc(p.satuan) + '</td><td class="td">' + UI.badge(p.status) + '</td>' +
            '<td class="td text-center whitespace-nowrap"><button class="btn btn-outline btn-sm" data-action="prod-form" data-id="' + E.esc(p.id) + '" aria-label="Ubah">' + UI.icon('pencil') + '</button> <button class="btn btn-outline btn-sm text-red-600" data-action="prod-del" data-id="' + E.esc(p.id) + '" aria-label="Hapus">' + UI.icon('trash-2') + '</button></td></tr>';
        }).join('') : '<tr><td colspan="5" class="td py-10 text-center text-gray-500">Belum ada produk. Klik "Tambah Produk".</td></tr>') + '</tbody></table></div></div>');
    });
  }

  function imgField(id, label, val) {
    return '<div><span class="label">' + label + '</span><div class="flex items-center gap-3"><img data-fallback id="prev-' + id + '" src="' + E.img(val) + '" alt="" class="h-16 w-16 rounded-lg bg-gray-100 object-cover">' +
      '<input type="hidden" id="' + id + '" value="' + E.esc(E.url(val)) + '"><label class="btn btn-outline btn-sm cursor-pointer">' + UI.icon('upload') + ' Pilih gambar<input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" data-upload="' + id + '"></label></div></div>';
  }

  App.on('prod-form', function (el) {
    var p = products.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0] || {};
    var g = p.foto_galeri || [];
    var m = UI.modal('<form data-form="prod-save" class="space-y-3" novalidate><input type="hidden" name="id" value="' + E.esc(p.id || '') + '">' +
      '<div><label class="label" for="f-nama">Nama produk</label><input id="f-nama" name="nama_produk" class="input" required maxlength="100" value="' + E.esc(p.nama_produk || '') + '"></div>' +
      '<div class="grid grid-cols-2 gap-3"><div><label class="label" for="f-kat">Kategori</label><select id="f-kat" name="kategori_id" class="input">' + cats.map(function (c) { return '<option value="' + E.esc(c.id) + '"' + (p.kategori_id === c.id ? ' selected' : '') + '>' + E.esc(c.nama) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="label" for="f-sat">Satuan</label><input id="f-sat" name="satuan" class="input" maxlength="15" value="' + E.esc(p.satuan || 'pcs') + '"></div></div>' +
      '<div class="grid grid-cols-3 gap-3"><div><label class="label" for="f-h">Harga (Rp)</label><input id="f-h" name="harga" type="number" min="100" class="input" required value="' + (p.harga || '') + '"></div>' +
      '<div><label class="label" for="f-hc">Harga coret</label><input id="f-hc" name="harga_coret" type="number" min="0" class="input" value="' + (p.harga_coret || '') + '"></div>' +
      '<div><label class="label" for="f-s">Stok</label><input id="f-s" name="stok" type="number" min="0" class="input" required value="' + (p.stok === undefined ? '' : p.stok) + '"></div></div>' +
      '<div><label class="label" for="f-d">Deskripsi</label><textarea id="f-d" name="deskripsi" rows="3" maxlength="1500" class="input">' + E.esc(p.deskripsi || '') + '</textarea></div>' +
      imgField('foto_utama', 'Foto utama', p.foto_utama) +
      '<div><span class="label">Foto tambahan (maks. 4)</span><div id="galeri" class="flex flex-wrap gap-2">' + g.map(function (u) { return '<div class="relative"><img data-fallback src="' + E.img(u) + '" class="h-14 w-14 rounded-lg object-cover" alt=""><input type="hidden" name="galeri" value="' + E.esc(u) + '"></div>'; }).join('') +
      '</div><label class="btn btn-outline btn-sm mt-2 cursor-pointer">' + UI.icon('plus') + ' Tambah foto<input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" data-upload="galeri"></label></div>' +
      '<div><label class="label" for="f-st">Status</label><select id="f-st" name="status" class="input"><option value="ACTIVE"' + (p.status !== 'DRAFT' ? ' selected' : '') + '>Aktif (tampil di toko)</option><option value="DRAFT"' + (p.status === 'DRAFT' ? ' selected' : '') + '>Draft (disembunyikan)</option></select></div>' +
      '<button class="btn btn-primary w-full" type="submit">Simpan Produk</button></form>', { title: p.id ? 'Ubah Produk' : 'Tambah Produk' });
    window.__modal = m;
  });

  document.addEventListener('change', function (e) {
    var inp = e.target.closest && e.target.closest('[data-upload]');
    if (!inp || !inp.files[0]) return;
    var target = inp.getAttribute('data-upload');
    UI.toast('Mengunggah gambar...', 'info');
    UI.uploadFile(inp.files[0], target === 'logo' || target === 'banner' ? 1200 : 1000).then(function (url) {
      if (target === 'galeri') {
        var box = document.getElementById('galeri');
        if (box.querySelectorAll('input').length >= 4) return UI.toast('Maksimal 4 foto tambahan', 'warn');
        var d = document.createElement('div'); d.className = 'relative';
        d.innerHTML = '<img src="' + E.img(url) + '" class="h-14 w-14 rounded-lg object-cover" alt=""><input type="hidden" name="galeri" value="' + E.esc(url) + '">';
        box.appendChild(d);
      } else {
        document.getElementById(target).value = url; document.getElementById('prev-' + target).src = url;
      }
      UI.toast('Gambar terunggah', 'success'); inp.value = '';
    }).catch(function (err) { UI.toast(err.message || 'Gagal mengunggah', 'error'); inp.value = ''; });
  });

  App.form('prod-save', function (f) {
    var fd = new FormData(f), btn = f.querySelector('[type=submit]');
    var data = { id: fd.get('id'), nama_produk: fd.get('nama_produk'), kategori_id: fd.get('kategori_id'), satuan: fd.get('satuan'), harga: fd.get('harga'), harga_coret: fd.get('harga_coret'),
      stok: fd.get('stok'), deskripsi: fd.get('deskripsi'), foto_utama: document.getElementById('foto_utama').value, foto_galeri: fd.getAll('galeri'), status: fd.get('status') };
    UI.busy(btn, true, 'Menyimpan...');
    Api.post('seller.products.save', data).then(function (r) {
      UI.busy(btn, false);
      UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error');
      if (r.success) { window.__modal.close(); pProduk(); }
    });
  });

  App.on('prod-del', function (el) {
    UI.confirm('Hapus produk', 'Produk akan dihapus (atau diarsipkan jika sudah punya riwayat pesanan).', { danger: true, ok: 'Hapus' }).then(function (ok) {
      if (!ok) return;
      Api.post('seller.products.delete', { id: el.getAttribute('data-id') }).then(function (r) { UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); pProduk(); });
    });
  });

  function pPesanan() {
    Api.post('seller.orders.list', { status: statusFilter }).then(function (r) {
      if (!r.success) return UI.html('#pane', '<div class="grid">' + UI.error(r.message, 'reload') + '</div>');
      var list = r.data;
      UI.html('#pane', '<div class="space-y-4"><div class="no-scrollbar flex gap-2 overflow-x-auto">' + [''].concat(['BARU', 'DIPROSES', 'DIKIRIM', 'SELESAI', 'BATAL']).map(function (s) {
        return '<button class="tab ' + (statusFilter === s ? 'tab-active' : 'border') + '" data-action="ofilter" data-s="' + s + '">' + (s || 'Semua') + '</button>'; }).join('') + '</div>' +
        (list.length ? list.map(function (o) {
          return '<div class="card space-y-3 p-4"><div class="flex flex-wrap items-center justify-between gap-2"><div><p class="font-bold">' + E.esc(o.order_no) + '</p><p class="text-xs text-gray-500">' + E.tgl(o.created_at) + '</p></div><div class="flex gap-2">' + UI.badge(o.status) + UI.badge(o.status_bayar) + '</div></div>' +
            '<div class="text-sm"><p><b>' + E.esc(o.nama) + '</b> · ' + E.esc(o.whatsapp) + '</p><p class="text-gray-500">' + E.esc(o.alamat) + '</p>' + (o.catatan ? '<p class="text-gray-500">Catatan: ' + E.esc(o.catatan) + '</p>' : '') + '</div>' +
            '<ul class="divide-y rounded-xl border text-sm">' + o.items.map(function (i) { return '<li class="flex justify-between p-2"><span>' + E.esc(i.nama_produk) + ' x' + i.qty + '</span><span>' + E.rp(i.subtotal) + '</span></li>'; }).join('') + '</ul>' +
            '<div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm">Metode: <b>' + E.esc(o.metode) + '</b> · Total <b class="text-primary-600">' + E.rp(o.total) + '</b></p><div class="flex flex-wrap gap-2">' +
            '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" href="' + E.esc(E.waLink(o.whatsapp, 'Halo ' + o.nama + ', pesanan ' + o.order_no + ' di ' + App.name() + '.')) + '">' + UI.icon('message-circle') + ' Chat</a>' +
            (o.status !== 'BATAL' && o.status_bayar !== 'LUNAS' ? '<button class="btn btn-soft btn-sm" data-action="opay" data-no="' + E.esc(o.order_no) + '" data-v="LUNAS">Tandai Lunas</button>' : '') +
            NEXT[o.status].map(function (n) { return '<button class="btn btn-sm ' + (n[0] === 'BATAL' ? 'btn-outline text-red-600' : 'btn-primary') + '" data-action="ostatus" data-no="' + E.esc(o.order_no) + '" data-to="' + n[0] + '">' + n[1] + '</button>'; }).join('') + '</div></div></div>';
        }).join('') : UI.empty('clipboard-list', 'Belum ada pesanan', 'Pesanan dari pembeli akan muncul di sini.')) + '</div>');
    });
  }
  App.on('ofilter', function (el) { statusFilter = el.getAttribute('data-s'); pPesanan(); });
  App.on('ostatus', function (el) {
    var to = el.getAttribute('data-to'), no = el.getAttribute('data-no');
    UI.confirm('Ubah status', 'Ubah status pesanan ' + no + ' menjadi ' + to + '?', { danger: to === 'BATAL' }).then(function (ok) {
      if (!ok) return;
      Api.post('seller.orders.status', { order_no: no, status: to }).then(function (r) { UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); pPesanan(); });
    });
  });
  App.on('opay', function (el) {
    Api.post('seller.orders.payment', { order_no: el.getAttribute('data-no'), status_bayar: el.getAttribute('data-v') }).then(function (r) { UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); pPesanan(); });
  });

  function pProfil() {
    Api.post('seller.profile.get').then(function (r) {
      if (!r.success) return UI.html('#pane', '<div class="grid">' + UI.error(r.message, 'reload') + '</div>');
      umkm = r.data.umkm; cats = r.data.categories;
      UI.html('#pane', '<form data-form="profil-save" class="card mx-auto max-w-2xl space-y-3 p-5" novalidate><div class="flex items-center gap-2">' + UI.badge(umkm.status) + '</div>' +
        '<div><label class="label" for="p-n">Nama usaha</label><input id="p-n" name="nama_usaha" class="input" maxlength="80" required value="' + E.esc(umkm.nama_usaha) + '"></div>' +
        '<div class="grid gap-3 sm:grid-cols-2"><div><label class="label" for="p-k">Kategori</label><select id="p-k" name="kategori_id" class="input">' + cats.map(function (c) { return '<option value="' + E.esc(c.id) + '"' + (umkm.kategori_id === c.id ? ' selected' : '') + '>' + E.esc(c.nama) + '</option>'; }).join('') + '</select></div>' +
        '<div><label class="label" for="p-w">WhatsApp usaha</label><input id="p-w" name="whatsapp" class="input" inputmode="tel" value="' + E.esc(umkm.whatsapp) + '"></div></div>' +
        '<div><label class="label" for="p-a">Alamat</label><input id="p-a" name="alamat" class="input" maxlength="200" value="' + E.esc(umkm.alamat) + '"></div>' +
        '<div><label class="label" for="p-d">Deskripsi</label><textarea id="p-d" name="deskripsi" rows="3" class="input" maxlength="600">' + E.esc(umkm.deskripsi) + '</textarea></div>' +
        '<div class="grid gap-3 sm:grid-cols-2"><div><label class="label" for="p-i">Instagram</label><input id="p-i" name="instagram" class="input" maxlength="60" value="' + E.esc(umkm.instagram) + '"></div>' +
        '<div><label class="label" for="p-r">Info rekening (opsional)</label><input id="p-r" name="rekening" class="input" maxlength="120" value="' + E.esc(umkm.rekening) + '" placeholder="Bank - No. rek - a.n."></div></div>' +
        imgField('logo', 'Logo usaha', umkm.logo) + imgField('banner', 'Banner toko', umkm.banner) +
        '<button class="btn btn-primary w-full" type="submit">Simpan Profil</button></form>');
    });
  }
  App.form('profil-save', function (f) {
    var fd = new FormData(f), btn = f.querySelector('[type=submit]');
    var d = {}; fd.forEach(function (v, k) { d[k] = v; });
    d.logo = document.getElementById('logo').value; d.banner = document.getElementById('banner').value;
    UI.busy(btn, true, 'Menyimpan...');
    Api.post('seller.profile.save', d).then(function (r) { UI.busy(btn, false); UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error'); });
  });

  App.on('tab', function (el) { tab = el.getAttribute('data-tab'); shell(); });
  App.on('reload', function () { show(); });
  App.start({ layout: 'dash', roles: ['UMKM'] }, function () { shell(); });
})();
