/* login.js — Masuk & pendaftaran (warga / UMKM) */
(function () {
  var mode = E.qs('daftar') === 'umkm' ? 'umkm' : (E.qs('daftar') ? 'warga' : 'masuk');
  var cats = [];
  var hp = '<div class="absolute -left-[9999px]" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>';
  function f(label, name, type, extra) {
    return '<div><label class="label" for="f-' + name + '">' + label + '</label><input class="input" id="f-' + name + '" name="' + name + '" type="' + (type || 'text') + '" ' + (extra || '') + '></div>';
  }
  function pw(label, name, auto) {
    return '<div><label class="label" for="f-' + name + '">' + label + '</label><div class="relative"><input class="input pr-10" id="f-' + name + '" name="' + name + '" type="password" autocomplete="' + auto + '" required minlength="8">' +
      '<button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400" data-action="show-pw" aria-label="Tampilkan password">' + UI.icon('eye', 'w-4 h-4') + '</button></div></div>';
  }
  function view() {
    var tabs = [['masuk', 'Masuk'], ['warga', 'Daftar Warga'], ['umkm', 'Daftar UMKM']].map(function (t) {
      return '<button class="tab flex-1 justify-center ' + (mode === t[0] ? 'tab-active' : '') + '" data-action="mode" data-m="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    var form;
    if (mode === 'masuk') {
      form = '<form data-form="login" class="space-y-4" novalidate>' + f('Email atau No. WhatsApp', 'identifier', 'text', 'required autocomplete="username"') + pw('Password', 'password', 'current-password') +
        '<button class="btn btn-primary w-full" type="submit">Masuk</button><p class="text-center text-xs text-gray-500">Lupa password? Hubungi admin kelurahan untuk reset.</p></form>';
    } else {
      var catOpts = '<option value="">Pilih kategori usaha</option>' + cats.map(function (c) { return '<option value="' + E.esc(c.id) + '">' + E.esc(c.nama) + '</option>'; }).join('');
      form = '<form data-form="register" class="space-y-4" novalidate>' + hp + f('Nama Lengkap', 'nama', 'text', 'required autocomplete="name"') +
        f('No. WhatsApp', 'whatsapp', 'tel', 'required placeholder="081234567890" autocomplete="tel"') + f('Email (opsional)', 'email', 'email', 'autocomplete="email"') +
        pw('Password (min. 8, huruf & angka)', 'password', 'new-password') +
        (mode === 'umkm' ? '<div class="space-y-4 rounded-xl bg-primary-50 p-4 dark:bg-primary-900/20"><h3 class="text-sm font-bold">Data Usaha</h3>' + f('Nama Usaha', 'nama_usaha', 'text', 'required') +
          '<div><label class="label" for="f-kategori_id">Kategori</label><select class="input" id="f-kategori_id" name="kategori_id" required>' + catOpts + '</select></div>' +
          f('Alamat Usaha', 'alamat_usaha', 'text', 'required placeholder="RT/RW, jalan, nomor"') + f('WhatsApp Usaha (kosongkan = sama)', 'wa_usaha', 'tel') +
          '<div><label class="label" for="f-deskripsi">Deskripsi Singkat</label><textarea class="input" id="f-deskripsi" name="deskripsi" rows="3" maxlength="600"></textarea></div><p class="text-xs text-gray-500">Toko tampil di marketplace setelah diverifikasi admin kelurahan.</p></div>' : '') +
        '<button class="btn btn-primary w-full" type="submit">Buat Akun</button></form>';
    }
    UI.html('#app', '<div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8"><a href="' + E.link('index.html') + '" class="mb-6 flex items-center justify-center gap-3"><div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-xl font-bold text-white">P</div><span class="text-lg font-bold">' + E.esc(App.name()) + '</span></a>' +
      '<div class="card space-y-5 p-6"><div class="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-900">' + tabs + '</div><div id="msg" role="alert" class="hidden rounded-lg bg-red-50 p-3 text-sm text-red-700"></div>' + form + '</div></div>');
  }
  function err(m) { var b = document.getElementById('msg'); b.textContent = m; b.classList.remove('hidden'); }
  function val(form, n) { var el = form.elements[n]; return el ? el.value.trim() : ''; }

  App.start({ layout: 'bare' }, function () {
    if (Auth.user()) { App.afterLogin(Auth.user()); return; }
    view();
    Api.get('categories', {}, { ttl: 120 }).then(function (r) { if (r.success) { cats = r.data; if (mode === 'umkm') view(); } });
  });
  App.on('mode', function (el) { mode = el.getAttribute('data-m'); view(); });
  App.on('show-pw', function (el) { var i = el.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; });

  App.form('login', function (form) {
    var btn = form.querySelector('[type=submit]'); UI.busy(btn, true, 'Masuk...');
    Api.post('auth.login', { identifier: val(form, 'identifier'), password: form.elements.password.value, agent: navigator.userAgent.slice(0, 80) }).then(function (r) {
      UI.busy(btn, false);
      if (!r.success) return err(r.message);
      Auth.save(r.data); App.afterLogin(r.data.user);
    });
  });
  App.form('register', function (form) {
    var btn = form.querySelector('[type=submit]');
    var body = { nama: val(form, 'nama'), whatsapp: val(form, 'whatsapp'), email: val(form, 'email'), password: form.elements.password.value, website: val(form, 'website'), agent: navigator.userAgent.slice(0, 80) };
    if (mode === 'umkm') {
      body.role = 'UMKM';
      body.umkm = { nama_usaha: val(form, 'nama_usaha'), kategori_id: val(form, 'kategori_id'), alamat: val(form, 'alamat_usaha'), whatsapp: val(form, 'wa_usaha') || body.whatsapp, deskripsi: val(form, 'deskripsi') };
    }
    UI.busy(btn, true, 'Mendaftar...');
    Api.post('auth.register', body).then(function (r) {
      UI.busy(btn, false);
      if (!r.success) return err(r.message);
      Auth.save(r.data);
      UI.toast(mode === 'umkm' ? 'Pendaftaran berhasil. Menunggu verifikasi admin.' : 'Akun berhasil dibuat.', 'success');
      setTimeout(function () { App.afterLogin(r.data.user); }, 700);
    });
  });
})();
