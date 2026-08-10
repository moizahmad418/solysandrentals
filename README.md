# Sol Y Sand Rentals — live portfolio demo

A deployable, self-contained demo of a golf cart rental platform: a public
booking site **and** the custom admin panel behind it. Visitors switch
between the two from a bar at the bottom of every page — the back office
opens with no login, the way premium theme vendors demo their admin.

Everything is static. No PHP, no MySQL, no build step, no server.

---

## Deploy it

### GitHub Pages

```bash
git init
git add .
git commit -m "Sol Y Sand Rentals — live demo"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch →
`main` / `/ (root)` → Save.**

Your links, a minute or two later:

| | |
|---|---|
| Website | `https://<you>.github.io/<repo>/` |
| Admin panel | `https://<you>.github.io/<repo>/admin/` |

Every path in the project is relative, so it works at a repo subpath, at a
domain root, or from a subfolder — no config to change.

### Netlify / Vercel / Cloudflare Pages

Drag the folder onto Netlify Drop, or connect the repo. There's no build
command and the publish directory is the project root. On Vercel, pick
"Other" as the framework preset.

### Anywhere else

Upload the folder to any web host, or open `index.html` from disk. The one
caveat when opening files directly: `file://` blocks `fetch`, so the
rental-agreement modal won't load. Everything else, admin panel included,
works offline. To preview locally with that fully working:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## What's inside

```
index.html  about.html  our-fleet.html
pricing.html  reservations.html  contact.html   the public site
rental-agreement-modal.html                     agreement + signature pad
404.html

admin/
  index.html          admin shell (hash-routed: #/fleet, #/reservations …)
  demo-admin.js       every admin screen, plus the read-only guard
  demo-admin.css      the per-page styles from the PHP views
  admin-style.css     the production stylesheet, unchanged

assets/
  css/  js/           the site's original stylesheets and scripts, unchanged
  data/demo-db.js     the demo dataset
  data/fleet-data.js  static stand-in for php/fleet-data.php
  demo/demo-core.js   date handling, formatting, toasts
  demo/demo-shim.js   answers the PHP endpoints from the dataset
  demo/demo-bar.js    the website ⇄ admin switcher + project panel

uploads/media/        site imagery
uploads/agreements/   placeholder document scans
```

---

## How the static version works

The production app is PHP + MySQL. Three pieces bridge the gap:

**1. The data layer is bundled.** `assets/data/demo-db.js` holds the same
tables the app queries — fleet, reservations, messages, agreements, media,
users, availability blocks — as JSON.

Dates are stored as *day offsets from today* and resolved at page load, so
the demo never goes stale. Bookings stay in the future, the calendar always
opens on the current month, and the inbox always shows recent messages —
whether someone opens it tomorrow or a year from now.

**2. The PHP endpoints are intercepted.** `demo-shim.js` patches `fetch`
and answers the five endpoints the public site calls, reproducing the logic
from `php/availability-helpers.php`. Availability checks, greyed-out booked
dates in the date pickers, and the maintenance banner all behave exactly as
they do live.

**3. Writes are caught, not performed.** Every form and action button in the
admin panel is live and interactive — open them, type in them, submit them.
The guard intercepts the submit, runs the browser's own validation, then
shows a note explaining the demo is read-only. The dataset never changes, so
the demo can't be broken by a visitor.

The admin panel reuses the production `admin-style.css` and the original
markup and class names, so what visitors see is the real interface, not a
mockup of it.

---

## Two things worth knowing

**The admin panel has a role switcher.** The *View as* dropdown in the admin
header swaps between Super Admin, Administrator, Fleet Manager and
Reservations Manager. The tabs and permissions change to match, which is a
neat way to show the RBAC layer without handing out four sets of logins.

**None of the data is real.** Every reservation, message, signed agreement
and user account here was written for the demo. The customer records,
driving licence photos and signature images from the production database are
not in this build, and the licence/signature thumbnails are generated
placeholders. Only the client's own published business details (address,
phone, public email) remain, since they're already public on the live site —
swap them in the HTML if you'd rather they weren't.

---

## Customising

| Change | Where |
|---|---|
| Demo records (bookings, messages, users) | `assets/data/demo-db.js` |
| Project blurb in the ⓘ panel | `assets/demo/demo-bar.js` |
| Switcher styling | `assets/demo/demo-bar.css` |
| Read-only wording | `DEMO_MESSAGE` in `admin/demo-admin.js` |
| Fleet shown on the public site | `assets/data/fleet-data.js` |

When editing `demo-db.js`, keep the `*_offset` fields as numbers: negative is
in the past, positive is in the future, `0` is today.
