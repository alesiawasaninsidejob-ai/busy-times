(() => {
  const M = self.BusyModel;
  const $ = (id) => document.getElementById(id);
  const color = (v) => v < 35 ? "#66BB6A" : v < 60 ? "#FFCA28" : v < 80 ? "#FFA726" : "#EF5350";
  const confText = (c) => c === "MEDIUM" ? "Medium – interpolated from sourced hourly data" : "Low – near open/close, or includes an estimated adjustment";
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS = ["", "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

  $("name").textContent = M.NAME;
  $("meta").textContent = `${M.TYPE} · ${M.ADDRESS} · ${M.PHONE}`;
  $("delFacts").textContent = M.DELIVERY_FACTS;

  let selected = M.nowChicago().date;

  function arc(cx, cy, r, a0, a1) {
    const p = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`;
  }
  function gauge(v) {
    let s = `<path d="${arc(60,60,48,150,390)}" stroke="#444" stroke-width="16" fill="none" stroke-linecap="round"/>`;
    if (v > 0) s += `<path d="${arc(60,60,48,150,150 + 240 * v / 100)}" stroke="${color(v)}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
    $("gauge").innerHTML = s;
  }

  function renderNow() {
    const n = M.nowChicago(); const slot = n.hour * 6 + Math.floor(n.minute / 10);
    const sl = M.slots(n.date)[slot], del = M.deliverySlots(n.date)[slot];
    $("nowTitle").textContent = `Right now · ${M.slotLabel(slot)}–${M.slotLabel(slot + 1)} CT`;
    gauge(sl.open ? sl.value : 0);
    $("nowVal").textContent = sl.open ? `${sl.value} / 100` : "Closed";
    $("nowLabel").textContent = M.label(sl.open ? sl.value : 0);
    $("nowConf").textContent = sl.open ? `Confidence: ${confText(sl.conf)}` : "";
    const sp = M.special(n.date);
    $("nowNotes").textContent = [sl.note, sp && `Note: ${sp.label}`].filter(Boolean).join(" · ");
    $("nowDel").textContent = "Delivery orders (estimate): " + (del > 0 ? `${del} / 100 relative` : "delivery closed");
    $("today").disabled = M.eq(selected, n.date);
    return { n, slot };
  }

  function renderDay() {
    const { n, slot } = renderNow();
    const d = selected; $("date").value = M.iso(d);
    const sp = M.special(d);
    const factors = [`Month ${MONTHS[d.m - 1]} ×${M.MONTHLY[d.m - 1].toFixed(2)} (estimate)`];
    if (sp) factors.push(`${sp.label} ×${sp.factor} (${sp.sourced})`);
    factors.push(M.isSchoolDay(d) ? "School day: drop-off/dismissal bumps applied (estimate)" : "Not a school day (approx.)");
    $("factors").innerHTML = factors.map(f => `<li>${esc(f)}</li>`).join("");
    $("chartTitle").textContent = `${DAYS[M.dow(d)]}, ${M.iso(d)} · 10-minute view (scroll →)`;

    const sl = M.slots(d), del = M.deliverySlots(d), nowSlot = M.eq(d, n.date) ? slot : -1;
    const first = 30, last = 102, bw = 10, H = 170, LH = 16, W = (last - first) * bw;
    let s = "";
    for (let i = first; i < last; i++) {
      const x = (i - first) * bw, v = sl[i];
      if (i % 6 === 0) s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#ffffff33"/><text x="${x + 2}" y="${H + 12}" font-size="10" fill="#aaa">${M.slotLabel(i).replace(":00", "")}</text>`;
      if (v.open) { const bh = H * v.value / 100;
        s += `<rect x="${x + 1}" y="${H - bh}" width="${bw - 2}" height="${bh}" fill="${i === nowSlot ? "#fff" : color(v.value)}" opacity="${v.conf === "LOW" && i !== nowSlot ? 0.6 : 1}"><title>${M.slotLabel(i)}: ${v.value} (${v.conf.toLowerCase()})${v.note ? " – " + esc(v.note) : ""}</title></rect>`; }
    }
    const pts = [];
    for (let i = first; i < last; i++) if (del[i] > 0) pts.push(`${(i - first + 0.5) * bw},${H * (1 - del[i] / 100)}`);
    if (pts.length) s += `<polyline points="${pts.join(" ")}" fill="none" stroke="#42A5F5" stroke-width="2"/>`;
    const svg = $("chart"); svg.setAttribute("width", W); svg.setAttribute("height", H + LH); svg.setAttribute("viewBox", `0 0 ${W} ${H + LH}`); svg.innerHTML = s;

    const w = (p) => `${M.slotLabel(p[0])}–${M.slotLabel(p[0] + 3)} (${p[1]})`;
    $("best").textContent = "Best 30-min windows: " + M.windows(sl, false).map(w).join(", ");
    $("peak").textContent = "Peak 30-min windows: " + M.windows(sl, true).map(w).join(", ");
  }

  $("months").innerHTML = M.MONTHLY.map((f, i) => `<div class="month"><span>${MONTHS[i]}</span><div class="bar"><div style="width:${(f / 1.2 * 100).toFixed(1)}%"></div></div><span>×${f.toFixed(2)}</span></div>` +
    (M.MONTHLY_NOTE[i + 1] ? `<div class="tiny">${esc(M.MONTHLY_NOTE[i + 1])}</div>` : "")).join("");
  $("sourceList").innerHTML = M.SOURCES.map(([t, u, used]) => `<div class="src"><strong>${esc(t)}</strong><br><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a><div class="small">Used for: ${esc(used)}</div></div>`).join("");

  $("prev").onclick = () => { selected = M.addDays(selected, -1); renderDay(); };
  $("next").onclick = () => { selected = M.addDays(selected, 1); renderDay(); };
  $("today").onclick = () => { selected = M.nowChicago().date; renderDay(); };
  $("date").onchange = (e) => { if (e.target.value) { selected = M.parseIso(e.target.value); renderDay(); } };
  const show = (src) => { $("main").hidden = src; $("sources").hidden = !src; window.scrollTo(0, 0); };
  $("openSources").onclick = () => { show(true); history.pushState({ s: 1 }, ""); };
  $("back").onclick = () => history.back();
  window.onpopstate = () => show(false);

  renderDay();
  setInterval(renderNow, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderNow(); });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
