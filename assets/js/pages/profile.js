/* profile.js — Profil, ganti password (wajib bila diminta), favorit, daftar UMKM */
(function () {
  function msg(id, text, ok) { var b = document.getElementById(id); b.textContent = text; b.className = 'rounded-lg p-3 text-sm ' + (ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'); }
  App.start({ nav: 'profile' }, function () {
    if (!App.requireLogin()) return;
    var u = Auth.user(), forced = !!u.must_change || E.qs('ganti');
    function pwField(id, label, auto) { return '<div><label class="label" for="' + id + '">' + label + '</label><input class="input" id="' + id + '" type="password" autocomplete="' + auto + '" required minlength="8"></div>'; }
    UI.html('#app', '<div class="mx-auto max-w-3xl space-y-6 px-4 py-6">' +
      (forced ? '<div class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Demi keamanan, silakan ganti password sementara Anda terlebih dahulu.</div>' : '') +
      '<h1 class="text-xl font-bold">Profil & Keamanan</h1>' +
      '<form data-form="profile" class="card space-y-4 p-5"' + (u.must_change ? ' hidden' : '') + '><h2 class="font-bold">Data Diri</h2><div id="m1" class="hidden"></div><div class="grid gap-4 sm:grid-cols-2">' +
      '<div><label class="label" for="nama">Nama</label><input class="input" id="nama" required value="' + E.esc(u.nama) + '"></div><div><label class="label" for="wa">WhatsApp</label><input class="input" id="wa" type="tel" required value="' + E.esc(u.whatsapp) + '"></div>' +
      '<div><label class="label" for="email">Email</label><input class="input" id="email" type="email" value="' + E.esc(u.email) + '"></div><div><label class="label" for="alamat">Alamat</label><input class="input" id="alamat" value="' + E.esc(u.alamat) + '"></div></div><button class="btn btn-primary" type="submit">Simpan</button></form>' +
      '<form data-form="password" class="card space-y-4 p-5"><h2 class="font-bold">Ganti Password</h2><div id="m2" class="hidden"></div>' + pwField('old', 'Password Lama', 'current-password') + pwField('new', 'Password Baru (min. 8, huruf & angka)', 'new-password') + pwField('new2', 'Ulangi Password Baru', 'new-password') + '<button class="btn btn-primary" type="submit">Ganti Password</button></form>' +
      '<div id="extra"></div></div>');
    if (u.must_change) return;
    var extra = '';
    if (u.role === 'WARGA') extra += '<div class="card flex flex-col items-start gap-3 p-5"><h2 class="font-bold">Punya usaha?</h2><p class="text-sm text-gray-500">Daftarkan UMKM Anda untuk mulai berjualan di marketplace kelurahan.</p><button class="btn btn-primary btn-sm" data-action="apply">Daftarkan UMKM</button></div>';
    if (u.role === 'UMKM') extra += '<a class="btn btn-soft" href="' + E.link('seller/dashboard.html') + '">Buka Dasbor Toko</a>';
    if (u.role === 'ADMIN') extra += '<a class="btn btn-soft" href="' + E.link('admin/dashboard.html') + '">Buka Dasbor Admin</a>';
    extra += '<div><h2 class="mb-3 font-bold">Produk Favorit</h2><div id="wish" class="grid grid-cols-2 gap-4 md:grid-cols-3">' + UI.skeletons(2) + '</div></div>';
    UI.html('#extra', '<div class="space-y-6">' + extra + '</div>');
    return Api.post('wishlist.list').then(function (r) {
      UI.html('#wish', r.success && r.data.length ? r.data.map(UI.productCard).join('') : '<p class="col-span-full text-sm text-gray-500">Belum ada produk favorit.</p>');
    });
  });
  App.form('profile', function (f) {
    Api.post('profile.update', { nama: f.nama.value, whatsapp: f.wa.value, email: f.email.value, alamat: f.alamat.value }).then(function (r) {
      if (r.success) { Auth.setUser(r.data.user); msg('m1', 'Profil disimpan.', true); } else msg('m1', r.message, false);
    });
  });
  App.form('password', function (f) {
    if (f.new.value !== f.new2.value) return msg('m2', 'Konfirmasi password tidak cocok.', false);
    Api.post('auth.change_password', { old_password: f.old.value, new_password: f.new.value }).then(function (r) {
      if (!r.success) return msg('m2', r.message, false);
      var u = Auth.user(); u.must_change = false; Auth.setUser(u);
      msg('m2', 'Password berhasil diganti.', true);
      setTimeout(function () { App.afterLogin(u); }, 800);
    });
  });
  App.on('apply', function () {
    Api.get('categories', {}, { ttl: 120 }).then(function (c) {
      var opts = (c.data || []).map(function (x) { return '<option value="' + E.esc(x.id) + '">' + E.esc(x.nama) + '</option>'; }).join('');
      UI.modal('<form data-form="apply" class="space-y-3"><div><label class="label">Nama Usaha</label><input class="input" name="nama_usaha" required></div><div><label class="label">Kategori</label><select class="input" name="kategori_id" required>' + opts + '</select></div>' +
        '<div><label class="label">Alamat Usaha</label><input class="input" name="alamat" required></div><div><label class="label">WhatsApp Usaha</label><input class="input" name="whatsapp" type="tel" required value="' + E.esc(Auth.user().whatsapp) + '"></div>' +
        '<div><label class="label">Deskripsi</label><textarea class="input" name="deskripsi" rows="3" maxlength="600"></textarea></div><button class="btn btn-primary w-full" type="submit">Kirim Pendaftaran</button></form>', { title: 'Daftarkan UMKM' });
    });
  });
  App.form('apply', function (f) {
    var d = {}; ['nama_usaha', 'kategori_id', 'alamat', 'whatsapp', 'deskripsi'].forEach(function (k) { d[k] = f.elements[k].value; });
    Api.post('seller.apply', d).then(function (r) {
      UI.toast(r.message || 'Gagal', r.success ? 'success' : 'error');
      if (r.success) { var u = Auth.user(); u.role = 'UMKM'; Auth.setUser(u); setTimeout(function () { App.go('seller/dashboard.html'); }, 900); }
    });
  });
})();
