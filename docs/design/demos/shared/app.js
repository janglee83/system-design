/* The chosen app shell (3A: one bar, one Run) as reusable pieces for demos 03–10. */
(function () {
  const I = {
    undo: '<path d="M6 4L3 7l3 3M3.5 7H10a3.5 3.5 0 0 1 0 7H8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    redo: '<path d="M10 4l3 3-3 3M12.5 7H6a3.5 3.5 0 0 0 0 7h2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    play: '<path d="M5 3.5v9l7.5-4.5z" fill="currentColor"/>',
    pause: '<rect x="4" y="3.5" width="2.8" height="9" rx=".8" fill="currentColor"/><rect x="9.2" y="3.5" width="2.8" height="9" rx=".8" fill="currentColor"/>',
    stop: '<rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor"/>',
    chev: '<path d="M4.5 6.5L8 10l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    chevr: '<path d="M6.5 4.5L10 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    search: '<circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    grid: '<path d="M2.5 5.5h11M2.5 10.5h11M5.5 2.5v11M10.5 2.5v11" stroke="currentColor" stroke-width="1.3"/>',
    layout: '<rect x="2" y="3" width="4" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="10" y="3" width="4" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="10" y="9.5" width="4" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6 5h4M8 5v6.5h2" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    fit: '<path d="M2.5 6V3.5a1 1 0 0 1 1-1H6M10 2.5h2.5a1 1 0 0 1 1 1V6M13.5 10v2.5a1 1 0 0 1-1 1H10M6 13.5H3.5a1 1 0 0 1-1-1V10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    plus: '<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    minus: '<path d="M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    sun: '<circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    help: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6.3 6.3a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.6" r=".8" fill="currentColor"/>',
    ok: '<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    alert: '<path d="M8 2.5l6 10.5H2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 7v2.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    info: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 7.2V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="5" r=".9" fill="currentColor"/>',
    panel: '<rect x="2" y="2.5" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6 2.5v11" stroke="currentColor" stroke-width="1.4"/>',
    route: '<circle cx="4" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="4" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 10.5L10.5 5.5" stroke="currentColor" stroke-width="1.4" stroke-dasharray="1.5 2"/>',
    list: '<path d="M5 4h8M5 8h8M5 12h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="2.5" cy="4" r=".9" fill="currentColor"/><circle cx="2.5" cy="8" r=".9" fill="currentColor"/><circle cx="2.5" cy="12" r=".9" fill="currentColor"/>',
    retry: '<path d="M13 8a5 5 0 1 1-1.5-3.5M13 3v3h-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    book: '<path d="M3 3.5h4a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 0 7 11.5H3zM13 3.5H9.5A1.5 1.5 0 0 0 8 5v8a1.5 1.5 0 0 1 1.5-1.5H13z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
    flag: '<path d="M4 14V2.5M4 3h8l-1.5 3L12 9H4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>',
    lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    clock: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3.2l2 1.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  };
  const ic = (n, s = 16) => `<svg class="ic" viewBox="0 0 16 16" width="${s}" height="${s}" aria-hidden="true">${I[n]}</svg>`;
  const D = window.SDData;
  const cat = (kind) => `var(--c-${(D.kinds[kind] || {}).cat || "external"})`;

  const brand = `<div class="brand"><span class="mark"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="4" cy="8" r="2" fill="var(--on-accent)"/><circle cx="12" cy="4" r="2" fill="var(--on-accent)"/><circle cx="12" cy="12" r="2" fill="var(--on-accent)"/><path d="M5.5 7.2L10.5 4.8M5.5 8.8l5 2.4" stroke="var(--on-accent)" stroke-width="1.4"/></svg></span>SD Lab</div>`;
  const nav = (cur = "Lab") => `<nav class="nav" aria-label="Chính">${["Lab", "Học", "Thử thách", "Bảng xếp hạng"].map((x) => `<a href="#"${x === cur ? ' aria-current="page"' : ""}>${x}</a>`).join("")}</nav>`;
  const doc = (name = "Cửa hàng trực tuyến", saved = "Đã lưu trên máy · 2 phút trước") => `<div class="docname"><b>${name}</b><span class="saved">${saved}</span></div>`;
  const undo = `<button class="u-btn" aria-label="Hoàn tác (⌘Z)">${ic("undo")}</button><button class="u-btn" aria-label="Làm lại (⇧⌘Z)" disabled>${ic("redo")}</button>`;
  const problems = (n = 0) => n ? `<button class="problems bad">${ic("alert", 14)} ${n} vấn đề</button>` : `<button class="problems">${ic("ok", 14)} Không có vấn đề</button>`;
  const run = (disabled) => `<div class="run${disabled ? " is-disabled" : ""}"><button class="go"${disabled ? ' aria-disabled="true" title="Thêm Người dùng và một máy chủ để chạy"' : ""}>${ic("play")} Chạy mô phỏng <span class="kbd">⌘↵</span></button><button class="more" aria-label="Thiết lập lần chạy">${ic("chev")}</button></div>
    <div class="running-ctl"><div class="prog"><div class="t"><span>Đang chạy</span><b class="num">4,2 / 10 giây</b></div><div class="track"><span></span></div></div><button class="stop">${ic("stop", 14)} Dừng</button></div>`;
  const util = `<button class="u-btn" aria-label="Giao diện sáng/tối">${ic("sun")}</button><button class="u-btn util-x" aria-label="Ngôn ngữ">VI</button><button class="u-btn util-x" aria-label="Trợ giúp">${ic("help")}</button>`;
  const topbar = (o = {}) => `<header class="top">${brand}${nav(o.nav)}<div class="mid"><span class="sep"></span>${doc(o.name, o.saved)}<span style="flex:1"></span>${undo}<span class="sep"></span>${problems(o.problems)}</div>${util}${run(o.runDisabled)}</header>`;

  function paletteItems(o = {}) {
    const norm = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
    const q = norm(o.query || "");
    return D.categories.map((c) => {
      const ks = Object.entries(D.kinds).filter(([, k]) => k.cat === c.id && (!q || norm(k.label + ' ' + k.desc + ' ' + c.label).includes(q)));
      if (!ks.length) return "";
      ks.sort((a, b) => (a[1].status !== "ready") - (b[1].status !== "ready"));
      return `<div class="pgroup"><h5><i style="background:var(--c-${c.id})"></i>${c.label}</h5>${ks.map(([id, k]) => {
        const soon = k.status !== "ready";
        const price = soon ? "" : k.price ? `${Math.round(k.price)} $` : "0 $";
        return `<div class="pitem${soon ? " soon" : ""}" style="--k:${cat(id)}" tabindex="0" ${soon ? 'aria-disabled="true"' : ''}><div class="tile">${SDArt.svg(id, 32, 24)}</div><div><b>${k.label}${soon ? ' <span class="soonpill">Sắp có</span>' : ""}</b><small>${k.desc}</small></div><div class="price">${price}</div></div>`;
      }).join("")}</div>`;
    }).join("");
  }
  const palette = (extra = "", o = {}) => `<aside class="palette ${extra}" aria-label="Thành phần">
      <div class="ph"><div class="search">${ic("search", 14)} Tìm thành phần <span class="kbd2">⌘K</span></div></div>
      <div class="pscroll">${paletteItems(o)}</div>
      <div class="foot">Kéo vào khung vẽ, hoặc chọn rồi bấm Enter. Giá là mỗi máy mỗi tháng.</div></aside>`;

  const spark = (pts, color) => `<svg viewBox="0 0 120 28" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  const playback = `<div class="playback" aria-label="Phát lại">
    <button class="u-btn outline" aria-label="Tạm dừng">${ic("pause", 14)}</button><span class="t">00:04,2</span>
    <div class="scrub"><span class="line"></span><span class="done"></span><span class="ev" style="left:30%" title="Máy chủ web 2 ngừng chạy">${ic("alert", 10)}</span><span class="ev" style="left:38%" title="PostgreSQL 1 quá tải">${ic("alert", 10)}</span></div>
    <span class="t">00:10,0</span><span class="speed"><span>0,5×</span><span class="on">1×</span><span>2×</span></span></div>`;
  const legend = (pos) => `<div class="legend-chip" style="${pos}"><span><i style="border-color:var(--e-http)"></i>HTTP</span><span><i style="border-top-style:dashed;border-color:var(--e-db)"></i>Cơ sở dữ liệu</span></div>`;
  const zoom = (pos, z = "75%") => `<div class="ctl-stack" style="${pos}"><button class="u-btn" aria-label="Thu nhỏ">${ic("minus")}</button><span class="z">${z}</span><button class="u-btn" aria-label="Phóng to">${ic("plus")}</button><button class="u-btn" aria-label="Vừa màn hình">${ic("fit")}</button></div>`;
  const status = (o = {}) => `<div class="status"><span class="dotok">Bộ mô phỏng 0.1.0 sẵn sàng</span><span>${o.counts || "5 thành phần · 5 kết nối"}</span><div class="r"><span class="num">${o.cost || "430 $/tháng"}</span><span>Lưu tự động trên máy</span></div></div>`;

  /* Draws the sample design into a .cv element, fitted. */
  function drawCanvas(cv, mode, opts = {}) {
    const fit = document.createElement("div"); fit.className = "fit";
    const c = document.createElement("div"); c.className = "canvas"; fit.appendChild(c); cv.appendChild(fit);
    SDNodes.canvas(c, "a", mode, { uid: opts.uid || "s", extra: opts.extra || (mode === "editing" ? { "web-1": { selected: true } } : {}), nodes: opts.nodes, edges: opts.edges, rates: opts.rates });
    requestAnimationFrame(() => {
      const W = parseFloat(c.style.width), H = parseFloat(c.style.height);
      const k = Math.min(1, (cv.clientWidth - (opts.padX || 0)) / W, (cv.clientHeight - (opts.padY || 60)) / H);
      fit.style.transform = `translate(calc(-50% + ${opts.offX || 0}px), calc(-50% + ${opts.offY || 0}px)) scale(${k.toFixed(3)})`;
      cv.querySelectorAll(".z").forEach((z) => (z.textContent = Math.round(k * 100) + "%"));
    });
    return c;
  }

  const norm = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  window.SDApp = { norm, I, ic, brand, nav, doc, undo, problems, run, util, topbar, palette, paletteItems, spark, playback, legend, zoom, status, drawCanvas, cat };
})();
