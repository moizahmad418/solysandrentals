/* ============================================================
   DEMO BAR
   ------------------------------------------------------------
   Renders the persistent switcher shown on every page. Set
   window.DEMO_CONTEXT = 'admin' before loading to flip which side
   is highlighted and to fix the relative link depth.
   ============================================================ */
(function () {
  'use strict';

  var isAdmin = window.DEMO_CONTEXT === 'admin';
  var root = isAdmin ? '../' : '';

  var bar = document.createElement('div');
  bar.className = 'demo-bar';
  bar.setAttribute('role', 'navigation');
  bar.setAttribute('aria-label', 'Demo navigation');
  bar.innerHTML =
    '<span class="demo-bar__label"><span class="demo-bar__dot"></span>Live demo</span>' +
    '<div class="demo-bar__switch">' +
      '<a class="demo-bar__link' + (isAdmin ? '' : ' is-active') + '" href="' + root + 'index.html">Website</a>' +
      '<a class="demo-bar__link' + (isAdmin ? ' is-active' : '') + '" href="' + root + 'admin/index.html">Admin panel</a>' +
    '</div>' +
    '<button class="demo-bar__info" type="button" aria-label="About this project">i</button>';
  document.body.appendChild(bar);

  var sheet = document.createElement('div');
  sheet.className = 'demo-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'About this project');
  sheet.innerHTML =
    '<div class="demo-sheet__box">' +
      '<button class="demo-sheet__close" type="button" aria-label="Close">&times;</button>' +
      '<h2>Golf cart rental platform</h2>' +
      '<p class="demo-sheet__sub">Booking website + custom admin panel &middot; portfolio demo</p>' +

      '<p>A rental business runs on two things: a site that turns visitors into ' +
      'booking requests, and a back office the owner can actually operate without a ' +
      'developer. This build is both. Use the switcher to move between them.</p>' +

      '<h3>What the site does</h3>' +
      '<ul>' +
        '<li>Season-aware pricing calculator with live totals and 13% IVA</li>' +
        '<li>Real-time availability &mdash; booked and maintenance dates are greyed out in the date pickers</li>' +
        '<li>Multi-step reservation flow with a rental agreement and a signature pad</li>' +
        '<li>Fleet, page copy and imagery all driven from the database, not hardcoded</li>' +
      '</ul>' +

      '<h3>What the admin panel does</h3>' +
      '<ul>' +
        '<li>Fleet inventory, media library with an image picker, and inline page editing</li>' +
        '<li>Reservation pipeline with statuses, bulk actions and a trash/restore layer</li>' +
        '<li>Per-vehicle availability calendar with week, month and quarter views</li>' +
        '<li>Signed agreements archive, contact inbox, and role-based user accounts</li>' +
      '</ul>' +

      '<h3>Built with</h3>' +
      '<div class="demo-sheet__tags">' +
        '<span>PHP</span><span>MySQL</span><span>PDO</span><span>JavaScript</span>' +
        '<span>HTML5</span><span>CSS3</span><span>SMTP</span><span>Apache</span>' +
      '</div>' +

      '<h3>About this demo</h3>' +
      '<p>The production stack is PHP and MySQL. This public demo is a static build of ' +
      'the same interface, so it runs anywhere: the data layer is bundled as JSON and ' +
      'every write is intercepted. Nothing here is stored or sent.</p>' +
      '<p>All records are invented for the demo &mdash; no real customer, booking or ' +
      'document data is included.</p>' +
    '</div>';
  document.body.appendChild(sheet);

  function toggle(open) {
    sheet.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  bar.querySelector('.demo-bar__info').addEventListener('click', function () { toggle(true); });
  sheet.querySelector('.demo-sheet__close').addEventListener('click', function () { toggle(false); });
  sheet.addEventListener('click', function (event) {
    if (event.target === sheet) toggle(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && sheet.classList.contains('is-open')) toggle(false);
  });

  /* First visit: point out that the back office is one click away. */
  try {
    if (!isAdmin && !sessionStorage.getItem('demoHintSeen')) {
      sessionStorage.setItem('demoHintSeen', '1');
      setTimeout(function () {
        window.DemoCore.toast('This is a live demo — the admin panel is open too, no login needed.', 'info');
      }, 1600);
    }
  } catch (err) { /* private mode — the hint is optional */ }
})();
