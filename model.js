/* Busy Times model – exact port of BusyData.kt (v1.2). Researched 2026-10-14.
   SOURCED: identity, hours, hourly popular times. ESTIMATE: monthly/holiday/event factors, bumps, delivery numbers. */
(function (root) {
  const NAME = "Dunn Brothers Coffee (#237)";
  const TYPE = "Coffee shop / café · drive-thru, breakfast, lunch, bakery";
  const ADDRESS = "1716 Dorset Ln Ste 100, New Richmond, WI 54017";
  const PHONE = "(715) 246-3175";
  // ISO weekday 1=Mon..7=Sun
  const HOURS = {1:[5.5,17],2:[5.5,17],3:[5.5,17],4:[5.5,17],5:[5.5,17],6:[6.5,17],7:[6.5,17]};
  const row = (s, ...v) => { const a = new Array(24).fill(0); v.forEach((x, i) => a[s + i] = x); return a; };
  const BASELINE = {
    1: row(5, 25,30,37,48,69,97,100,100,93,93,76,55),
    2: row(5, 25,37,55,58,60,81,88,97,72,53,39,41),
    3: row(5, 16,27,41,51,65,76,86,79,46,34,34,34),
    4: row(5, 37,37,55,65,72,72,72,62,48,37,32,25),
    5: row(5, 46,65,81,90,81,83,69,58,44,44,44,51),
    6: row(6, 25,37,60,72,81,79,81,74,72,62,46),
    7: row(6, 20,20,37,48,62,51,39,32,32,37,30)
  };
  const MONTHLY = [0.95,0.95,1.00,1.00,1.00,0.95,0.95,0.95,1.05,1.05,1.05,1.10]; // ESTIMATE, index month-1
  const MONTHLY_NOTE = {1:"Post-holiday lull; severe cold can cut trips (estimate)",6:"School out; weekday commute rush softer (estimate)",
    7:"Summer; Fun Fest Jul 9–12 downtown (sourced date, effect estimated)",9:"Back to school + fall drinks (estimate)",12:"Holiday shopping / gift cards (estimate)"};

  // Dates are plain {y,m,d} objects (no timezone involvement).
  const D = (y, m, d) => ({ y, m, d });
  const toUTC = (x) => Date.UTC(x.y, x.m - 1, x.d);
  const fromUTC = (t) => { const z = new Date(t); return D(z.getUTCFullYear(), z.getUTCMonth() + 1, z.getUTCDate()); };
  const addDays = (x, n) => fromUTC(toUTC(x) + n * 86400000);
  const dow = (x) => { const w = new Date(toUTC(x)).getUTCDay(); return w === 0 ? 7 : w; };
  const cmp = (a, b) => toUTC(a) - toUTC(b);
  const eq = (a, b) => cmp(a, b) === 0;
  const iso = (x) => `${x.y}-${String(x.m).padStart(2,"0")}-${String(x.d).padStart(2,"0")}`;
  const parseIso = (s) => { const [y, m, d] = s.split("-").map(Number); return D(y, m, d); };

  function special(x) {
    const y = x.y;
    const f = D(y, 11, 1); const thx = addDays(f, ((4 - dow(f) + 7) % 7) + 21);
    if (x.m === 12 && x.d === 25) return { label: "Christmas Day – may be closed/reduced hours (verify)", factor: 0.3, sourced: "estimate" };
    if (eq(x, thx)) return { label: "Thanksgiving – may be closed/reduced (verify)", factor: 0.3, sourced: "estimate" };
    if (x.m === 1 && x.d === 1) return { label: "New Year's Day", factor: 0.6, sourced: "estimate" };
    if (x.m === 12 && x.d === 24) return { label: "Christmas Eve – morning rush, early lull", factor: 0.85, sourced: "estimate" };
    if (eq(x, addDays(thx, 1))) return { label: "Black Friday / school break", factor: 1.1, sourced: "school calendar (sourced); factor estimate" };
    if (y === 2026 && x.m === 7 && x.d >= 9 && x.d <= 12) return { label: "New Richmond Fun Fest (downtown)", factor: 1.05, sourced: "dates sourced; factor estimate" };
    if ((y === 2026 && x.m === 12 && x.d >= 23) || (y === 2027 && x.m === 1 && x.d === 1)) return { label: "School winter break – weekday mornings shift later", factor: 1.0, sourced: "school calendar (sourced)" };
    if (y === 2027 && x.m === 3 && x.d >= 22 && x.d <= 26) return { label: "School spring break", factor: 0.95, sourced: "school calendar (sourced); factor estimate" };
    return null;
  }

  function pchip(x, y, t) {
    const n = x.length;
    if (n === 1 || t <= x[0]) return y[0];
    if (t >= x[n - 1]) return y[n - 1];
    const d = []; for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
    const m = new Array(n).fill(0); m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
    }
    let k = 0; while (t > x[k + 1]) k++;
    const h = x[k + 1] - x[k], u = (t - x[k]) / h;
    const h00 = 2*u*u*u - 3*u*u + 1, h10 = u*u*u - 2*u*u + u, h01 = -2*u*u*u + 3*u*u, h11 = u*u*u - u*u;
    return h00 * y[k] + h10 * h * m[k] + h01 * y[k + 1] + h11 * h * m[k + 1];
  }

  function isSchoolDay(x) {
    if (dow(x) >= 6) return false;
    if (cmp(x, D(2026, 9, 1)) < 0 || cmp(x, D(2027, 6, 3)) > 0) return false;
    const off = [D(2026,9,7), D(2026,11,26), D(2026,11,27), D(2027,1,18), D(2027,3,26)];
    if (off.some(o => eq(o, x))) return false;
    if (cmp(x, D(2026,12,23)) >= 0 && cmp(x, D(2027,1,1)) <= 0) return false;
    if (cmp(x, D(2027,3,22)) >= 0 && cmp(x, D(2027,3,25)) <= 0) return false;
    return true;
  }

  function schoolBump(x, minute) {
    if (!isSchoolDay(x)) return null;
    if (minute >= 450 && minute < 480) return [4, "Secondary drop-off from 7:30 (time sourced; +4 is an estimate)"];
    if (minute >= 480 && minute < 525) return [3, "Elementary drop-off 7:55–8:25 (time sourced; +3 is an estimate)"];
    if (minute >= 910 && minute < 940) return [3, "Dismissal 3:10–3:25 (time sourced; +3 is an estimate)"];
    return null;
  }

  const SLOTS = 144;
  function slots(x) {
    const [o, c] = HOURS[dow(x)]; const base = BASELINE[dow(x)];
    const hrs = []; for (let h = 0; h < 24; h++) if (base[h] > 0) hrs.push(h);
    const xs = hrs.map(h => h + 0.5), ys = hrs.map(h => base[h]);
    const sp = special(x); const f = MONTHLY[x.m - 1] * (sp ? sp.factor : 1);
    const out = [];
    for (let i = 0; i < SLOTS; i++) {
      const start = i / 6, center = (i + 0.5) / 6;
      const open = start >= o - 1e-9 && start < c - 1e-9;
      if (!open || xs.length === 0) { out.push({ index: i, value: 0, open: false, conf: "LOW", note: null }); continue; }
      let v = pchip(xs, ys, center) * f;
      const bump = schoolBump(x, i * 10); if (bump) v += bump[0];
      const edge = start < o + 0.5 || start >= c - 0.5 || center < xs[0] || center > xs[xs.length - 1];
      const conf = (bump || edge || sp) ? "LOW" : "MEDIUM";
      out.push({ index: i, value: Math.min(100, Math.max(1, Math.trunc(v))), open: true, conf, note: bump ? bump[1] : null });
    }
    return out;
  }

  const DELIVERY_FACTS = "On DoorDash: yes. Listing shows 4.7★ (700+ ratings), $0 delivery fee, ~24 min. Caviar (DoorDash) listing hours 5:30 AM–4:45 PM. Uber Eats: not found for New Richmond (only the Hudson store). Grubhub: not confirmed.";
  const DEL_HOURLY = {5:10,6:30,7:60,8:85,9:100,10:80,11:70,12:70,13:55,14:40,15:35,16:25}; // ESTIMATE (shape anchored to sourced facts)
  const DEL_DAY = {1:0.85,2:0.85,3:0.85,4:0.9,5:1.0,6:0.8,7:0.75}; // Friday busiest = sourced; others ESTIMATE
  function deliverySlots(x) {
    const hrs = [5,6,7,8,9,10,11,12,13,14,15,16];
    const xs = hrs.map(h => h + 0.5), ys = hrs.map(h => DEL_HOURLY[h]);
    const sp = special(x); const f = DEL_DAY[dow(x)] * (sp ? sp.factor : 1);
    const out = [];
    for (let i = 0; i < SLOTS; i++) {
      const start = i / 6;
      out.push(start < 5.5 || start >= 16.75 ? 0 : Math.min(100, Math.max(1, Math.trunc(pchip(xs, ys, (i + 0.5) / 6) * f))));
    }
    return out;
  }

  function slotLabel(i) {
    const h = Math.floor(i / 6), m = (i % 6) * 10, hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  }

  function windows(sl, peak, n = 3) {
    const cand = [];
    for (let i = 0; i <= SLOTS - 3; i++) if (sl[i].open && sl[i+1].open && sl[i+2].open)
      cand.push([i, Math.trunc((sl[i].value + sl[i+1].value + sl[i+2].value) / 3)]);
    cand.sort((a, b) => peak ? b[1] - a[1] : a[1] - b[1]); // stable, like Kotlin sortedBy
    const out = [];
    for (const c of cand) { if (!out.some(o => Math.abs(o[0] - c[0]) < 3)) out.push(c); if (out.length === n) break; }
    return out.sort((a, b) => a[0] - b[0]);
  }

  const label = (v) => v === 0 ? "Closed" : v < 35 ? "Not busy" : v < 60 ? "A little busy" : v < 80 ? "Busy" : "As busy as it gets";

  /** Current date/time in America/Chicago regardless of device timezone. */
  function nowChicago(date = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).map(x => [x.type, x.value]));
    return { date: D(+p.year, +p.month, +p.day), hour: +p.hour, minute: +p.minute };
  }

  const SOURCES = [
    ["Dunn Brothers Coffee – official store page (#237)", "https://locations.dunnbrothers.com/wi/newrichmond/1716-dorset-lane-237.html", "Name, Suite 100, phone, hours, services"],
    ["Exa place page – Dunn Brothers Coffee New Richmond", "https://exa.ai/library/place/scrvgnwlhh0", "Hourly popular times (all 7 days), rating 4.3/203, review on weekday-morning short staffing"],
    ["Restaurantji – Dunn Brothers Coffee New Richmond", "https://www.restaurantji.com/wi/new-richmond/dunn-brothers-coffee-/", "Hours cross-check, review themes"],
    ["Foodeist – Dunn Brothers New Richmond", "https://foodeist.com/place/dunn-brothers-coffee-new-richmond-wi", "Reviews mention long waits in busy periods (lists older 7 PM hours – not used)"],
    ["Yelp – Jimmy John's, 1716 Dorset Ln Ste 300", "https://www.yelp.com/biz/jimmy-johns-new-richmond", "Confirms other tenants at the address (not Suite 100)"],
    ["Visit New Richmond – Fun Fest", "https://visitnewrichmondwi.org/events/fun-fest-2/", "Fun Fest Jul 9–12, 2026, downtown"],
    ["School District of New Richmond – 2026-27 school start times", "https://www.newrichmond.k12.wi.us/district/school-start-time.cfm", "MS/HS 8:00–3:10 (drop-off from 7:30); elementary 8:25–3:25 (drop-off from 7:55)"],
    ["Hudson Star-Observer – start-time change article", "https://www.hudsonstarobserver.com/news/new-richmond-school-board-votes-to-change-school-start-and-end-times-for-202627/article_e63e903c-ef41-4598-8489-5012a8f906cd.html", "Old 2025-26 times: popular-times data may reflect the old schedule"],
    ["Wanderlog – Dunn Brothers Coffee", "https://wanderlog.com/place/details/1332351/dunn-brothers-coffee", "Typical visit duration ~1 hr (its hours listing is outdated, not used)"],
    ["Roadtrippers – Dunn Brothers New Richmond", "https://maps.roadtrippers.com/us/new-richmond-wi/food-drink/dunn-brothers-coffee-new-richmond", "Hours cross-check"],
    ["DoorDash – New Richmond coffee delivery listing", "https://www.doordash.com/food-delivery/new-richmond-wi-restaurants/coffee/", "Dunn Brothers on DoorDash: 4.7★ (700+), $0 fee, ~24 min"],
    ["Caviar (DoorDash) – Dunn Brothers New Richmond", "https://www.trycaviar.com/store/dunn-brothers-coffee-new-richmond-2659366/", "Delivery hours 5:30 AM–4:45 PM"],
    ["Uber Eats – New Richmond cappuccino listing", "https://www.ubereats.com/dish/new-richmond-wi/cappuccino", "Shows only Dunn Brothers (Hudson), so New Richmond is not on Uber Eats"],
    ["DoorDash – National Coffee Day 2026", "https://about.doordash.com/en-us/news/national-coffee-day-2026", "Coffee orders peak at 9 AM; Friday is the busiest day (2025 data)"],
    ["DoorDash – Iced Coffee Index", "https://about.doordash.com/en-us/news/iced-coffee-index-consumer-stress", "2–5 PM coffee orders up 7%"],
    ["DoorDash Ads – Consumer ordering insights (PDF)", "https://assets.ctfassets.net/trvmqu12jq2l/17ywnQORNFZm6LnjOugOlD/a43b10d90bfa8358a62e9ed195f3a660/Consumer_Ordering_Insights_for_Smarter_CPG_Targeting_1.pdf", "Daypart ranking: dinner > lunch > snack > late night > breakfast"],
    ["School District of New Richmond 2026–27 calendar", "https://www.newrichmond.k12.wi.us/2026-2027%20calendar%20at%20a%20glance1.pdf", "Thanksgiving, winter (Dec 23–Jan 1) and spring (Mar 22–25) breaks"]
  ];

  root.BusyModel = { NAME, TYPE, ADDRESS, PHONE, MONTHLY, MONTHLY_NOTE, DELIVERY_FACTS, SOURCES, SLOTS,
    D, addDays, dow, eq, iso, parseIso, special, isSchoolDay, slots, deliverySlots, slotLabel, windows, label, nowChicago, pchip };
})(typeof module !== "undefined" ? module.exports : self);
