/* umkm-detail.js — Profil toko UMKM */
App.start({ nav: 'umkm' }, function () {
  var slug = E.qs('slug');
  UI.html('#app', '<div class="mx-auto max-w-6xl p-4">' + UI.skeletons(1, 'h-48') + '</div>');
  return Api.get('umkm.detail', { slug: slug }).then(function (r) {
    if (!r.success) { UI.html('#app', '<div class="mx-auto grid max-w-lg p-6">' + UI.empty('store', 'UMKM tidak ditemukan', r.message, '<a class="btn btn-primary" href="' + E.link('umkm.html') + '">Direktori UMKM</a>') + '</div>'); return; }
    var u = r.data.umkm, ps = r.data.products;
    document.title = u.nama_usaha + ' - ' + App.name();
    UI.html('#app', '<div class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6"><div class="card overflow-hidden">' +
      (E.url(u.banner) ? '<img data-fallback src="' + E.img(u.banner) + '" alt="" class="h-40 w-full object-cover sm:h-56">' : '<div class="h-24 bg-gradient-to-r from-primary-700 to-primary-500"></div>') +
      '<div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-start"><img data-fallback src="' + E.img(u.logo) + '" alt="" class="-mt-12 h-20 w-20 rounded-2xl border-4 border-white bg-gray-100 object-cover dark:border-gray-800">' +
      '<div class="flex-1 space-y-1"><h1 class="text-xl font-bold">' + E.esc(u.nama_usaha) + '</h1><p class="flex items-center gap-1 text-sm text-gray-500">' + UI.icon('map-pin') + E.esc(u.alamat) + '</p>' +
      '<p class="whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">' + E.esc(u.deskripsi) + '</p></div>' +
      '<div class="flex gap-2"><a class="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer" href="' + E.esc(E.waLink(u.whatsapp, 'Halo ' + u.nama_usaha)) + '">' + UI.icon('message-circle') + ' WhatsApp</a>' +
      (u.instagram ? '<a class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" href="https://instagram.com/' + encodeURIComponent(u.instagram) + '">' + UI.icon('instagram') + '</a>' : '') + '</div></div></div>' +
      '<h2 class="text-lg font-bold">Produk (' + ps.length + ')</h2><div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">' +
      (ps.length ? ps.map(UI.productCard).join('') : UI.empty('package', 'Belum ada produk', '')) + '</div></div>');
  });
});
