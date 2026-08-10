/* ============================================================
   DEMO SHIM (public site)
   ------------------------------------------------------------
   The production site talks to a handful of small PHP endpoints.
   Static hosting can't run PHP, so this intercepts those requests
   and answers them from the bundled demo dataset using the same
   response shapes and the same rules the PHP used (see
   php/availability-helpers.php).

   Result: availability checks, blocked-date greying, the maintenance
   banner, the rental-agreement modal and the signature pad all behave
   exactly as they do on the live site — with nothing written anywhere.
   ============================================================ */
(function () {
  'use strict';

  var DB = window.DemoCore.db;
  var nativeFetch = typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : function () { return Promise.reject(new Error('fetch is unavailable')); };

  function json(payload) {
    var body = JSON.stringify(payload);
    if (typeof Response === 'function') {
      return Promise.resolve(new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    /* Very old browsers expose fetch without a usable Response constructor. */
    return Promise.resolve({
      ok: true,
      status: 200,
      json: function () { return Promise.resolve(JSON.parse(body)); },
      text: function () { return Promise.resolve(body); }
    });
  }

  function isoOf(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  /* ------------------------------------------------ availability rules */
  function nights(start, end) {
    var out = [];
    if (!start || !end) return out;
    var s = new Date(start + 'T00:00:00');
    var e = new Date(end + 'T00:00:00');
    if (isNaN(s) || isNaN(e) || e <= s) return out;
    for (var d = new Date(s); d < e; d.setDate(d.getDate() + 1)) out.push(isoOf(d));
    return out;
  }

  /* A block counts if it targets this vehicle (or the whole fleet) and is
     either a booking or a maintenance hold that hasn't expired yet. */
  function blockApplies(block, cartId) {
    if (block.cart_id !== null && Number(block.cart_id) !== Number(cartId)) return false;
    if (block.block_type === 'booking') return true;
    if (!block.available_at) return true;
    return window.DemoCore.parse(block.available_at) > new Date();
  }

  function blockedDates(cartId, fromISO, toISO) {
    if (!cartId) return [];
    var seen = {};
    DB.availability_blocks.forEach(function (b) {
      if (!blockApplies(b, cartId)) return;
      if (fromISO && b.block_date < fromISO) return;
      if (toISO && b.block_date >= toISO) return;
      seen[b.block_date] = true;
    });
    return Object.keys(seen).sort();
  }

  function maintenanceNotices() {
    var today = window.DemoCore.todayISO();
    var names = {};
    DB.fleet_carts.forEach(function (c) { names[c.id] = c.name; });

    var groups = {};
    DB.availability_blocks.forEach(function (b) {
      if (b.block_type !== 'maintenance') return;
      if (b.block_date < today) return;
      if (b.available_at && window.DemoCore.parse(b.available_at) <= new Date()) return;
      var key = [b.batch_id, b.cart_id, b.note, b.available_at].join('|');
      if (!groups[key]) {
        groups[key] = {
          batch_id: b.batch_id,
          vehicle: b.cart_id !== null ? (names[b.cart_id] || 'A vehicle') : null,
          note: b.note,
          available_at: b.available_at,
          start_date: b.block_date,
          end_date: b.block_date
        };
      } else {
        var g = groups[key];
        if (b.block_date < g.start_date) g.start_date = b.block_date;
        if (b.block_date > g.end_date) g.end_date = b.block_date;
      }
    });

    return Object.keys(groups).map(function (k) { return groups[k]; })
      .sort(function (a, b) { return a.start_date < b.start_date ? -1 : 1; });
  }

  /* --------------------------------------------------------- routing */
  function route(url) {
    var path = url.split('?')[0].replace(/^https?:\/\/[^/]+/, '');
    var params = new URLSearchParams(url.split('?')[1] || '');

    if (path.endsWith('/php/edits-data.php')) {
      return json(DB.page_edits);
    }

    if (path.endsWith('/php/session-check.php')) {
      /* The demo is deliberately signed out on the public side: the
         inline page editor belongs to the admin experience. */
      return json({ loggedIn: false });
    }

    if (path.endsWith('/php/availability-data.php')) {
      var action = params.get('action');
      var cartId = params.get('cart_id');

      if (action === 'check') {
        var window_ = nights(params.get('start'), params.get('end'));
        var hit = blockedDates(cartId).filter(function (d) {
          return window_.indexOf(d) !== -1;
        });
        return json({ available: hit.length === 0, blocked_dates: hit });
      }

      if (action === 'range') {
        var months = Math.min(24, Math.max(1, Number(params.get('months') || 9)));
        var from = window.DemoCore.todayISO();
        var to = new Date(from + 'T00:00:00');
        to.setMonth(to.getMonth() + months);
        return json({ blocked_dates: blockedDates(cartId, from, isoOf(to)) });
      }

      if (action === 'notices') {
        return json({ notices: maintenanceNotices() });
      }
      return json({ error: 'Unknown action' });
    }

    if (path.endsWith('/html/rental-agreement-modal.html')) {
      return nativeFetch('rental-agreement-modal.html');
    }

    if (path.endsWith('/php/agreement-submit.php')) {
      /* The signature pad, uploads and validation all run for real; only
         the storage step is stubbed out. */
      window.DemoCore.toast('Demo mode — the signed agreement was not stored.');
      return json({ ok: true, demo: true });
    }

    if (path.indexOf('edits-save.php') !== -1 || path.indexOf('edits-upload.php') !== -1) {
      window.DemoCore.toast('Demo mode — content edits are not saved.');
      return json({ ok: false, demo: true });
    }

    return null;
  }

  window.fetch = function (input, options) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    try {
      var handled = route(url);
      if (handled) return handled;
    } catch (err) {
      console.warn('[demo] shim error for', url, err);
    }
    return nativeFetch(input, options);
  };

  /* -------------------------------------------------- form submissions
     The contact and reservation forms POST to PHP. Rather than swallow
     them, the demo runs the browser's own validation first and then
     bounces to the page's real success banner, so the flow a visitor
     sees end to end is the production one. */
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.getAttribute) return;
    var action = form.getAttribute('action') || '';
    if (action.indexOf('.php') === -1) return;

    event.preventDefault();
    if (form.checkValidity && !form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var isContact = form.id === 'contactForm';
    var page = isContact ? 'contact.html' : 'reservations.html';
    var anchor = isContact ? '#contact-form' : '#check-availability';
    window.DemoCore.toast('Demo mode — nothing was sent or stored.');
    setTimeout(function () {
      window.location.href = page + '?submitted=1' + anchor;
    }, 900);
  }, true);
})();
