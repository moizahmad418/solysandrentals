// ============================================================
// PRICING DATA — Sol Y Sand Rentals
// ------------------------------------------------------------
// Single source of truth for seasonal/tiered pricing, used by
// the Reservations page's live estimate and by pricing.html's
// rate card display. Matches the client's pricing guidelines
// exactly. Applies to all current fleet carts (all 4 currently
// use the same "standard" table below).
//
// A second table ("navi") is included but NOT currently active —
// it's here ready to use if a "Navi"-type cart is added later.
// ============================================================

const IVA_RATE = 0.13;

// Season date ranges, as {month, day} (month is 1-12). Ranges
// that wrap across the new year (like High Season) are handled
// in getSeason() below.
const SEASONS = {
  high: { label: 'High Season', start: { month: 11, day: 15 }, end: { month: 4, day: 15 } },
  shoulder: { label: 'Shoulder Season', start: { month: 6, day: 1 }, end: { month: 8, day: 31 } },
  green: { label: 'Green Season', ranges: [
    { start: { month: 4, day: 16 }, end: { month: 5, day: 31 } },
    { start: { month: 9, day: 1 }, end: { month: 11, day: 14 } },
  ]},
};

// Standard rate table (all 4 current fleet carts use this).
const RATES_STANDARD = {
  high:     { tiers: [{ max: 2, rate: 55 }, { max: 6, rate: 46 }, { max: Infinity, rate: 43 }], minDays: 3 },
  shoulder: { tiers: [{ max: 2, rate: 48 }, { max: 6, rate: 42 }, { max: Infinity, rate: 40 }], minDays: 2 },
  green:    { tiers: [{ max: 2, rate: 42 }, { max: 6, rate: 36 }, { max: Infinity, rate: 34 }], minDays: 1 },
};

// Navi-type rate table — not currently assigned to any cart, kept
// ready for future use (year-round, no online minimum-stay rule).
const RATES_NAVI = {
  high:     { tiers: [{ max: 2, rate: 40 }, { max: 6, rate: 35 }, { max: Infinity, rate: 33 }], minDays: 1 },
  shoulder: { tiers: [{ max: 2, rate: 35 }, { max: 6, rate: 30 }, { max: Infinity, rate: 28 }], minDays: 1 },
  green:    { tiers: [{ max: 2, rate: 30 }, { max: 6, rate: 26 }, { max: Infinity, rate: 24 }], minDays: 1 },
};

const MIN_DURATION_MESSAGES = {
  high: "Online bookings during peak season require a 3-day minimum. For single-day availability, please email or call for walk-up options.",
  shoulder: "Online bookings during shoulder season require a 2-day minimum. For single-day availability, please email or call for walk-up options.",
  green: null, // no minimum-stay restriction in Green Season
};

function dateInRange(date, start, end) {
  // date, start, end are {month, day}. Compares month/day only (year-agnostic).
  const d = date.month * 100 + date.day;
  const s = start.month * 100 + start.day;
  const e = end.month * 100 + end.day;
  if (s <= e) return d >= s && d <= e;
  return d >= s || d <= e; // wraps across year boundary (e.g. Nov 15 - Apr 15)
}

function getSeason(jsDate) {
  const md = { month: jsDate.getMonth() + 1, day: jsDate.getDate() };

  if (dateInRange(md, SEASONS.high.start, SEASONS.high.end)) return 'high';
  if (dateInRange(md, SEASONS.shoulder.start, SEASONS.shoulder.end)) return 'shoulder';
  for (const range of SEASONS.green.ranges) {
    if (dateInRange(md, range.start, range.end)) return 'green';
  }
  return 'green'; // fallback, shouldn't normally be reached given full year coverage
}

function getTierRate(season, days, table) {
  const tiers = table[season].tiers;
  for (const tier of tiers) {
    if (days <= tier.max) return tier.rate;
  }
  return tiers[tiers.length - 1].rate;
}

/**
 * Calculates a full price quote for a date range.
 * @param {string} pickupDateStr - YYYY-MM-DD
 * @param {string} dropoffDateStr - YYYY-MM-DD
 * @param {object} table - RATES_STANDARD or RATES_NAVI (defaults to standard)
 * @param {object} options - { numCarts: number, addFuelFee: boolean, addInsurance: boolean }
 * @returns {object} quote details, or { error: string } if invalid/below minimum
 */
function calculateQuote(pickupDateStr, dropoffDateStr, table, options) {
  table = table || RATES_STANDARD;
  options = options || {};
  const numCarts = Math.max(1, parseInt(options.numCarts, 10) || 1);
  const fuelFee = options.addFuelFee ? 30 : 0;
  const INSURANCE_RATE_PER_NIGHT = 10; // Deductible Limitation Package — $10/night per cart

  if (!pickupDateStr || !dropoffDateStr) {
    return { error: null }; // not enough info yet, not a hard error
  }

  const pickup = new Date(pickupDateStr + 'T00:00:00');
  const dropoff = new Date(dropoffDateStr + 'T00:00:00');
  const days = Math.round((dropoff - pickup) / (1000 * 60 * 60 * 24));

  if (isNaN(days) || days < 1) {
    return { error: 'Please select a valid date range (drop-off must be after pick-up).' };
  }

  const season = getSeason(pickup);
  const minDays = table[season].minDays;

  if (days < minDays) {
    return { error: MIN_DURATION_MESSAGES[season], season, days };
  }

  const dailyRate = getTierRate(season, days, table);
  const cartsSubtotal = dailyRate * days * numCarts;
  const insuranceFee = options.addInsurance ? INSURANCE_RATE_PER_NIGHT * days * numCarts : 0;
  const subtotal = cartsSubtotal + fuelFee + insuranceFee;
  const tax = Math.round(subtotal * IVA_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return {
    error: null,
    season,
    seasonLabel: SEASONS[season].label,
    days,
    dailyRate,
    numCarts,
    cartsSubtotal,
    fuelFee,
    insuranceFee,
    subtotal,
    tax,
    total,
  };
}
