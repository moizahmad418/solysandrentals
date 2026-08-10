// ============================================================
// SITE URL CONSTANTS (must match build_pages_v3.py)
// ============================================================
const FLEET_PAGE_URL = "https://solysandrentals.com/our-fleet";
const RESERVATION_URL = "https://solysandrentals.com/reservations#check-availability";

// ============================================================
// HEADER SCROLL STATE
// ============================================================
const header = document.getElementById('siteHeader');
if (header) {
  const onScroll = () => {
    if (window.scrollY > 60) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll);
  onScroll();
}

// ============================================================
// MOBILE MENU TOGGLE
// ============================================================
const burger = document.getElementById('burgerBtn');
const nav = document.getElementById('mainNav');
if (burger && nav) {
  burger.addEventListener('click', () => {
    nav.classList.toggle('open');
    burger.innerHTML = nav.classList.contains('open')
      ? '<i class="fas fa-times"></i>'
      : '<i class="fas fa-bars"></i>';
  });
}

// ============================================================
// FLEET CARD RENDERING (reads from FLEET_CARTS in fleet-data.js)
// Usage: <div class="fleet-grid" data-fleet="teaser"></div>  (first 3 carts, no badges/desc)
//        <div class="fleet-grid" data-fleet="full"></div>    (all carts, with badges + description)
// ============================================================
function renderFleetCards() {
  if (typeof FLEET_CARTS === 'undefined') return;

  document.querySelectorAll('[data-fleet]').forEach(container => {
    const mode = container.getAttribute('data-fleet'); // "teaser" or "full"
    let carts;
    if (mode === 'teaser') {
      // One representative of each category, so Home shows 1 golf cart + 1 motorcycle
      // rather than just the first 3 items regardless of type.
      const firstGolfCart = FLEET_CARTS.find(c => (c.category || 'golf_cart') === 'golf_cart');
      const firstMoto = FLEET_CARTS.find(c => c.category === 'motorcycle');
      carts = [firstGolfCart, firstMoto].filter(Boolean);
    } else {
      carts = FLEET_CARTS;
    }

    container.innerHTML = carts.map(cart => {
      const highlightClass = (mode === 'full' && cart.badge === 'Most Popular') ? ' highlight' : '';
      const badgeClass = (mode === 'full' && cart.badge === 'Most Popular') ? ' gold' : '';
      const badgeHtml = (mode === 'full' && cart.badge)
        ? `<span class="fleet-badge${badgeClass}">${cart.badge}</span>`
        : '';
      const descHtml = mode === 'full'
        ? `<p class="fleet-desc">${cart.description}</p>`
        : '';
      const btnClass = (mode === 'full' && cart.badge === 'Most Popular') ? 'btn-gold' : 'btn-outline-navy';

      return `
        <div class="fleet-card${highlightClass}">
          ${badgeHtml}
          <img src="${cart.image}" alt="${cart.name}">
          <div class="fleet-card-body">
            <h3>${cart.name}</h3>
            <div class="fleet-specs">
              <span><i class="fas fa-user"></i>${cart.seats} Seats</span>
              <span><i class="fas fa-briefcase"></i>${cart.cargo}</span>
              <span><i class="fas fa-bolt"></i>${cart.power}</span>
            </div>
            ${descHtml}
            <div class="fleet-price">From $${cart.price} <span>/ day + tax</span></div>
            <a href="${RESERVATION_URL}" class="btn ${btnClass}">Reserve This Cart</a>
          </div>
        </div>
      `;
    }).join('');
  });

  // Populate any "Golf Cart Type" select dropdowns from the same data
  document.querySelectorAll('[data-fleet-select]').forEach(select => {
    const options = FLEET_CARTS.map(cart =>
      `<option value="${cart.name}" data-cart-id="${cart.id}">${cart.name} - $${cart.price}/day</option>`
    ).join('');
    // On a required select (the Reservations form), use a disabled
    // placeholder so the browser's own "please select an item" validation
    // fires instead of silently submitting an empty cart_type. The
    // homepage quick-booking bar isn't required, so it keeps "Any Type".
    const placeholder = select.hasAttribute('required')
      ? `<option value="" disabled selected>— Select a Golf Cart Type —</option>`
      : `<option value="">Any Type</option>`;
    select.innerHTML = placeholder + options;

    // Keep a paired hidden "cart_id" field (if this select has one, via
    // data-cart-id-input="theHiddenFieldId") in sync with whichever
    // specific vehicle is selected. The booking calendar / availability
    // check needs the exact vehicle id, not just its display name.
    const hiddenId = select.getAttribute('data-cart-id-input');
    const hidden = hiddenId ? document.getElementById(hiddenId) : null;
    function syncCartId() {
      if (!hidden) return;
      const opt = select.selectedOptions[0];
      hidden.value = opt ? (opt.getAttribute('data-cart-id') || '') : '';
    }
    select.addEventListener('change', syncCartId);
    syncCartId();
  });
}
document.addEventListener('DOMContentLoaded', renderFleetCards);

// ============================================================
// CONTACT FORM — conditional Rental Location field
// Shows a required "Where Are You Staying?" field only when
// "Reservation Question" is selected as the Subject.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const subjectSelect = document.getElementById('c-subject');
  const locationWrap = document.getElementById('cRentalLocationWrap');
  const locationInput = document.getElementById('c-rental-location');
  if (!subjectSelect || !locationWrap) return;

  function toggleLocationField() {
    const show = subjectSelect.value === 'Reservation Question';
    locationWrap.style.display = show ? 'block' : 'none';
    if (locationInput) {
      if (show) locationInput.setAttribute('required', 'required');
      else locationInput.removeAttribute('required');
    }
  }
  subjectSelect.addEventListener('change', toggleLocationField);
  toggleLocationField();
});

// ============================================================
// CONTACT FORM FEEDBACK BANNER
// Same pattern as the reservation banner — reads ?submitted=1/0
// after contact-submit.php redirects back.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('contactBanner');
  if (!banner) return;

  const params = new URLSearchParams(window.location.search);
  if (!params.has('submitted')) return;

  const success = params.get('submitted') === '1';
  banner.style.display = 'block';
  banner.className = 'alert ' + (success ? 'alert-success' : 'alert-error');
  banner.textContent = success
    ? "Thanks! Your message has been sent — we'll be in touch shortly."
    : "Something went wrong sending your message. Please try again or contact us directly.";

  const url = new URL(window.location.href);
  url.searchParams.delete('submitted');
  window.history.replaceState({}, '', url.toString());
});

// ============================================================
// RESERVATION FORM FEEDBACK BANNER
// Reads ?submitted=1/0 from the URL after reservation-submit.php
// redirects back, shows a success/error message, then cleans the
// URL so refreshing the page doesn't re-show it.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('reservationBanner');
  if (!banner) return;

  const params = new URLSearchParams(window.location.search);
  if (!params.has('submitted')) return;

  const outcome = params.get('submitted');
  banner.style.display = 'block';
  banner.className = 'alert ' + (outcome === '1' ? 'alert-success' : 'alert-error');
  if (outcome === '1') {
    banner.textContent = "Thanks! Your inquiry has been sent — we'll be in touch shortly.";
  } else if (outcome === 'blocked') {
    banner.textContent = "Sorry, the selected cart is already booked or unavailable for some of those dates. Please choose different dates or another cart.";
  } else {
    banner.textContent = "Something went wrong sending your inquiry. Please try again or contact us directly.";
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('submitted');
  window.history.replaceState({}, '', url.toString());
});

// ============================================================
// HOMEPAGE QUICK BOOKING BAR
// ------------------------------------------------------------
// Lets people pick a pick-up location, pick-up date, drop-off date,
// and cart type
// right on the homepage hero, then carries that selection over
// to the Reservations page's Check Availability form (which
// prefills itself from these same URL params — see
// pricing-calculator.js).
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('homeCheckAvailabilityBtn');
  if (!btn) return;

  const pickupInput = document.getElementById('homePickupDate');
  const dropoffInput = document.getElementById('homeDropoffDate');
  const cartTypeSelect = document.getElementById('homeCartType');
  const locationSelect = document.getElementById('homePickupLocation');

  btn.addEventListener('click', (e) => {
    const params = new URLSearchParams();
    if (pickupInput && pickupInput.value) params.set('pickup_date', pickupInput.value);
    if (dropoffInput && dropoffInput.value) params.set('dropoff_date', dropoffInput.value);
    if (cartTypeSelect && cartTypeSelect.value) params.set('cart_type', cartTypeSelect.value);
    if (locationSelect && locationSelect.value) params.set('pickup_location', locationSelect.value);

    const query = params.toString();
    if (query) {
      e.preventDefault();
      window.location.href = 'https://solysandrentals.com/reservations?' + query + '#check-availability';
    }
    // If nothing was selected, let the plain href (already pointing at
    // /reservations#check-availability) work exactly as it did before.
  });
});

// ============================================================
// CALENDAR DATE PICKERS WITH LIVE AVAILABILITY
// ------------------------------------------------------------
// Upgrades the plain pick-up/return date inputs into a proper
// month-view calendar dropdown (via flatpickr) that grays out days
// already blocked for the selected vehicle — approved bookings and
// active maintenance — using the same booking calendar shown in
// Admin > Availability. Shared between the homepage quick-booking
// bar and the Reservations page's Check Availability form so both
// look and behave the same way.
// ============================================================
function initAvailabilityCalendar(cartSelectId, cartIdInputId, pickupId, dropoffId) {
  const cartSelect = document.getElementById(cartSelectId);
  const cartIdInput = document.getElementById(cartIdInputId);
  const pickupEl = document.getElementById(pickupId);
  const dropoffEl = document.getElementById(dropoffId);
  if (!pickupEl || !dropoffEl) return;

  if (typeof flatpickr === 'undefined') {
    // The CDN script didn't load (offline, blocked, etc). These inputs are
    // plain text fields in the HTML so flatpickr can fully own them when
    // it *does* load; without it, fall back to the native browser date
    // picker rather than leaving a plain text field with no picker at all.
    pickupEl.type = 'date';
    dropoffEl.type = 'date';
    return;
  }

  const fpPickup = flatpickr(pickupEl, {
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'M j, Y',
    minDate: 'today',
  });
  const fpDropoff = flatpickr(dropoffEl, {
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'M j, Y',
    minDate: 'today',
  });

  // Return date can't be before the pick-up date.
  fpPickup.config.onChange.push((selectedDates) => {
    if (!selectedDates[0]) return;
    const minReturn = new Date(selectedDates[0]);
    minReturn.setDate(minReturn.getDate() + 1);
    fpDropoff.set('minDate', minReturn);
  });

  function refreshBlockedDates() {
    const cartId = cartIdInput ? cartIdInput.value : '';
    if (!cartId) {
      fpPickup.set('disable', []);
      fpDropoff.set('disable', []);
      return;
    }
    fetch(`/php/availability-data.php?action=range&cart_id=${encodeURIComponent(cartId)}&months=9`)
      .then(res => res.json())
      .then(data => {
        const blocked = data.blocked_dates || [];
        fpPickup.set('disable', blocked);
        fpDropoff.set('disable', blocked);
      })
      .catch((err) => { console.warn('Blocked-dates fetch failed:', err); /* leave dates selectable — the server re-checks on submit anyway */ });
  }

  if (cartSelect) cartSelect.addEventListener('change', refreshBlockedDates);
  refreshBlockedDates(); // covers a cart already selected via URL prefill
}

document.addEventListener('DOMContentLoaded', () => {
  initAvailabilityCalendar('homeCartType', 'homeCartId', 'homePickupDate', 'homeDropoffDate');
  initAvailabilityCalendar('res-cart-type', 'res-cart-id', 'res-pickup-date', 'res-dropoff-date');
});

// ============================================================
// FAQ ACCORDION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');

      item.parentElement.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        const ans = i.querySelector('.faq-answer');
        if (ans) ans.style.maxHeight = '';
      });

      if (!wasOpen) {
        item.classList.add('open');
        const answer = item.querySelector('.faq-answer');
        if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // Items that start pre-opened (class="faq-item open" in the HTML)
  // need their height set on load too, not just on click.
  document.querySelectorAll('.faq-item.open .faq-answer').forEach(answer => {
    answer.style.maxHeight = answer.scrollHeight + 'px';
  });
});
