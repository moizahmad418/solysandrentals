/* ============================================================
   ADMIN PANEL — DEMO BUILD
   ------------------------------------------------------------
   A static reproduction of the PHP admin panel. Every screen,
   filter, tab, form and modal from the production app is here and
   fully navigable; the markup and classes are the originals, so it
   looks and behaves like the real thing.

   The one difference: writes are intercepted. Any save, delete,
   upload, bulk action or status change is caught, explained, and
   discarded — the dataset never changes.
   ============================================================ */
(function () {
  'use strict';

  var C = window.DemoCore;
  var DB = C.db;
  var esc = C.esc;
  var root = document.getElementById('adminRoot');

  /* ============================================================
     ROLES — mirrors admin/auth.php
     ============================================================ */
  var ROLES = {
    super_admin: {
      label: 'Super Admin',
      description: 'Full access to everything: fleet, media, reservations, agreements, messages, site diagnostics, and managing other admin users and their roles.'
    },
    administrator: {
      label: 'Administrator',
      description: 'Full operational access (fleet, media, reservations, agreements, messages) — intended for developers/site builders. Cannot manage users or view system diagnostics.'
    },
    fleet_manager: {
      label: 'Fleet Manager',
      description: 'Can manage the cart/motorcycle fleet and the availability calendar (maintenance blocks). No access to reservations, messages, media, or users.'
    },
    reservations_manager: {
      label: 'Reservations Manager',
      description: 'Can view and manage reservations, signed rental agreements, and the availability calendar.'
    }
  };

  var PERMISSIONS = {
    fleet: ['super_admin', 'administrator', 'fleet_manager'],
    media: ['super_admin', 'administrator', 'fleet_manager'],
    reservations: ['super_admin', 'administrator', 'reservations_manager'],
    availability: ['super_admin', 'administrator', 'fleet_manager', 'reservations_manager'],
    agreements: ['super_admin', 'administrator', 'reservations_manager'],
    messages: ['super_admin', 'administrator'],
    users: ['super_admin'],
    diagnostics: ['super_admin']
  };

  var AREA_ROUTE = {
    fleet: 'fleet', media: 'media', reservations: 'reservations',
    availability: 'availability', agreements: 'agreements',
    messages: 'messages', users: 'users'
  };

  var session = { userId: 1 };

  function currentUser() {
    for (var i = 0; i < DB.users.length; i++) {
      if (DB.users[i].id === session.userId) return DB.users[i];
    }
    return DB.users[0];
  }

  function canAccess(area) {
    return (PERMISSIONS[area] || []).indexOf(currentUser().role) !== -1;
  }

  function firstAccessibleArea() {
    var order = ['fleet', 'media', 'reservations', 'availability',
                 'agreements', 'messages', 'users'];
    for (var i = 0; i < order.length; i++) {
      if (canAccess(order[i])) return order[i];
    }
    return null;
  }

  function roleLabel(key) {
    return (ROLES[key] && ROLES[key].label) ||
      key.replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); });
  }

  /* ============================================================
     ROUTING
     ============================================================ */
  function route() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var q = raw.indexOf('?');
    var path = q === -1 ? raw : raw.slice(0, q);
    return {
      segs: path.split('/').filter(Boolean),
      params: new URLSearchParams(q === -1 ? '' : raw.slice(q + 1))
    };
  }

  function go(hash) { location.hash = hash; }

  /* ============================================================
     WRITE GUARD
     ============================================================ */
  var DEMO_MESSAGE = 'Demo mode — this is read-only, so nothing was changed.';

  function block(message) {
    C.toast(message || DEMO_MESSAGE);
  }

  /* ============================================================
     SHELL
     ============================================================ */
  function assetUrl(path) {
    if (!path) return '';
    if (/^(https?:)?\/\//i.test(path)) return path;
    return '../' + path;
  }

  function navLink(area, label, active) {
    if (!canAccess(area)) return '';
    return '<a href="#/' + AREA_ROUTE[area] + '"' +
      (active === area ? ' class="active"' : '') + '>' + label + '</a>';
  }

  function shell(activeArea, bodyHtml) {
    var user = currentUser();
    var roleOptions = Object.keys(ROLES).map(function (key) {
      return '<option value="' + key + '"' +
        (key === user.role ? ' selected' : '') + '>' + esc(ROLES[key].label) + '</option>';
    }).join('');

    return '' +
      '<div class="admin-header">' +
        '<h1>Sol Y Sand Rentals — Admin</h1>' +
        '<div class="admin-user">' +
          '<span>Hi, ' + esc(user.name) + '</span>' +
          '<label style="display:flex;align-items:center;gap:7px;">' +
            '<span style="font-size:11px;letter-spacing:.05em;text-transform:uppercase;opacity:.72;">View as</span>' +
            '<select id="roleSwitcher" class="select-modern" style="padding:5px 28px 5px 10px;font-size:12.5px;">' +
              roleOptions +
            '</select>' +
          '</label>' +
          '<a href="#/change-password">Change Password</a>' +
          (canAccess('diagnostics') ? '<a href="#/diagnostics">Diagnostics</a>' : '') +
          '<a href="../index.html" class="demo-site-link">View Site</a>' +
          '<a href="#/login">Log Out</a>' +
        '</div>' +
      '</div>' +
      '<div class="admin-nav">' +
        navLink('fleet', 'Fleet', activeArea) +
        navLink('media', 'Media', activeArea) +
        navLink('reservations', 'Reservations', activeArea) +
        navLink('availability', 'Availability', activeArea) +
        navLink('messages', 'Messages', activeArea) +
        navLink('agreements', 'Agreements', activeArea) +
        navLink('users', 'Users', activeArea) +
      '</div>' +
      '<div class="admin-content">' +
        '<div class="demo-notice">' +
          '<span class="demo-notice__badge">Read only</span>' +
          '<span>You\'re signed in automatically as a demo user — no password needed. ' +
          'Browse every screen and open any form; <strong>saves, deletes and uploads are intercepted</strong> ' +
          'so the sample data stays put. Use <em>View as</em> above to see how the panel changes per role.</span>' +
        '</div>' +
        bodyHtml +
      '</div>';
  }

  function subtabs(items) {
    return '<div class="fleet-subtabs">' + items.map(function (item) {
      return '<a href="' + item.href + '"' + (item.active ? ' class="active"' : '') +
        '>' + esc(item.label) + '</a>';
    }).join('') + '</div>';
  }

  function bulkToolbar(buttons) {
    return '' +
      '<div class="bulk-toolbar">' +
        '<label class="bulk-select-all"><input type="checkbox" id="selectAllCheckbox"> Select All</label>' +
        '<span class="bulk-count" id="bulkCount">0 selected</span>' +
        '<div class="bulk-buttons" id="bulkButtonsWrap" hidden>' + buttons + '</div>' +
      '</div>';
  }

  function itemCheckbox(id) {
    return '<input type="checkbox" class="item-checkbox" value="' + id +
      '" onclick="event.stopPropagation()">';
  }

  function nl2br(value) { return esc(value).replace(/\n/g, '<br>'); }

  function dash(value) {
    return (value === null || value === undefined || value === '') ? '—' : esc(value);
  }

  function field(label, control) {
    return '<div class="form-field"><label>' + label + '</label>' + control + '</div>';
  }

  function row(label, value) {
    return '<dt>' + label + '</dt><dd>' + value + '</dd>';
  }

  function stat(value, label) {
    return '<div class="demo-stat"><div class="demo-stat__value">' + value +
      '</div><div class="demo-stat__label">' + esc(label) + '</div></div>';
  }

  function iso(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  /* ============================================================
     VIEW — FLEET
     ============================================================ */
  var CATEGORY_LABELS = { golf_cart: 'Golf Cart', motorcycle: 'Motorcycle' };

  function viewFleet(params) {
    var filter = params.get('category');
    if (['golf_cart', 'motorcycle'].indexOf(filter) === -1) filter = 'all';

    var carts = DB.fleet_carts.filter(function (c) {
      return filter === 'all' || c.category === filter;
    }).sort(function (a, b) {
      return (a.sort_order - b.sort_order) || (a.id - b.id);
    });

    var today = C.todayISO();
    var pending = DB.reservations.filter(function (r) {
      return !r.trashed && r.status === 'pending';
    }).length;
    var upcoming = DB.reservations.filter(function (r) {
      return !r.trashed && r.status === 'approved' && r.dropoff_date >= today;
    }).length;
    var inbox = DB.contact_messages.filter(function (m) { return !m.trashed; }).length;

    var stats = '<div class="demo-stats">' +
      stat(DB.fleet_carts.length, 'Vehicles') +
      stat(pending, 'Pending requests') +
      stat(upcoming, 'Active bookings') +
      stat(inbox, 'Inbox messages') +
      '</div>';

    var table = carts.length === 0
      ? '<div class="empty-state">No carts yet. Click "Add New Cart" to create your first listing.</div>'
      : '<table class="admin-table"><thead><tr>' +
          '<th>Photo</th><th>Name</th><th>Category</th><th>Seats</th>' +
          '<th>Price / Day</th><th>Badge</th><th>Actions</th>' +
        '</tr></thead><tbody>' +
        carts.map(function (c) {
          return '<tr>' +
            '<td><img src="' + esc(assetUrl(c.image_url)) + '" alt=""></td>' +
            '<td>' + esc(c.name) + '</td>' +
            '<td>' + esc(CATEGORY_LABELS[c.category] || c.category) + '</td>' +
            '<td>' + c.seats + '</td>' +
            '<td>$' + c.price.toFixed(2) + '</td>' +
            '<td>' + (c.badge ? '<span class="badge-pill">' + esc(c.badge) + '</span>' : '') + '</td>' +
            '<td class="actions">' +
              '<a href="#/fleet/edit/' + c.id + '" class="btn btn-outline btn-sm">Edit</a>' +
              '<button type="button" class="btn btn-navy btn-sm" data-write>Duplicate</button>' +
              '<button type="button" class="btn btn-danger btn-sm" data-write>Delete</button>' +
            '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table>';

    return shell('fleet',
      stats +
      '<div class="admin-content-header">' +
        '<h2>Fleet Inventory</h2>' +
        '<a href="#/fleet/new" class="btn btn-gold">+ Add New Cart</a>' +
      '</div>' +
      subtabs([
        { href: '#/fleet', label: 'All Categories', active: filter === 'all' },
        { href: '#/fleet?category=golf_cart', label: 'Golf Carts', active: filter === 'golf_cart' },
        { href: '#/fleet?category=motorcycle', label: 'Motorcycles', active: filter === 'motorcycle' }
      ]) +
      table);
  }

  /* ============================================================
     VIEW — CART FORM
     ============================================================ */
  function viewCartForm(id) {
    var isEdit = !!id;
    var cart = { name: '', category: 'golf_cart', image_url: '', seats: 4,
                 price: '', cargo: '', power: 'Gas', badge: '',
                 description: '', sort_order: 0 };
    if (isEdit) {
      var found = DB.fleet_carts.filter(function (c) { return c.id === Number(id); })[0];
      if (!found) return notFound('That cart no longer exists.', '#/fleet', 'Back to Fleet');
      cart = found;
    }

    var badges = ['', 'Best Value', 'Most Popular', 'Premium'];
    var images = DB.media_files.filter(function (m) {
      return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].indexOf(m.file_type) !== -1;
    });

    return shell('fleet',
      '<div class="admin-content-header">' +
        '<h2>' + (isEdit ? 'Edit Cart' : 'Add New Cart') + '</h2>' +
        '<a href="#/fleet" class="btn btn-outline">&larr; Back to Fleet</a>' +
      '</div>' +
      '<div class="form-card"><form data-demo-form>' +
        field('Cart Name', '<input type="text" name="name" value="' + esc(cart.name) + '" required>') +
        field('Category',
          '<select name="category">' +
            Object.keys(CATEGORY_LABELS).map(function (k) {
              return '<option value="' + k + '"' + (cart.category === k ? ' selected' : '') +
                '>' + CATEGORY_LABELS[k] + '</option>';
            }).join('') +
          '</select>') +
        '<div class="form-field">' +
          '<label>Image URL</label>' +
          '<input type="text" name="image_url" id="imageUrlField" value="' + esc(cart.image_url) +
            '" placeholder="https://... or uploads/media/filename.jpg">' +
          '<div class="form-hint">Paste an image link, choose one already in your Media Library, ' +
            'or upload a new file below (a new upload takes priority if more than one is filled in).</div>' +
          '<div style="margin-top:10px;display:flex;align-items:center;gap:14px;">' +
            '<button type="button" class="btn btn-outline btn-sm" id="openMediaPicker">' +
              '<i class="fas fa-images"></i> Choose from Media</button>' +
            '<img id="imageUrlPreview" src="' + esc(assetUrl(cart.image_url)) + '" alt="" ' +
              'style="height:52px;width:70px;object-fit:cover;border-radius:6px;background:#F6F3EC;' +
              (cart.image_url ? '' : 'display:none;') + '">' +
          '</div>' +
        '</div>' +
        field('Or Upload Image',
          '<input type="file" name="image_file" accept=".jpg,.jpeg,.png,.webp">' +
          '<div class="form-hint">JPG, PNG, or WEBP. Max 5MB.</div>') +
        '<div class="form-row">' +
          field('Seats', '<input type="number" name="seats" value="' + cart.seats + '" min="1" max="20" required>') +
          field('Price Per Day (USD)', '<input type="number" name="price" value="' + esc(cart.price) + '" step="0.01" min="0" required>') +
        '</div>' +
        '<div class="form-row">' +
          field('Cargo Note', '<input type="text" name="cargo" value="' + esc(cart.cargo) + '" placeholder="e.g. Small Cargo, All Terrain">') +
          field('Power', '<input type="text" name="power" value="' + esc(cart.power) + '" placeholder="e.g. All Electric">') +
        '</div>' +
        '<div class="form-row">' +
          field('Badge (optional)',
            '<select name="badge">' +
              badges.map(function (b) {
                return '<option value="' + esc(b) + '"' + (cart.badge === b ? ' selected' : '') +
                  '>' + (b || 'None') + '</option>';
              }).join('') +
            '</select>') +
          field('Sort Order',
            '<input type="number" name="sort_order" value="' + cart.sort_order + '">' +
            '<div class="form-hint">Lower numbers show first on the Our Fleet page.</div>') +
        '</div>' +
        field('Description', '<textarea name="description">' + esc(cart.description) + '</textarea>') +
        '<button type="submit" class="btn btn-gold">Save Cart</button>' +
      '</form></div>' +

      '<div id="mediaPickerModal" class="media-picker-backdrop">' +
        '<div class="media-picker-box">' +
          '<div class="media-picker-header">' +
            '<h3>Choose from Media</h3>' +
            '<button type="button" class="media-picker-close">&times;</button>' +
          '</div>' +
          '<input type="text" id="mediaPickerSearch" placeholder="Search by name…">' +
          '<div class="media-picker-grid" id="mediaPickerGrid">' +
            images.map(function (img) {
              return '<div class="media-picker-item" data-name="' + esc(img.display_name.toLowerCase()) +
                '" data-file="' + esc(img.filename) + '">' +
                '<img src="' + esc(assetUrl(img.filename)) + '" alt="' + esc(img.alt_text) + '">' +
                '<div class="media-picker-name">' + esc(img.display_name) + '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>');
  }

  function afterCartForm() {
    var modal = document.getElementById('mediaPickerModal');
    if (!modal) return;
    var open = document.getElementById('openMediaPicker');
    var search = document.getElementById('mediaPickerSearch');

    open.addEventListener('click', function () { modal.classList.add('is-open'); });
    modal.querySelector('.media-picker-close').addEventListener('click', function () {
      modal.classList.remove('is-open');
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('is-open');
    });
    search.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      Array.prototype.forEach.call(modal.querySelectorAll('.media-picker-item'), function (item) {
        item.style.display = !q || item.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
      });
    });
    Array.prototype.forEach.call(modal.querySelectorAll('.media-picker-item'), function (item) {
      item.addEventListener('click', function () {
        var file = item.getAttribute('data-file');
        var input = document.getElementById('imageUrlField');
        var preview = document.getElementById('imageUrlPreview');
        input.value = file;
        preview.src = assetUrl(file);
        preview.style.display = 'block';
        modal.classList.remove('is-open');
        C.toast('Image selected. Saving is disabled in the demo.', 'info');
      });
    });
  }

  /* ============================================================
     VIEW — MEDIA
     ============================================================ */
  function viewMedia() {
    var files = DB.media_files.slice().sort(function (a, b) {
      return a.uploaded_at < b.uploaded_at ? 1 : -1;
    });

    var grid = files.length === 0
      ? '<div class="empty-state">No files uploaded yet.</div>'
      : '<div class="media-grid">' + files.map(function (f) {
          var isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].indexOf(f.file_type) !== -1;
          return '<div class="media-card">' +
            '<div class="media-thumb">' +
              (isImage
                ? '<img src="' + esc(assetUrl(f.filename)) + '" alt="' + esc(f.alt_text) + '">'
                : '<i class="fas fa-file"></i>') +
            '</div>' +
            '<div class="media-info">' +
              '<div class="name" title="' + esc(f.display_name) + '">' + esc(f.display_name) + '</div>' +
              '<div class="meta">' + esc(f.file_type.toUpperCase()) + ' &middot; ' +
                Math.round(f.file_size / 1024) + ' KB</div>' +
              '<div class="media-actions">' +
                '<a href="#/media/edit/' + f.id + '" class="btn btn-outline btn-sm">Edit</a>' +
                '<button type="button" class="btn btn-danger btn-sm" data-write>Delete</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>';

    return shell('media',
      '<div class="admin-content-header">' +
        '<h2>Media Library</h2>' +
        '<button type="button" class="btn btn-outline" data-write>Sync Existing Site Files</button>' +
      '</div>' +
      grid +
      '<div class="form-card">' +
        '<h3 style="margin-bottom:16px;font-size:17px;">Upload New File</h3>' +
        '<form data-demo-form>' +
          field('File',
            '<input type="file" name="media_file" accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt">' +
            '<div class="form-hint">Allowed: images (PNG, JPG, GIF, WEBP, SVG), PDF, Word, Excel, ' +
              'PowerPoint, and plain text. Max 10MB.</div>') +
          field('Alt Text (for images — helps accessibility &amp; SEO)',
            '<input type="text" name="alt_text" placeholder="Describe what\'s in the image">') +
          '<button type="submit" class="btn btn-gold">Upload</button>' +
        '</form>' +
      '</div>');
  }

  function viewMediaEdit(id) {
    var file = DB.media_files.filter(function (m) { return m.id === Number(id); })[0];
    if (!file) return notFound('That file no longer exists.', '#/media', 'Back to Media');
    var isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].indexOf(file.file_type) !== -1;

    return shell('media',
      '<div class="admin-content-header">' +
        '<h2>Edit File</h2>' +
        '<a href="#/media" class="btn btn-outline">&larr; Back to Media</a>' +
      '</div>' +
      '<div class="form-card">' +
        (isImage ? '<img src="' + esc(assetUrl(file.filename)) + '" alt="' + esc(file.alt_text) +
          '" style="max-width:100%;max-height:220px;border-radius:6px;margin-bottom:20px;">' : '') +
        '<form data-demo-form>' +
          field('Display Name', '<input type="text" name="display_name" value="' + esc(file.display_name) + '" required>') +
          field('Alt Text', '<input type="text" name="alt_text" value="' + esc(file.alt_text) +
            '" placeholder="Describe what\'s in the image">') +
          '<div class="form-hint" style="margin-bottom:16px;">File: ' + esc(file.filename) + ' (' +
            esc(file.file_type.toUpperCase()) + ', ' + Math.round(file.file_size / 1024) + ' KB)</div>' +
          '<button type="submit" class="btn btn-gold">Save Changes</button>' +
        '</form>' +
      '</div>');
  }

  /* ============================================================
     VIEW — RESERVATIONS
     ============================================================ */
  function viewReservations(params) {
    var filter = params.get('status') || 'all';
    if (['all', 'pending', 'approved', 'declined', 'trashed'].indexOf(filter) === -1) filter = 'all';

    var rows = DB.reservations.filter(function (r) {
      if (filter === 'trashed') return r.trashed;
      if (r.trashed) return false;
      return filter === 'all' || r.status === filter;
    }).sort(function (a, b) { return a.submitted_at < b.submitted_at ? 1 : -1; });

    var body = '';
    if (rows.length) {
      body += bulkToolbar(filter !== 'trashed'
        ? '<button type="button" class="btn btn-trash btn-sm" data-write>Move Selected to Trash</button>'
        : '<button type="button" class="btn btn-restore btn-sm" data-write>Restore Selected</button>' +
          '<button type="button" class="btn btn-delete-forever btn-sm" data-write>Delete Selected Permanently</button>');

      body += rows.map(function (r) {
        var pillClass = r.trashed ? 'trashed' : r.status;
        var pillText = r.trashed ? 'Trashed' : r.status.charAt(0).toUpperCase() + r.status.slice(1);

        return '<div class="res-card"><details><summary>' +
          '<div class="res-summary-left">' + itemCheckbox(r.id) +
            '<div>' +
              '<div class="res-summary-main">' + esc(r.full_name) + ' &mdash; ' +
                esc(r.pickup_date) + ' to ' + esc(r.dropoff_date) + '</div>' +
              '<div class="res-summary-meta">' + esc(C.fmtDateTime(r.submitted_at)) + '</div>' +
            '</div>' +
          '</div>' +
          '<span class="status-pill status-' + pillClass + '">' + pillText + '</span>' +
        '</summary>' +

        '<div class="res-details">' +
          '<div><dl>' +
            row('Email', esc(r.email)) +
            row('Phone', dash(r.phone)) +
            row('Staying At', dash(r.rental_location)) +
            row('Delivery Area', esc(r.pickup_location) + ' &mdash; ' + esc(r.pickup_date) +
              ' at ' + esc(r.pickup_time)) +
            row('Return', esc(r.dropoff_date) + ' at ' + esc(r.dropoff_time)) +
            row('Cart Type', dash(r.cart_type)) +
            row('Number of Carts', dash(r.num_carts)) +
          '</dl></div>' +
          '<div><dl>' +
            row('Season', dash(r.season)) +
            row('Estimated Days', dash(r.estimated_days)) +
            row('Daily Rate', r.daily_rate ? '$' + esc(r.daily_rate) : '—') +
            row('Subtotal', r.subtotal ? '$' + esc(r.subtotal) : '—') +
            row('13% IVA Tax', r.iva_tax ? '$' + esc(r.iva_tax) : '—') +
            row('Estimated Total', r.estimated_total ? '$' + esc(r.estimated_total) : '—') +
            row('Payment Method', dash(r.payment_method)) +
            row('Refueling Option', dash(r.refueling_option)) +
            row('Insurance Option', dash(r.insurance_option)) +
          '</dl></div>' +
        '</div>' +

        (r.special_requests
          ? '<dt style="font-size:11px;text-transform:uppercase;color:#55606B;font-weight:700;margin-top:14px;">Special Requests</dt>' +
            '<p style="font-size:13.5px;color:#0B3D54;margin-top:4px;">' + nl2br(r.special_requests) + '</p>'
          : '') +

        '<div class="res-actions">' +
          (!r.trashed
            ? '<form data-demo-form class="status-form">' +
                '<select name="status" class="select-modern">' +
                  ['pending', 'approved', 'declined'].map(function (s) {
                    return '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' +
                      s.charAt(0).toUpperCase() + s.slice(1) + '</option>';
                  }).join('') +
                '</select>' +
                '<button type="submit" class="btn btn-gold btn-sm">Update Status</button>' +
              '</form>' +
              '<button type="button" class="btn btn-trash btn-sm" data-write>Move to Trash</button>'
            : '<button type="button" class="btn btn-restore btn-sm" data-write>Restore</button>' +
              '<button type="button" class="btn btn-delete-forever btn-sm" data-write>Delete Permanently</button>') +
        '</div>' +
        '</details></div>';
      }).join('');
    } else {
      body = '<div class="empty-state">' +
        (filter === 'trashed' ? 'Trash is empty.' : 'No reservation requests yet.') + '</div>';
    }

    return shell('reservations',
      '<div class="admin-content-header"><h2>Reservation Requests</h2></div>' +
      subtabs([
        { href: '#/reservations', label: 'All', active: filter === 'all' },
        { href: '#/reservations?status=pending', label: 'Pending', active: filter === 'pending' },
        { href: '#/reservations?status=approved', label: 'Approved', active: filter === 'approved' },
        { href: '#/reservations?status=declined', label: 'Declined', active: filter === 'declined' },
        { href: '#/reservations?status=trashed', label: 'Trash', active: filter === 'trashed' }
      ]) + body);
  }

  /* ============================================================
     VIEW — MESSAGES
     ============================================================ */
  function viewMessages(params) {
    var view = params.get('view') === 'trashed' ? 'trashed' : 'inbox';
    var rows = DB.contact_messages.filter(function (m) {
      return view === 'trashed' ? m.trashed : !m.trashed;
    }).sort(function (a, b) { return a.submitted_at < b.submitted_at ? 1 : -1; });

    var body = '';
    if (rows.length) {
      body += bulkToolbar(view !== 'trashed'
        ? '<button type="button" class="btn btn-trash btn-sm" data-write>Move Selected to Trash</button>'
        : '<button type="button" class="btn btn-restore btn-sm" data-write>Restore Selected</button>' +
          '<button type="button" class="btn btn-delete-forever btn-sm" data-write>Delete Selected Permanently</button>');

      body += rows.map(function (m) {
        return '<div class="msg-card"><details><summary>' +
          '<div class="msg-summary-left">' + itemCheckbox(m.id) +
            '<div>' +
              '<div class="msg-summary-main">' + esc(m.full_name) + ' &mdash; ' +
                esc(m.subject || 'No Subject') + '</div>' +
              '<div class="msg-summary-meta">' + esc(C.fmtDateTime(m.submitted_at)) + '</div>' +
            '</div>' +
          '</div>' +
        '</summary>' +
        '<div class="msg-details">' +
          '<div><dl>' + row('Email', esc(m.email)) + row('Phone', dash(m.phone)) + '</dl></div>' +
          '<div><dl>' + row('Staying At', dash(m.rental_location)) +
            row('Refueling Option', dash(m.refuel_option)) + '</dl></div>' +
        '</div>' +
        '<dt style="font-size:11px;text-transform:uppercase;color:#55606B;font-weight:700;margin-top:14px;">Message</dt>' +
        '<p class="msg-body">' + nl2br(m.message) + '</p>' +
        '<div class="msg-actions">' +
          (view !== 'trashed'
            ? '<button type="button" class="btn btn-trash btn-sm" data-write>Move to Trash</button>'
            : '<button type="button" class="btn btn-restore btn-sm" data-write>Restore</button>' +
              '<button type="button" class="btn btn-delete-forever btn-sm" data-write>Delete Permanently</button>') +
        '</div>' +
        '</details></div>';
      }).join('');
    } else {
      body = '<div class="empty-state">' +
        (view === 'trashed' ? 'Trash is empty.' : 'No contact messages yet.') + '</div>';
    }

    return shell('messages',
      '<div class="admin-content-header"><h2>Contact Form Messages</h2></div>' +
      subtabs([
        { href: '#/messages', label: 'Inbox', active: view === 'inbox' },
        { href: '#/messages?view=trashed', label: 'Trash', active: view === 'trashed' }
      ]) + body);
  }

  /* ============================================================
     VIEW — AGREEMENTS
     ============================================================ */
  function viewAgreements(params) {
    var view = params.get('view') === 'trashed' ? 'trashed' : 'active';
    var rows = DB.rental_agreements.filter(function (a) {
      return view === 'trashed' ? a.trashed : !a.trashed;
    }).sort(function (a, b) { return a.agreed_at < b.agreed_at ? 1 : -1; });

    var body = '';
    if (rows.length) {
      body += bulkToolbar(view !== 'trashed'
        ? '<button type="button" class="btn btn-trash btn-sm" data-write>Move Selected to Trash</button>'
        : '<button type="button" class="btn btn-restore btn-sm" data-write>Restore Selected</button>' +
          '<button type="button" class="btn btn-delete-forever btn-sm" data-write>Delete Selected Permanently</button>');

      body += rows.map(function (a) {
        return '<div class="ag-card"><details><summary>' +
          '<div class="ag-summary-left">' + itemCheckbox(a.id) +
            '<div><span>' + esc(a.full_name) + ' &mdash; ' + esc(a.email) + '</span>' +
              '<div class="ag-meta">' + esc(C.fmtDateTime(a.agreed_at)) + '</div>' +
            '</div>' +
          '</div>' +
        '</summary>' +
        '<div class="ag-details">' +
          '<div><dl>' +
            row('Date of Birth', dash(a.date_of_birth)) +
            row('Passport / ID #', dash(a.id_number)) +
            row('Staying At', dash(a.rental_location)) +
            row('Phone', dash(a.phone)) +
          '</dl></div>' +
          '<div><dl>' +
            row('Insurance Selected',
              esc((a.insurance_option || 'none').replace(/^./, function (c) { return c.toUpperCase(); }))) +
            row('Additional Driver 1', dash(a.driver2_name) +
              (a.driver2_license ? ' (' + esc(a.driver2_license) + ')' : '')) +
            row('Additional Driver 2', dash(a.driver3_name) +
              (a.driver3_license ? ' (' + esc(a.driver3_license) + ')' : '')) +
            row('IP Address', dash(a.ip_address)) +
          '</dl></div>' +
        '</div>' +
        '<div class="ag-photos">' +
          '<a href="' + esc(assetUrl(a.license_front_path)) + '" target="_blank" rel="noopener">' +
            '<img src="' + esc(assetUrl(a.license_front_path)) + '" alt="License front"></a>' +
          '<a href="' + esc(assetUrl(a.license_back_path)) + '" target="_blank" rel="noopener">' +
            '<img src="' + esc(assetUrl(a.license_back_path)) + '" alt="License back"></a>' +
        '</div>' +
        '<div class="ag-sig">' +
          '<dt style="font-size:11px;text-transform:uppercase;color:#55606B;font-weight:700;margin-top:14px;">Signature</dt>' +
          '<img src="' + esc(assetUrl(a.signature_path)) + '" alt="Signature">' +
        '</div>' +
        '<div class="ag-actions">' +
          (view !== 'trashed'
            ? '<button type="button" class="btn btn-trash btn-sm" data-write>Move to Trash</button>'
            : '<button type="button" class="btn btn-restore btn-sm" data-write>Restore</button>' +
              '<button type="button" class="btn btn-delete-forever btn-sm" data-write>Delete Permanently</button>') +
        '</div>' +
        '</details></div>';
      }).join('');
    } else {
      body = '<div class="empty-state">' +
        (view === 'trashed' ? 'Trash is empty.' : 'No agreements signed yet.') + '</div>';
    }

    return shell('agreements',
      '<div class="admin-content-header"><h2>Signed Rental Agreements</h2></div>' +
      subtabs([
        { href: '#/agreements', label: 'All', active: view === 'active' },
        { href: '#/agreements?view=trashed', label: 'Trash', active: view === 'trashed' }
      ]) + body);
  }

  /* ============================================================
     VIEW — AVAILABILITY
     ============================================================ */
  function viewAvailability(params) {
    var view = params.get('view');
    if (['week', 'month', 'quarter'].indexOf(view) === -1) view = 'month';
    var anchor = params.get('date') || C.todayISO();
    var anchorDate = C.parse(anchor) || new Date();

    var shift = function (date, days, months) {
      var d = new Date(date.getTime());
      if (days) d.setDate(d.getDate() + days);
      if (months) d.setMonth(d.getMonth() + months);
      return d;
    };

    var rangeStart, rangeEnd, label, prevAnchor, nextAnchor;
    var FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                       'August', 'September', 'October', 'November', 'December'];

    if (view === 'week') {
      var dow = (anchorDate.getDay() + 6) % 7;           // Monday-first
      rangeStart = shift(anchorDate, -dow);
      rangeEnd = shift(rangeStart, 7);
      var lastDay = shift(rangeEnd, -1);
      label = C.MONTHS[rangeStart.getMonth()] + ' ' + rangeStart.getDate() + ' – ' +
        C.MONTHS[lastDay.getMonth()] + ' ' + lastDay.getDate() + ', ' + lastDay.getFullYear();
      prevAnchor = iso(shift(anchorDate, -7));
      nextAnchor = iso(shift(anchorDate, 7));
    } else {
      var months = view === 'quarter' ? 3 : 1;
      rangeStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      rangeEnd = shift(rangeStart, 0, months);
      var last = shift(rangeEnd, -1);
      label = view === 'quarter'
        ? C.MONTHS[rangeStart.getMonth()] + ' ' + rangeStart.getFullYear() + ' – ' +
          C.MONTHS[last.getMonth()] + ' ' + last.getFullYear()
        : FULL_MONTHS[rangeStart.getMonth()] + ' ' + rangeStart.getFullYear();
      prevAnchor = iso(shift(anchorDate, 0, -months));
      nextAnchor = iso(shift(anchorDate, 0, months));
    }

    var vehicles = DB.fleet_carts.slice().sort(function (a, b) {
      return a.category.localeCompare(b.category) || (a.sort_order - b.sort_order) || (a.id - b.id);
    });

    var startISO = iso(rangeStart), endISO = iso(rangeEnd);
    var byDate = {};
    DB.availability_blocks.forEach(function (b) {
      if (b.block_date < startISO || b.block_date >= endISO) return;
      (byDate[b.block_date] = byDate[b.block_date] || []).push(b);
    });

    var today = C.todayISO();
    var rowsHtml = '';
    for (var d = new Date(rangeStart); d < rangeEnd; d.setDate(d.getDate() + 1)) {
      var dateStr = iso(d);
      var dayBlocks = byDate[dateStr] || [];
      rowsHtml += '<tr' + (dateStr === today ? ' class="today"' : '') + '>' +
        '<td class="date-cell">' +
          (view === 'quarter' ? C.fmtMonthDayShort(dateStr) : C.fmtDayMonth(dateStr)) +
        '</td>' +
        vehicles.map(function (v) {
          var cell = null;
          for (var i = 0; i < dayBlocks.length; i++) {
            var b = dayBlocks[i];
            if (b.cart_id !== null && Number(b.cart_id) !== v.id) continue;
            if (b.block_type === 'maintenance' && b.available_at &&
                C.parse(b.available_at) <= new Date()) continue;
            cell = b;
            if (Number(b.cart_id) === v.id) break;
          }
          if (!cell) return '<td><span class="cell-available">&mdash;</span></td>';
          if (cell.block_type === 'booking') {
            return '<td><span class="cell-booking" title="Reservation #' + cell.reservation_id + '">' +
              esc(cell.guest_name || 'Booked') + '</span></td>';
          }
          return '<td><span class="cell-maintenance" title="' +
            esc(cell.note || 'Maintenance') + '">Maintenance</span></td>';
        }).join('') +
      '</tr>';
    }

    /* Active maintenance blocks, grouped by batch. */
    var batches = {};
    DB.availability_blocks.forEach(function (b) {
      if (b.block_type !== 'maintenance' || !b.batch_id) return;
      var key = [b.batch_id, b.note, b.available_at].join('|');
      if (!batches[key]) {
        batches[key] = {
          batch_id: b.batch_id, note: b.note, available_at: b.available_at,
          cart_ids: [], start_date: b.block_date, end_date: b.block_date
        };
      }
      var g = batches[key];
      if (b.cart_id !== null && g.cart_ids.indexOf(b.cart_id) === -1) g.cart_ids.push(b.cart_id);
      if (b.block_date < g.start_date) g.start_date = b.block_date;
      if (b.block_date > g.end_date) g.end_date = b.block_date;
    });

    var names = {};
    vehicles.forEach(function (v) { names[v.id] = v.name; });

    var batchList = Object.keys(batches).map(function (k) { return batches[k]; })
      .sort(function (a, b) { return a.start_date < b.start_date ? 1 : -1; });

    var batchHtml = batchList.length === 0
      ? '<div class="empty-state">No vehicles are currently blocked for maintenance.</div>'
      : '<div style="overflow-x:auto;"><table class="batch-table">' +
        '<tr><th>Vehicles</th><th>Dates</th><th>Note</th><th>Available Again</th><th></th></tr>' +
        batchList.map(function (b) {
          var expired = b.available_at && C.parse(b.available_at) <= new Date();
          var vehicleLabel = b.cart_ids.length === 0
            ? 'All Fleet'
            : b.cart_ids.map(function (id) { return names[id] || ('Vehicle #' + id); }).join(', ');
          return '<tr' + (expired ? ' style="opacity:0.5;"' : '') + '>' +
            '<td>' + esc(vehicleLabel) + '</td>' +
            '<td>' + esc(b.start_date) +
              (b.start_date !== b.end_date ? ' &ndash; ' + esc(b.end_date) : '') + '</td>' +
            '<td>' + dash(b.note) + '</td>' +
            '<td>' + (b.available_at
              ? esc(C.fmtDateTime(b.available_at)) + (expired ? ' (cleared)' : '')
              : 'Until manually cleared') + '</td>' +
            '<td class="batch-actions">' +
              (expired ? '' : '<button type="button" class="btn btn-restore btn-sm" data-write>Mark Available Now</button>') +
              '<button type="button" class="btn btn-trash btn-sm" data-write>Remove</button>' +
            '</td>' +
          '</tr>';
        }).join('') + '</table></div>';

    var viewTab = function (key, text) {
      return '<a href="#/availability?view=' + key + '&date=' + anchor + '"' +
        (view === key ? ' class="active"' : '') + '>' + text + '</a>';
    };

    return shell('availability',
      '<div class="admin-content-header"><h2>Fleet Availability</h2></div>' +

      '<div class="avail-card">' +
        '<h3>Calendar — ' + esc(label) + '</h3>' +
        '<div class="view-tabs">' + viewTab('week', 'Week') + viewTab('month', 'Month') +
          viewTab('quarter', 'Quarter') + '</div>' +
        '<div class="month-nav">' +
          '<a href="#/availability?view=' + view + '&date=' + prevAnchor + '">&larr; Prev</a>' +
          '<a href="#/availability?view=' + view + '&date=' + today + '" class="today-link">Today</a>' +
          '<span>' + esc(label) + '</span>' +
          '<a href="#/availability?view=' + view + '&date=' + nextAnchor + '">Next &rarr;</a>' +
        '</div>' +
        '<div class="legend">' +
          '<span><span class="swatch" style="background:#E7F3E8;"></span> Booked (approved reservation)</span>' +
          '<span><span class="swatch" style="background:#FCE8E6;"></span> Maintenance</span>' +
          '<span><span class="swatch" style="background:#fff;border:1px solid #E6E1D5;"></span> Available</span>' +
        '</div>' +
        '<div style="overflow-x:auto;"><table class="cal-table">' +
          '<tr><th>Date</th>' + vehicles.map(function (v) {
            return '<th>' + esc(v.name) + '</th>';
          }).join('') + '</tr>' + rowsHtml +
        '</table></div>' +
      '</div>' +

      '<div class="avail-card">' +
        '<h3>Block Vehicles for Maintenance</h3>' +
        '<form data-demo-form class="quick-block">' +
          '<p>Need to pull the <strong>whole fleet</strong> offline right now (e.g. a storm, an urgent ' +
          'issue)? One click blocks every vehicle starting today. You can set an exact return time ' +
          'below, or clear it manually once resolved.</p>' +
          '<button type="submit" class="btn btn-gold">Block Entire Fleet Now</button>' +
        '</form>' +

        '<form data-demo-form class="maint-form">' +
          '<label>Vehicles</label>' +
          '<div class="vehicle-checks">' +
            '<label><input type="checkbox" id="allFleetCheck"> All Fleet</label>' +
            vehicles.map(function (v) {
              return '<label><input type="checkbox" class="vehicle-check" value="' + v.id + '"> ' +
                esc(v.name) + '</label>';
            }).join('') +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-field"><label>Start Date</label>' +
              '<input type="date" name="start_date" value="' + today + '" required></div>' +
            '<div class="form-field"><label>End Date</label>' +
              '<input type="date" name="end_date" value="' + today + '" required></div>' +
            '<div class="form-field"><label>Available Again (optional exact time)</label>' +
              '<input type="datetime-local" name="available_at"></div>' +
          '</div>' +
          '<div class="form-field" style="margin-bottom:16px;">' +
            '<label>Note (shown to customers on the Reservations page)</label>' +
            '<input type="text" name="note" placeholder="e.g. Scheduled maintenance" maxlength="500">' +
          '</div>' +
          '<button type="submit" class="btn btn-gold">Block Selected Vehicles</button>' +
        '</form>' +
      '</div>' +

      '<div class="avail-card"><h3>Active Maintenance Blocks</h3>' + batchHtml + '</div>');
  }

  function afterAvailability() {
    var all = document.getElementById('allFleetCheck');
    if (!all) return;
    all.addEventListener('change', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.vehicle-check'), function (cb) {
        cb.checked = false;
        cb.disabled = all.checked;
      });
    });
  }

  /* ============================================================
     VIEW — USERS
     ============================================================ */
  function viewUsers() {
    var me = currentUser();
    var table = '<table class="admin-table" style="margin-bottom:30px;"><thead><tr>' +
      '<th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Added</th><th>Actions</th>' +
      '</tr></thead><tbody>' +
      DB.users.map(function (u) {
        return '<tr>' +
          '<td>' + esc(u.name) + '</td>' +
          '<td>' + esc(u.username) + '</td>' +
          '<td>' + esc(u.email) +
            (u.pending_email
              ? '<div class="form-hint">Pending confirmation: ' + esc(u.pending_email) + '</div>'
              : '') +
          '</td>' +
          '<td><span class="role-badge role-' + esc(u.role) + '">' + esc(roleLabel(u.role)) + '</span></td>' +
          '<td>' + esc(C.fmtDate(u.created_at)) + '</td>' +
          '<td class="actions">' +
            '<a href="#/users/edit/' + u.id + '" class="btn btn-outline btn-sm">Edit</a>' +
            (u.id !== me.id
              ? '<button type="button" class="btn btn-danger btn-sm" data-write>Delete</button>'
              : '<span class="form-hint">(you)</span>') +
          '</td>' +
        '</tr>';
      }).join('') + '</tbody></table>';

    return shell('users',
      '<div class="admin-content-header"><h2>Admin Users</h2></div>' + table +
      '<div class="form-card">' +
        '<h3 style="margin-bottom:16px;font-size:17px;">Add New User</h3>' +
        '<form data-demo-form>' +
          '<div class="form-row">' +
            field('Full Name', '<input type="text" name="name" required>') +
            field('Username', '<input type="text" name="username" required pattern="[A-Za-z0-9_\\.]+" ' +
              'title="Letters, numbers, underscores, and periods only">') +
          '</div>' +
          field('Email Address', '<input type="email" name="email" required>') +
          field('Role',
            '<select name="role" id="newUserRole" required>' +
              Object.keys(ROLES).map(function (k) {
                return '<option value="' + k + '"' + (k === 'administrator' ? ' selected' : '') +
                  '>' + esc(ROLES[k].label) + '</option>';
              }).join('') +
            '</select><div class="form-hint" id="roleHint"></div>') +
          field('Temporary Password (min 8 characters)',
            '<input type="password" name="password" required minlength="8">' +
            '<div class="form-hint">Share this with them separately — they can change it later from ' +
            'their own login via "Change Password."</div>') +
          '<button type="submit" class="btn btn-gold">Add User</button>' +
        '</form>' +
      '</div>');
  }

  function afterUsers() {
    var select = document.getElementById('newUserRole');
    var hint = document.getElementById('roleHint');
    if (!select || !hint) return;
    var update = function () { hint.textContent = ROLES[select.value].description; };
    select.addEventListener('change', update);
    update();
  }

  function viewUserEdit(id) {
    var user = DB.users.filter(function (u) { return u.id === Number(id); })[0];
    if (!user) return notFound('That user no longer exists.', '#/users', 'Back to Users');
    var isSelf = user.id === currentUser().id;

    return shell('users',
      '<div class="admin-content-header">' +
        '<h2>Edit User</h2>' +
        '<a href="#/users" class="btn btn-outline">&larr; Back to Users</a>' +
      '</div>' +
      (user.pending_email
        ? '<div class="alert alert-error">There\'s already a pending email change to ' +
          esc(user.pending_email) + ', waiting on their confirmation. Submitting a new email below ' +
          'will replace that pending request with a new confirmation link.</div>'
        : '') +
      '<div class="form-card"><form data-demo-form>' +
        '<div class="form-row">' +
          field('Full Name', '<input type="text" name="name" value="' + esc(user.name) + '" required>') +
          field('Username', '<input type="text" name="username" value="' + esc(user.username) +
            '" required pattern="[A-Za-z0-9_\\.]+">') +
        '</div>' +
        '<div class="form-hint" style="margin:-8px 0 16px;">Name and username changes save ' +
          'immediately, no confirmation needed.</div>' +
        field('Role',
          '<select name="role" required' + (isSelf ? ' disabled' : '') + '>' +
            Object.keys(ROLES).map(function (k) {
              return '<option value="' + k + '"' + (k === user.role ? ' selected' : '') + '>' +
                esc(ROLES[k].label) + '</option>';
            }).join('') +
          '</select>' +
          (isSelf ? '<div class="form-hint">You can\'t change your own role. Ask another Super Admin to do it.</div>' : '')) +
        field('Email Address',
          '<input type="email" name="email" value="' + esc(user.email) + '" required>' +
          '<div class="form-hint">Changing this sends a confirmation link to the <strong>new</strong> ' +
          'address. The email on file only changes once they click it — this account\'s current email ' +
          'stays active until then.</div>') +
        field('Set New Temporary Password (optional)',
          '<input type="password" name="new_password" minlength="8" ' +
          'placeholder="Leave blank to keep their current password">' +
          '<div class="form-hint">This takes effect immediately, no confirmation needed. Share it ' +
          'with them separately.</div>') +
        '<button type="submit" class="btn btn-gold">Save Changes</button>' +
      '</form></div>');
  }

  /* ============================================================
     VIEW — DIAGNOSTICS
     ============================================================ */
  function viewDiagnostics() {
    var checks = [
      ['Database Connection (db-credentials.php)', 'Connected — 8 tables reachable.'],
      ['Table: reservations', DB.reservations.length + ' row(s) readable.'],
      ['Table: contact_messages', DB.contact_messages.length + ' row(s) readable.'],
      ['Table: fleet_carts', DB.fleet_carts.length + ' row(s) readable.'],
      ['Table: media_files', DB.media_files.length + ' row(s) readable.'],
      ['Table: rental_agreements', DB.rental_agreements.length + ' row(s) readable.'],
      ['Table: availability_blocks', DB.availability_blocks.length + ' row(s) readable.'],
      ['Table: users', DB.users.length + ' row(s) readable.'],
      ['Write test (INSERT + DELETE on reservations)', 'Skipped — this demo build is read-only.']
    ];

    return shell(null,
      '<div class="admin-content-header"><h2>Diagnostics</h2></div>' +
      '<div class="diag-note">This page tests the exact things the Contact and Check Availability ' +
      'forms rely on. In the live build it runs real queries against MySQL and sends a real test ' +
      'email; here the results come from the bundled demo dataset.</div>' +
      '<div class="diag-card">' +
        checks.map(function (c, i) {
          var ok = i !== checks.length - 1;
          return '<div class="diag-row">' +
            '<div class="diag-icon ' + (ok ? 'ok' : 'fail') + '">' + (ok ? '✓' : '✕') + '</div>' +
            '<div><div class="diag-label">' + esc(c[0]) + '</div>' +
              '<div class="diag-detail">' + esc(c[1]) + '</div></div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="diag-card">' +
        '<div class="diag-label" style="margin-bottom:8px;">Mail Test</div>' +
        '<form data-demo-form class="diag-form">' +
          '<input type="email" name="test_email" placeholder="you@example.com" required>' +
          '<button type="submit" class="btn btn-gold btn-sm">Send Test Email</button>' +
        '</form>' +
      '</div>');
  }

  /* ============================================================
     VIEW — CHANGE PASSWORD / LOGIN / FALLBACKS
     ============================================================ */
  function viewChangePassword() {
    return shell(null,
      '<div class="admin-content-header">' +
        '<h2>Change Password</h2>' +
        '<a href="#/fleet" class="btn btn-outline">&larr; Back</a>' +
      '</div>' +
      '<div class="form-card"><form data-demo-form>' +
        field('Current Password', '<input type="password" name="current_password" required>') +
        field('New Password (min 8 characters)', '<input type="password" name="new_password" required minlength="8">') +
        field('Confirm New Password', '<input type="password" name="confirm_password" required minlength="8">') +
        '<button type="submit" class="btn btn-gold">Update Password</button>' +
      '</form></div>');
  }

  function viewLogin() {
    return '' +
      '<div class="auth-card">' +
        '<h1>Admin Login</h1>' +
        '<p class="auth-sub">Sol y Sand Rentals</p>' +
        '<div class="alert alert-success" style="text-align:left;">' +
          'This is the real login screen. The demo skips it — press the button to go straight in.</div>' +
        '<form data-demo-login>' +
          field('Email Address', '<input type="email" value="alex.rivera@demo.example" readonly>') +
          field('Password', '<input type="password" value="demopassword" readonly>') +
          '<button type="submit" class="btn btn-gold btn-block">Enter the demo panel</button>' +
        '</form>' +
        '<p style="margin-top:18px;text-align:center;font-size:13px;">' +
          '<a href="../index.html">&larr; Back to the website</a></p>' +
      '</div>';
  }

  function notFound(message, href, label) {
    return shell(null,
      '<div class="admin-content-header"><h2>Not found</h2>' +
        '<a href="' + href + '" class="btn btn-outline">&larr; ' + label + '</a></div>' +
      '<div class="empty-state">' + esc(message) + '</div>');
  }

  function noAccess() {
    return shell(null,
      '<div class="admin-content-header"><h2>No access</h2></div>' +
      '<div class="empty-state">Your role (' + esc(roleLabel(currentUser().role)) +
      ') doesn\'t have permission to open that section. Switch roles with the ' +
      '<strong>View as</strong> control in the header to see it.</div>');
  }

  /* ============================================================
     RENDER
     ============================================================ */
  var AREA_OF_ROUTE = {
    fleet: 'fleet', media: 'media', reservations: 'reservations',
    availability: 'availability', messages: 'messages',
    agreements: 'agreements', users: 'users', diagnostics: 'diagnostics'
  };

  function render() {
    var r = route();
    var page = r.segs[0] || '';
    document.body.className = '';

    if (page === 'login') {
      document.body.className = 'auth-page';
      root.innerHTML = viewLogin();
      return;
    }

    if (!page) {
      var first = firstAccessibleArea();
      page = first ? AREA_ROUTE[first] : 'fleet';
      /* Update the address bar without a second render pass. */
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#/' + page);
      } else {
        go('/' + page);
        return;
      }
    }

    var area = AREA_OF_ROUTE[page];
    if (area && !canAccess(area)) {
      root.innerHTML = noAccess();
      wireCommon();
      return;
    }

    var html, after = null;

    switch (page) {
      case 'fleet':
        if (r.segs[1] === 'new') { html = viewCartForm(null); after = afterCartForm; }
        else if (r.segs[1] === 'edit') { html = viewCartForm(r.segs[2]); after = afterCartForm; }
        else html = viewFleet(r.params);
        break;
      case 'media':
        html = r.segs[1] === 'edit' ? viewMediaEdit(r.segs[2]) : viewMedia();
        break;
      case 'reservations': html = viewReservations(r.params); break;
      case 'messages': html = viewMessages(r.params); break;
      case 'agreements': html = viewAgreements(r.params); break;
      case 'availability': html = viewAvailability(r.params); after = afterAvailability; break;
      case 'users':
        if (r.segs[1] === 'edit') html = viewUserEdit(r.segs[2]);
        else { html = viewUsers(); after = afterUsers; }
        break;
      case 'diagnostics': html = viewDiagnostics(); break;
      case 'change-password': html = viewChangePassword(); break;
      default: html = notFound('That screen doesn\'t exist in this demo.', '#/fleet', 'Back to Fleet');
    }

    root.innerHTML = html;
    if (after) after();
    wireCommon();
    if (window.scrollTo) { try { window.scrollTo(0, 0); } catch (e) { /* noop */ } }
  }

  /* ---------------------------------------------------------- wiring */
  function wireCommon() {
    var switcher = document.getElementById('roleSwitcher');
    if (switcher) {
      switcher.addEventListener('change', function () {
        var match = DB.users.filter(function (u) { return u.role === switcher.value; })[0];
        session.userId = match ? match.id : session.userId;
        C.toast('Now viewing as ' + roleLabel(switcher.value) +
          ' — the tabs above reflect that role.', 'info');
        render();
      });
    }

    /* Bulk-select toolbar — same behaviour as admin/admin-bulk.js. */
    var boxes = Array.prototype.slice.call(root.querySelectorAll('.item-checkbox'));
    var selectAll = document.getElementById('selectAllCheckbox');
    var count = document.getElementById('bulkCount');
    var wrap = document.getElementById('bulkButtonsWrap');
    if (!boxes.length || !count) return;

    function sync() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      count.textContent = n + ' selected';
      if (wrap) wrap.hidden = n === 0;
      if (selectAll) selectAll.checked = n === boxes.length && n > 0;
    }
    boxes.forEach(function (b) { b.addEventListener('change', sync); });
    if (selectAll) {
      selectAll.addEventListener('change', function () {
        boxes.forEach(function (b) { b.checked = selectAll.checked; });
        sync();
      });
    }
    sync();
  }

  /* ------------------------------------------------------ write guard */
  document.addEventListener('submit', function (event) {
    var form = event.target;
    event.preventDefault();

    if (form.hasAttribute && form.hasAttribute('data-demo-login')) {
      go('/fleet');
      return;
    }
    if (form.checkValidity && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    block();
  }, true);

  document.addEventListener('click', function (event) {
    var target = event.target;
    var trigger = target.closest ? target.closest('[data-write]') : null;
    if (!trigger) return;
    event.preventDefault();
    block();
  }, true);

  window.addEventListener('hashchange', render);
  render();
})();
