# Busy Times (PWA) – Dunn Brothers Coffee, New Richmond WI · v1.2

A static port of the Android app: plain HTML, CSS and JS, with no build step and no CDNs. It works offline through a service worker.

- `model.js` is an exact port of `BusyData.kt` (same data, Fritsch–Carlson 10-minute interpolation, school bumps, monthly/holiday factors, delivery estimate, confidence). It has been verified identical to the Kotlin output for 12 dates.
- "Right now" always uses America/Chicago time, whatever the device timezone.
- Install on iPhone: open the hosted URL in Safari → Share → Add to Home Screen. Android/Chrome: use the menu → Install app.
- A service worker requires HTTPS (or localhost). To test locally: `python3 -m http.server 8080` in this folder.
- Hosting: any static host, e.g. GitHub Pages, Netlify or Cloudflare Pages. Bump `CACHE` in `sw.js` when you change files.
- Data was researched on 2026-10-14. See the in-app "Data sources & how this is estimated" page.
