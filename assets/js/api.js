/**
 * api.js — Klien API terpusat ke backend Google Apps Script
 * - GET untuk data publik (di-cache singkat), POST (text/plain, tanpa preflight CORS) untuk sisanya
 * - Token sesi disimpan di localStorage dan dikirim lewat body (bukan URL)
 */
(function () {
  var AUTH_KEY = 'pager_auth';
  var memCache = {};

  var Auth = {
    read: function () {
      try {
        var a = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
        if (!a || !a.token) return null;
        if (a.expires_at && a.expires_at < Auth.nowWib()) { Auth.clear(); return null; }
        return a;
      } catch (e) { return null; }
    },
    nowWib: function () {
      var d = new Date(Date.now() + 7 * 3600000);
      return d.toISOString().slice(0, 19).replace('T', ' ');
    },
    save: function (data) {
      try { localStorage.setItem(AUTH_KEY, JSON.stringify({ token: data.token, user: data.user, expires_at: data.expires_at })); } catch (e) { /* abaikan */ }
    },
    setUser: function (user) {
      var a = Auth.read(); if (!a) return;
      a.user = user; try { localStorage.setItem(AUTH_KEY, JSON.stringify(a)); } catch (e) { /* abaikan */ }
    },
    clear: function () { try { localStorage.removeItem(AUTH_KEY); } catch (e) { /* abaikan */ } },
    token: function () { var a = Auth.read(); return a ? a.token : ''; },
    user: function () { var a = Auth.read(); return a ? a.user : null; },
    is: function (role) { var u = Auth.user(); return !!u && (Array.isArray(role) ? role.indexOf(u.role) >= 0 : u.role === role); }
  };

  function fail(message, code) { return { success: false, message: message, code: code || 'NETWORK' }; }

  function withTimeout(promiseFn) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, (window.APP_CONFIG && APP_CONFIG.REQUEST_TIMEOUT_MS) || 30000);
    return promiseFn(ctrl.signal).finally(function () { clearTimeout(timer); });
  }

  function handle(res) {
    if (res && res.success === false) {
      if (res.code === 'UNAUTHORIZED') {
        Auth.clear();
        window.dispatchEvent(new CustomEvent('pager:unauthorized'));
      } else if (res.code === 'MUST_CHANGE') {
        window.dispatchEvent(new CustomEvent('pager:mustchange'));
      } else if (res.code === 'MAINTENANCE') {
        window.dispatchEvent(new CustomEvent('pager:maintenance', { detail: res.message }));
      }
    }
    return res;
  }

  function parse(r) {
    return r.text().then(function (t) {
      try { return JSON.parse(t); } catch (e) { return fail('Respons server tidak valid. Pastikan URL backend benar dan sudah di-deploy.', 'BAD_RESPONSE'); }
    });
  }

  var Api = {
    configured: function () { return !!(window.APP_CONFIG && APP_CONFIG.API_URL && /^https:\/\//.test(APP_CONFIG.API_URL)); },

    /** GET publik. opts.ttl (detik) untuk cache memori; opts.fresh untuk lewati cache */
    get: function (action, params, opts) {
      opts = opts || {};
      if (!Api.configured()) return Promise.resolve(fail('URL backend belum diatur (assets/js/config.js).', 'NO_CONFIG'));
      var qs = new URLSearchParams(Object.assign({ action: action }, params || {}));
      Object.keys(params || {}).forEach(function (k) { if (params[k] === '' || params[k] == null) qs.delete(k); });
      var url = APP_CONFIG.API_URL + '?' + qs.toString();
      var ttl = opts.ttl === undefined ? 30 : opts.ttl;
      var hit = memCache[url];
      if (!opts.fresh && hit && hit.exp > Date.now()) return Promise.resolve(hit.val);
      function once() {
        return withTimeout(function (signal) { return fetch(url, { method: 'GET', signal: signal }).then(parse); });
      }
      return once().catch(function () { return once(); }).catch(function (e) {
        return fail(e && e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }).then(function (res) {
        handle(res);
        if (res.success && ttl > 0) memCache[url] = { val: res, exp: Date.now() + ttl * 1000 };
        return res;
      });
    },

    /** POST (selalu langsung ke server, tanpa cache) */
    post: function (action, payload) {
      if (!Api.configured()) return Promise.resolve(fail('URL backend belum diatur (assets/js/config.js).', 'NO_CONFIG'));
      var body = Object.assign({}, payload || {}, { action: action, token: Auth.token() });
      return withTimeout(function (signal) {
        return fetch(APP_CONFIG.API_URL, {
          method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: signal
        }).then(parse);
      }).catch(function (e) {
        return fail(e && e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }).then(handle);
    },

    clearCache: function () { memCache = {}; }
  };

  window.Auth = Auth;
  window.Api = Api;
})();
