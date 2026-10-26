/* Node renderers (styles a / b / c) and a small canvas with typed edges and request dots. */
(function () {
  const { svg, icon } = window.SDArt;
  const D = window.SDData;
  const STATE_ICON = { busy: "gauge", over: "alert", down: "power", normal: "check" };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const SIZES = {
    a: { w: 172, h: 148, portY: 42, gapX: 100, rowH: 176 },
    b: { w: 248, h: 64, portY: 32, gapX: 84, rowH: 100 },
    c: { w: 152, h: 146, portY: 46, gapX: 76, rowH: 168 },
  };

  function chip(state, text) {
    return `<span class="st-chip st-${state}">${icon(STATE_ICON[state], 12)}<span>${esc(text)}</span></span>`;
  }

  function meta(n, mode) {
    const k = D.kinds[n.kind];
    if (mode === "running") return n.run.line;
    return n.cost ? `${k.label} · ${n.cost} $/tháng` : k.label;
  }

  function render(style, n, mode, extra = {}) {
    const running = mode === "running";
    const st = running ? n.run.state : "normal";
    const load = running ? n.run.load : null;
    const k = D.kinds[n.kind];
    const cls = ["node", "node-" + style, extra.target ? "tgt-" + extra.target : "", "is-" + st, extra.selected ? "is-selected" : "", extra.locked ? "is-locked" : "", n.replicas > 1 ? "has-replicas" : "", running ? "is-running" : ""].join(" ");
    const aria = `${n.label}, ${k.label}${running ? ", " + D.stateWords[st] + (load != null && st !== "down" ? " " + load + "%" : "") : ""}${extra.selected ? ", đang chọn" : ""}${extra.locked ? ", đã khoá" : ""}${extra.issues ? ", " + extra.issues + " vấn đề" : ""}`;
    const issue = extra.issues ? `<span class="issue" role="img" aria-label="${extra.issues} vấn đề">${extra.issues}</span>` : "";
    const lock = extra.locked ? `<span class="lock" title="Thử thách đã khóa thành phần này">${icon("lock", 12)}</span>` : "";
    const ports = `${n.kind !== "client" ? '<span class="port in"></span>' : ""}<span class="port out"></span>`;
    const rep = n.replicas > 1 ? `<span class="rep num">×${n.replicas}</span>` : "";
    const stChip = running && st !== "normal" ? chip(st, D.stateWords[st]) : "";
    const fillH = load == null ? 0 : Math.min(load, 100);

    if (style === "a") {
      return `<div class="${cls}" style="--k:${catVar(n.kind)}" role="group" aria-label="${esc(aria)}" ${extra.selected ? 'aria-current="true"' : ""} tabindex="0">
        <div class="art"><span class="fill" style="height:${fillH}%"></span>${svg(n.kind, 76, 57)}${rep}${stChip}</div>
        <div class="body"><div class="name">${esc(n.label)}</div><div class="meta">${esc(running ? n.run.line : n.sub)}</div><div class="meta2 num">${running ? (load == null || st === "down" ? "&nbsp;" : `<span class="lv">${load}%</span> tải`) : (n.cost == null ? "Chưa có giá" : n.cost ? `${n.cost} $/tháng` : "Miễn phí")}</div></div>
        ${ports}${issue}${lock}</div>`;
    }
    if (style === "b") {
      const sent = (n.run.line.match(/[\d.]+/) || ["—"])[0];
      const right = running
        ? (st === "down" ? `<span class="val">—</span><span class="unit">tắt</span>` : load == null ? `<span class="val num">${sent}</span><span class="unit">/giây</span>` : `<span class="val num">${load}%</span><span class="unit">tải</span>`)
        : (n.cost ? `<span class="val num">${n.cost}</span><span class="unit">$/tháng</span>` : `<span class="val">—</span><span class="unit">miễn phí</span>`);
      const sub = running ? (st !== "normal" ? chip(st, D.stateWords[st]) : esc(n.run.line)) : esc(n.sub);
      return `<div class="${cls}" style="--k:${catVar(n.kind)}" role="group" aria-label="${esc(aria)}" ${extra.selected ? 'aria-current="true"' : ""} tabindex="0">
        <span class="rail"></span><div class="tile">${svg(n.kind, 36, 27)}</div>
        <div class="txt"><div class="name">${esc(n.label)}</div><div class="meta">${rep}${sub}</div></div>
        <div class="right">${right}</div>
        ${running && load != null ? `<span class="bar"><span style="width:${fillH}%"></span></span>` : ""}
        ${ports}${issue}${lock}</div>`;
    }
    // c: station with ring gauge
    const R = 46, C = 2 * Math.PI * R;
    const dash = load == null ? 0 : (Math.min(load, 100) / 100) * C;
    const ticks = n.replicas > 1 ? Array.from({ length: n.replicas }, (_, i) => `<span class="tick" style="--i:${i};--n:${n.replicas}"></span>`).join("") : "";
    return `<div class="${cls}" style="--k:${catVar(n.kind)}" role="group" aria-label="${esc(aria)}" ${extra.selected ? 'aria-current="true"' : ""} tabindex="0">
      <div class="disc">
        <svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${R}" class="track"/>${running && load != null ? `<circle cx="50" cy="50" r="${R}" class="gauge" stroke-dasharray="${dash} ${C}"/>` : ""}</svg>
        <div class="inner">${svg(n.kind, 54, 40)}</div>${ticks}${ports}
      </div>
      <div class="cap"><div class="name">${esc(n.label)}</div><div class="meta">${running && st !== "normal" ? chip(st, (load != null && st !== "down" ? load + "% · " : "") + D.stateWords[st]) : esc(running ? n.run.line : (n.cost ? `${n.cost} $/tháng` : D.kinds[n.kind].label))}${n.replicas > 1 && !running ? ` · <span class="num">×${n.replicas}</span>` : ""}</div></div>
      ${issue}${lock}</div>`;
  }

  function kindVar(kind) { return "x"; }
  const catVar = (kind) => "var(--c-" + ((D.kinds[kind] || {}).cat || "external") + ")";

  /* Canvas: lays out nodes by col/row for a style, draws edges and (running) request dots. */
  function canvas(el, style, mode, opts = {}) {
    const s = SIZES[style];
    const nodes = opts.nodes || D.design.nodes;
    const edges = opts.edges || D.design.edges;
    const pad = 56;
    const pos = {};
    nodes.forEach((n) => { pos[n.id] = { x: pad + n.col * (s.w + s.gapX), y: pad + n.row * s.rowH * (opts.rowScale || 0.62) }; });
    const W = pad * 2 + (Math.max(...nodes.map((n) => n.col)) + 1) * (s.w + s.gapX) - s.gapX;
    const H = pad * 2 + Math.max(...nodes.map((n) => n.row)) * s.rowH * (opts.rowScale || 0.62) + s.h;
    const port = (id, side) => {
      const p = pos[id];
      if (style === "c") return { x: p.x + s.w / 2 + (side === "out" ? 46 : -46), y: p.y + s.portY };
      return { x: p.x + (side === "out" ? s.w : 0), y: p.y + s.portY };
    };
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    let paths = "", dots = "", labels = "";
    edges.forEach((e, i) => {
      const a = port(e.from, "out"), b = port(e.to, "in");
      const dx = Math.max(40, (b.x - a.x) / 2);
      let d = `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
      if (opts.route === "ortho") {
        const mx = (a.x + b.x) / 2, r = Math.min(10, Math.abs(b.y - a.y) / 2), sy = b.y > a.y ? 1 : -1;
        d = Math.abs(b.y - a.y) < 1 ? `M${a.x},${a.y} H${b.x}` : `M${a.x},${a.y} H${mx - r} Q${mx},${a.y} ${mx},${a.y + sy * r} V${b.y - sy * r} Q${mx},${b.y} ${mx + r},${b.y} H${b.x}`;
      }
      const tgt = byId[e.to], src = byId[e.from];
      const dead = mode === "running" && (tgt.run.state === "down" || src.run.state === "down");
      const hot = mode === "running" && !dead && tgt.run.state === "over";
      const w = opts.weights && mode === "running" ? `style="stroke-width:${dead ? 1.5 : Math.max(1.5, Math.min(7, (e.w || 1) * 6))}px"` : "";
      paths += `<path id="e-${opts.uid || ""}${i}" d="${d}" class="edge k-${e.kind} ${dead ? "dead" : ""} ${hot ? "hot" : ""} ${e.sel ? "sel" : ""}" ${w} marker-end="url(#arrow-${e.kind}${opts.uid || ""})"/>`;
      if (opts.badges && mode !== "running") {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        labels += `<div class="kbadge k-${e.kind}" style="left:${mx}px;top:${my}px">${{ http: "HTTP", db: "CSDL", cache: "Đệm", msg: "Tin" }[e.kind]}</div>`;
      }
      if (mode === "running" && !dead && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        for (let j = 0; j < 4; j++) {
          dots += `<circle r="3.2" opacity="0" class="dot k-${e.kind} ${hot && j === 3 ? "rejected" : ""}"><set attributeName="opacity" to="1" begin="${(j * 0.6 + i * 0.17).toFixed(2)}s"/><animateMotion dur="2.4s" repeatCount="indefinite" begin="${(j * 0.6 + i * 0.17).toFixed(2)}s"><mpath href="#e-${opts.uid || ""}${i}"/></animateMotion></circle>`;
        }
      }
      if (mode === "running" && opts.rates !== false) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        labels += `<div class="rate ${dead ? "dead" : ""} ${hot ? "hot" : ""}" style="left:${mx}px;top:${my}px">${hot ? icon("alert", 11) + " " : ""}${e.rate}</div>`;
      }
    });
    const markers = ["http", "db", "cache", "msg"].map((k) => `<marker id="arrow-${k}${opts.uid || ""}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M1,1 L9,5 L1,9" fill="none" class="mk k-${k}"/></marker>`).join("");
    if (opts.ghost) {
      const a = port(opts.ghost.from, "out"), b = opts.ghost.to;
      const gdx = Math.max(40, (b.x - a.x) / 2);
      paths += `<path d="M${a.x},${a.y} C${a.x + gdx},${a.y} ${b.x - gdx},${b.y} ${b.x},${b.y}" class="edge ghost k-${opts.ghost.kind}"/><circle cx="${b.x}" cy="${b.y}" r="5" class="ghost-end"/>`;
    }
    el.style.width = W + "px";
    el.style.height = H + "px";
    el.innerHTML = `<svg class="edges" width="${W}" height="${H}" aria-hidden="true"><defs>${markers}</defs>${paths}${dots}</svg>${labels}` +
      nodes.map((n) => `<div class="pos" style="left:${pos[n.id].x}px;top:${pos[n.id].y}px">${render(style, n, mode, (opts.extra || {})[n.id] || {})}</div>`).join("");
    return { W, H, pos, port };
  }

  window.SDNodes = { render, canvas, SIZES };
})();
