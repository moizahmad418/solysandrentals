/* ============================================================
   DEMO CORE
   ------------------------------------------------------------
   Shared by the public site and the admin demo.

   The dataset stores dates as day-offsets from "today" rather than
   fixed timestamps. This file resolves them at load, so bookings,
   messages and the availability calendar are always current no
   matter when someone opens the demo.
   ============================================================ */
(function () {
  'use strict';

  var MS_DAY = 86400000;

  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function iso(date) {
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + m + '-' + d;
  }

  function offsetToISO(offset) {
    return iso(new Date(startOfToday().getTime() + offset * MS_DAY));
  }

  function offsetToStamp(offset, time) {
    var t = (time || '00:00');
    if (t.split(':').length === 2) t += ':00';
    if (t.length === 7) t = '0' + t;
    return offsetToISO(offset) + ' ' + t;
  }

  function parse(value) {
    if (!value) return null;
    var d = new Date(String(value).replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d;
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* date('M j, Y') */
  function fmtDate(value) {
    var d = parse(value);
    if (!d) return '—';
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  /* date('M j, Y g:i A') */
  function fmtDateTime(value) {
    var d = parse(value);
    if (!d) return '—';
    var h = d.getHours();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return fmtDate(value) + ' ' + h + ':' +
      String(d.getMinutes()).padStart(2, '0') + ' ' + ampm;
  }

  /* date('D, M j') */
  function fmtDayMonth(value) {
    var d = parse(value);
    if (!d) return '—';
    return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
  }

  /* date('M j (D)') */
  function fmtMonthDayShort(value) {
    var d = parse(value);
    if (!d) return '—';
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ' (' + DAYS[d.getDay()] + ')';
  }

  function addDays(isoDate, n) {
    var d = parse(isoDate);
    d.setDate(d.getDate() + n);
    return iso(d);
  }

  /* ---------------------------------------------------------- dataset */
  function materialize(raw) {
    var db = JSON.parse(JSON.stringify(raw));

    db.fleet_carts.forEach(function (c) {
      c.created_at = offsetToStamp(c.created_at_offset, '09:00');
      c.updated_at = offsetToStamp(c.updated_at_offset, '11:20');
    });
    db.media_files.forEach(function (m) {
      m.uploaded_at = offsetToStamp(m.uploaded_at_offset, '08:45');
    });
    db.users.forEach(function (u) {
      u.created_at = offsetToStamp(u.created_at_offset, '07:30');
    });
    db.reservations.forEach(function (r) {
      r.pickup_date = offsetToISO(r.pickup_date_offset);
      r.dropoff_date = offsetToISO(r.dropoff_date_offset);
      r.submitted_at = offsetToStamp(r.submitted_at_offset, r.submitted_at_time);
      r.trashed = Number(r.trashed);
    });
    db.contact_messages.forEach(function (m) {
      m.submitted_at = offsetToStamp(m.submitted_at_offset, m.submitted_at_time);
      m.trashed = Number(m.trashed);
    });
    db.rental_agreements.forEach(function (a) {
      a.agreed_at = offsetToStamp(a.agreed_at_offset, a.agreed_at_time);
      a.trashed = Number(a.trashed);
    });
    db.availability_blocks.forEach(function (b) {
      b.block_date = offsetToISO(b.block_date_offset);
      b.available_at = (b.available_at_offset === null || b.available_at_offset === undefined)
        ? null
        : offsetToStamp(b.available_at_offset, b.available_at_time || '10:00');
    });
    return db;
  }

  /* ------------------------------------------------------------ toast */
  function toast(message, kind) {
    var host = document.getElementById('demoToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'demoToastHost';
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'demo-toast' + (kind ? ' demo-toast-' + kind : '');
    el.innerHTML = '<span class="demo-toast-icon" aria-hidden="true">' +
      (kind === 'info' ? 'i' : '\u2691') + '</span><span>' + message + '</span>';
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    setTimeout(function () {
      el.classList.remove('is-in');
      setTimeout(function () { el.remove(); }, 280);
    }, 3200);
  }

  var escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"']/g, function (c) { return escMap[c]; });
  }

  window.DemoCore = {
    db: materialize(window.DEMO_DB),
    todayISO: function () { return iso(startOfToday()); },
    offsetToISO: offsetToISO,
    addDays: addDays,
    parse: parse,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    fmtDayMonth: fmtDayMonth,
    fmtMonthDayShort: fmtMonthDayShort,
    toast: toast,
    esc: esc,
    MONTHS: MONTHS,
    DAYS: DAYS
  };
})();
