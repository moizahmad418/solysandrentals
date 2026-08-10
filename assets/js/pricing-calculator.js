// ============================================================
// PRICING CALCULATOR — Reservations page only
// ------------------------------------------------------------
// Recalculates the live price estimate whenever pick-up/drop-off
// dates change, enforces the seasonal minimum-stay rules with the
// exact messages from the client's guidelines, and blocks form
// submission until the selected dates are valid.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const pickupInput = document.getElementById('res-pickup-date');
  const dropoffInput = document.getElementById('res-dropoff-date');
  const cartsInput = document.getElementById('res-carts');
  const refuelInput = document.getElementById('res-refuel');
  const insuranceInput = document.getElementById('res-insurance');
  const form = document.getElementById('reservationForm');
  if (!pickupInput || !dropoffInput || !form || typeof calculateQuote === 'undefined') return;

  // Prefill from the homepage quick booking bar, if the person arrived
  // here via its "Check Availability" button (see script.js).
  const urlParams = new URLSearchParams(window.location.search);
  const qPickup = urlParams.get('pickup_date');
  const qDropoff = urlParams.get('dropoff_date');
  const qCartType = urlParams.get('cart_type');
  const qLocation = urlParams.get('pickup_location');

  // Setting .value directly doesn't update flatpickr's own display (the
  // altInput text box), so go through its API when the calendar picker
  // (see initAvailabilityCalendar in script.js) has already wrapped the
  // field; fall back to a plain value set if flatpickr didn't load.
  function setDateValue(input, value) {
    if (!input || !value) return;
    if (input._flatpickr) {
      input._flatpickr.setDate(value, true);
    } else {
      input.value = value;
    }
  }

  setDateValue(pickupInput, qPickup);
  setDateValue(dropoffInput, qDropoff);
  if (qCartType) {
    const cartTypeSelect = document.getElementById('res-cart-type');
    if (cartTypeSelect) {
      cartTypeSelect.value = qCartType;
      cartTypeSelect.dispatchEvent(new Event('change'));
    }
  }
  if (qLocation) {
    const locationSelect = document.getElementById('res-location');
    if (locationSelect) locationSelect.value = qLocation;
  }

  const estimateBox = document.getElementById('priceEstimate');
  const errorBox = document.getElementById('priceError');
  let currentQuote = null;

  function formatMoney(n) {
    return '$' + n.toFixed(2);
  }

  function getNumCarts() {
    if (!cartsInput) return 1;
    const raw = cartsInput.value;
    return raw === '4+' ? 4 : (parseInt(raw, 10) || 1);
  }

  function getAddFuelFee() {
    if (!refuelInput) return false;
    return refuelInput.value.indexOf('Yes') === 0;
  }

  function getAddInsurance() {
    if (!insuranceInput) return false;
    return insuranceInput.value === 'standard';
  }

  function recalculate() {
    const pickup = pickupInput.value;
    const dropoff = dropoffInput.value;

    if (!pickup || !dropoff) {
      estimateBox.style.display = 'none';
      errorBox.style.display = 'none';
      currentQuote = null;
      return;
    }

    const quote = calculateQuote(pickup, dropoff, undefined, {
      numCarts: getNumCarts(),
      addFuelFee: getAddFuelFee(),
      addInsurance: getAddInsurance(),
    });
    currentQuote = quote;

    if (quote.error) {
      estimateBox.style.display = 'none';
      errorBox.textContent = quote.error;
      errorBox.style.display = 'block';
      return;
    }

    errorBox.style.display = 'none';
    estimateBox.style.display = 'block';
    document.getElementById('peSeasonValue').textContent = quote.seasonLabel;
    document.getElementById('peDays').textContent = quote.days;
    const cartsLabel = document.getElementById('peCarts');
    if (cartsLabel) cartsLabel.textContent = quote.numCarts;
    document.getElementById('peSubtotal').textContent = formatMoney(quote.cartsSubtotal) + ' (' + formatMoney(quote.dailyRate) + '/day)';

    const fuelRow = document.getElementById('peFuelRow');
    if (fuelRow) {
      if (quote.fuelFee > 0) {
        fuelRow.style.display = 'flex';
        document.getElementById('peFuelFee').textContent = formatMoney(quote.fuelFee);
      } else {
        fuelRow.style.display = 'none';
      }
    }

    const insuranceRow = document.getElementById('peInsuranceRow');
    if (insuranceRow) {
      if (quote.insuranceFee > 0) {
        insuranceRow.style.display = 'flex';
        document.getElementById('peInsuranceFee').textContent = formatMoney(quote.insuranceFee);
      } else {
        insuranceRow.style.display = 'none';
      }
    }

    document.getElementById('peTax').textContent = formatMoney(quote.tax);
    document.getElementById('peTotal').textContent = formatMoney(quote.total);

    document.getElementById('hiddenSeason').value = quote.seasonLabel;
    document.getElementById('hiddenDays').value = quote.days;
    document.getElementById('hiddenDailyRate').value = quote.dailyRate;
    document.getElementById('hiddenSubtotal').value = quote.subtotal;
    document.getElementById('hiddenTax').value = quote.tax;
    document.getElementById('hiddenTotal').value = quote.total;
  }

  pickupInput.addEventListener('change', recalculate);
  dropoffInput.addEventListener('change', recalculate);
  if (cartsInput) cartsInput.addEventListener('change', recalculate);
  if (refuelInput) refuelInput.addEventListener('change', recalculate);
  if (insuranceInput) insuranceInput.addEventListener('change', recalculate);

  if (qPickup && qDropoff) recalculate();

  // ---- Availability calendar check ----
  // Whenever a specific vehicle + both dates are selected, ask the backend
  // whether that vehicle is free for the whole stay. Blocks are created
  // when an admin approves a reservation, or manually for maintenance —
  // see php/availability-data.php.
  const cartTypeSelect = document.getElementById('res-cart-type');
  const cartIdInput = document.getElementById('res-cart-id');
  const availabilityError = document.getElementById('availabilityError');
  let isAvailable = true;
  let availabilityCheckToken = 0;

  function checkAvailability() {
    if (!availabilityError) return;
    const cartId = cartIdInput ? cartIdInput.value : '';
    const pickup = pickupInput.value;
    const dropoff = dropoffInput.value;

    if (!cartId || !pickup || !dropoff) {
      isAvailable = true;
      availabilityError.style.display = 'none';
      return;
    }

    const thisCheck = ++availabilityCheckToken;
    fetch(`/php/availability-data.php?action=check&cart_id=${encodeURIComponent(cartId)}&start=${encodeURIComponent(pickup)}&end=${encodeURIComponent(dropoff)}`)
      .then(res => res.json())
      .then(data => {
        if (thisCheck !== availabilityCheckToken) return; // a newer check has since started
        isAvailable = !!data.available;
        if (!isAvailable) {
          const cartName = cartTypeSelect && cartTypeSelect.selectedOptions[0] ? cartTypeSelect.selectedOptions[0].textContent.split(' - $')[0] : 'That cart';
          availabilityError.textContent = `${cartName} is already booked or unavailable on some of those dates (${(data.blocked_dates || []).join(', ')}). Please choose different dates or another cart.`;
          availabilityError.style.display = 'block';
        } else {
          availabilityError.style.display = 'none';
        }
      })
      .catch((err) => {
        // Fail open — if the check itself errors out, don't block a
        // legitimate customer; the server re-validates on submit anyway.
        console.warn('Availability check failed:', err);
        isAvailable = true;
        availabilityError.style.display = 'none';
      });
  }

  pickupInput.addEventListener('change', checkAvailability);
  dropoffInput.addEventListener('change', checkAvailability);
  if (cartTypeSelect) cartTypeSelect.addEventListener('change', checkAvailability);
  checkAvailability();

  // Block submission if dates are set but invalid/below minimum.
  form.addEventListener('submit', (e) => {
    if (pickupInput.value && dropoffInput.value && currentQuote && currentQuote.error) {
      e.preventDefault();
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!isAvailable) {
      e.preventDefault();
      if (availabilityError) availabilityError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // Payment method toggle
  const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
  const bankInfo = document.getElementById('bankTransferInfo');
  const cardInfo = document.getElementById('cardPaymentInfo');
  const cashInfo = document.getElementById('cashPaymentInfo');

  function togglePaymentInfo() {
    const selected = document.querySelector('input[name="payment_method"]:checked');
    const value = selected ? selected.value : 'Credit Card';
    bankInfo.style.display = value === 'Bank Transfer' ? 'block' : 'none';
    cashInfo.style.display = value === 'Cash' ? 'block' : 'none';
    cardInfo.style.display = (value === 'Credit Card') ? 'block' : 'none';
  }
  paymentRadios.forEach(r => r.addEventListener('change', togglePaymentInfo));
  togglePaymentInfo();
});

// ============================================================
// FLEET MAINTENANCE NOTICE BANNER
// ------------------------------------------------------------
// Shows an active-maintenance banner (set by an admin in the
// Availability calendar) at the top of the Check Availability
// form. Refreshes on an interval so the notice disappears on its
// own once the vehicle becomes available again, without the
// visitor needing to reload the page.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('maintenanceNotice');
  if (!banner) return;

  function formatUntil(dateTimeStr) {
    if (!dateTimeStr) return null;
    const d = new Date(dateTimeStr.replace(' ', 'T'));
    if (isNaN(d)) return null;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function refreshNotices() {
    fetch('/php/availability-data.php?action=notices')
      .then(res => res.json())
      .then(data => {
        const notices = data.notices || [];
        if (!notices.length) {
          banner.style.display = 'none';
          banner.innerHTML = '';
          return;
        }
        banner.innerHTML = notices.map(n => {
          const who = n.vehicle ? `<strong>${n.vehicle}</strong>` : '<strong>All vehicles</strong>';
          const until = formatUntil(n.available_at);
          const untilText = until ? ` Expected back in service by <strong>${until}</strong>.` : '';
          const noteText = n.note ? ` — ${n.note}` : '';
          return `<div>${who} unavailable for maintenance${noteText}.${untilText}</div>`;
        }).join('');
        banner.style.display = 'block';
      })
      .catch((err) => { console.warn('Maintenance notice fetch failed:', err); /* leave whatever was last shown */ });
  }

  refreshNotices();
  setInterval(refreshNotices, 60000);
});
