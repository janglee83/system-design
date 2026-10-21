/* Original line illustrations for every component kind. Grammar: docs/design/illustration-grammar.md
   Artboard 64×48, live area x 4–60, y 4–44, ground line y 42; stroke 1.6 px round; body fill is the
   category colour at 16 % over the surface; one primary object; flow reads left → right. */
(function () {
  const A = 'fill="none" stroke="var(--k)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const T = 'fill="color-mix(in srgb, var(--k) 16%, var(--surface))" stroke="var(--k)" stroke-width="1.6" stroke-linejoin="round"';
  const S = 'fill="var(--surface)" stroke="var(--k)" stroke-width="1.6" stroke-linejoin="round"';
  const D = (cx, cy, r = 1.6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--k)"/>`;
  const cyl = (x, w, top, bot, extra = "") => {
    const rx = w / 2, cx = x + rx;
    return `<path d="M${x} ${top}v${bot - top}c0 3 ${rx * .9} 5 ${rx} 5s${rx} -2 ${rx} -5V${top}" ${T} ${extra}/><ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="4.5" ${T} ${extra}/>`;
  };
  const art = {
    /* ---------- entry ---------- */
    client: `<rect x="7" y="9" width="36" height="24" rx="2.5" ${T}/><path d="M12 16h14M12 21h20M12 26h10" ${A}/>
      <path d="M3 36h44l-3 4H6z" ${T}/><rect x="46" y="15" width="14" height="25" rx="3" ${T}/><path d="M51 36h4" ${A}/>`,
    mobile: `<rect x="20" y="4" width="24" height="40" rx="4" ${T}/><path d="M29 8h6M30 40h4" ${A}/>
      <rect x="24.5" y="13" width="6" height="6" rx="1.5" ${S}/><rect x="33.5" y="13" width="6" height="6" rx="1.5" ${S}/>
      <rect x="24.5" y="22" width="6" height="6" rx="1.5" ${S}/><rect x="33.5" y="22" width="6" height="6" rx="1.5" ${S}/>
      <path d="M50 12a8 8 0 0 1 0 12M54 8a14 14 0 0 1 0 20" ${A}/>`,
    dns: `<circle cx="22" cy="24" r="15" ${T}/><path d="M7 24h30M22 9c-5 4-6 26 0 30M22 9c5 4 6 26 0 30M10 16h24M10 32h24" ${A}/>
      <rect x="40" y="11" width="20" height="9" rx="2" ${S}/><path d="M43.5 15.5h10" ${A}/>
      <rect x="40" y="28" width="20" height="9" rx="2" ${S}/><path d="M43.5 32.5h4M50 32.5h6" ${A}/><path d="M50 20v8" ${A} stroke-dasharray="2 2.5"/>`,
    cdn: `<path d="M10 30a9 9 0 0 1 4-17 12 12 0 0 1 23-1 9 9 0 0 1 13 9 7 7 0 0 1-2 14H14a7 7 0 0 1-4-5z" ${T}/>
      <path d="M18 42v-6M32 42v-6M46 42v-6" ${A}/>${D(18, 43, 2.2)}${D(32, 43, 2.2)}${D(46, 43, 2.2)}
      <path d="M22 22h20M28 17l-6 5 6 5" ${A}/>`,
    "api-gateway": `<path d="M10 42V15l22-9 22 9v27" ${T}/><path d="M21 42V27a11 11 0 0 1 22 0v15" ${S}/><path d="M4 42h56M29 14h6" ${A}/>
      <path d="M2 34h56M54 30l4 4-4 4" ${A}/>`,
    lb: `<path d="M2 34h8" ${A}/><rect x="10" y="27" width="44" height="14" rx="3" ${T}/>${D(17, 34)}${D(23, 34)}
      <path d="M30 34h18" ${A} stroke-dasharray="2 3"/><path d="M32 27V20M32 20L14 8M32 20V7M32 20l18-12" ${A}/>
      <path d="M11 10l3-2 1 3.4M29 9.6l3-2.6 3 2.6M47.4 11.2l2.6-3.2 0.4 3.8" ${A}/>`,
    "rate-limiter": `<path d="M12 11h40L38 26v9l-12 5V26z" ${T}/>
      ${D(18, 4)}${D(25, 6.5)}${D(32, 3.5)}${D(39, 6)}${D(46, 4)}${D(32, 45, 1.9)}`,
    /* ---------- compute ---------- */
    "web-server": `<rect x="8" y="6" width="48" height="15" rx="2.5" ${T}/><rect x="8" y="25" width="48" height="15" rx="2.5" ${T}/>
      ${D(15, 13.5, 1.7)}${D(21, 13.5, 1.7)}${D(15, 32.5, 1.7)}${D(21, 32.5, 1.7)}
      <path d="M36 10v7M40 10v7M44 10v7M48 10v7M36 29v7M40 29v7M44 29v7M48 29v7M13 40v3M51 40v3" ${A}/>`,
    worker: `<rect x="6" y="14" width="34" height="26" rx="2.5" ${T}/>${D(12, 20)}${D(18, 20)}<path d="M11 30h14M11 35h20" ${A}/>
      <circle cx="46" cy="16" r="9" ${S}/><circle cx="46" cy="16" r="3.2" ${A}/>
      <path d="M46 4.5v3M46 24.5v3M34.5 16h3M54.5 16h3M37.9 7.9l2.1 2.1M52 22l2.1 2.1M37.9 24.1l2.1-2.1M52 10l2.1-2.1" ${A}/>`,
    scheduler: `<rect x="6" y="9" width="34" height="32" rx="3" ${T}/><path d="M6 17h34M14 5v7M32 5v7" ${A}/>
      <path d="M12 23h4M20 23h4M28 23h4M12 29h4M20 29h4M12 35h4" ${A}/>
      <circle cx="46" cy="32" r="12" ${S}/><path d="M46 25v7l5 3" ${A}/>`,
    /* ---------- data ---------- */
    postgres: `${cyl(13, 38, 9, 37)}<path d="M13 18.5c0 3 8.5 5.5 19 5.5s19-2.5 19-5.5M13 28c0 3 8.5 5.5 19 5.5S51 31 51 28" ${A}/>${D(44, 22, 1.4)}${D(44, 31.5, 1.4)}`,
    "read-replica": `${cyl(26, 30, 10, 36, 'stroke-dasharray="3 2.5"')}${cyl(6, 30, 14, 40)}
      <path d="M6 23c0 2.5 6.7 4.5 15 4.5s15-2 15-4.5" ${A}/><path d="M38 6h12a6 6 0 0 1 6 6v2M53 11l3 3 3-3" ${A}/>`,
    "kv-store": `<rect x="8" y="6" width="48" height="36" rx="3" ${T}/><path d="M8 18h48M8 30h48M26 6v36" ${A}/>
      <circle cx="15" cy="12" r="2.3" ${A}/><path d="M17.3 12h4.2M20 12v2" ${A}/>
      <circle cx="15" cy="24" r="2.3" ${A}/><path d="M17.3 24h4.2M20 24v2" ${A}/>
      <circle cx="15" cy="36" r="2.3" ${A}/><path d="M17.3 36h4.2M20 36v2" ${A}/>
      <path d="M31 12h18M31 24h12M31 36h20" ${A}/>`,
    search: `<rect x="6" y="5" width="30" height="38" rx="2.5" ${T}/><path d="M11 12h18M11 18h20M11 24h14M11 30h16" ${A}/>
      <circle cx="40" cy="26" r="10" ${S}/><path d="M47.5 33.5L57 43" ${A} stroke-width="3"/>
      <path d="M36 26a4 4 0 0 1 4-4" ${A}/>`,
    /* ---------- cache ---------- */
    redis: `<rect x="4" y="14" width="56" height="20" rx="2.5" ${T}/>
      <rect x="9" y="18" width="8" height="10" rx="1" ${S}/><rect x="20" y="18" width="8" height="10" rx="1" ${S}/><rect x="36" y="18" width="8" height="10" rx="1" ${S}/><rect x="47" y="18" width="8" height="10" rx="1" ${S}/>
      <path d="M8 34v4M14 34v4M20 34v4M26 34v4M38 34v4M44 34v4M50 34v4M56 34v4M31 34v5" ${A}/>
      <path d="M34 2l-6 11h6l-3 9" ${A} stroke-width="2"/>`,
    memcached: `<rect x="4" y="8" width="56" height="13" rx="2.5" ${T}/><rect x="4" y="26" width="56" height="13" rx="2.5" ${T}/>
      <path d="M10 12.5h8M22 12.5h8M34 12.5h8M46 12.5h8M10 16.5h8M22 16.5h8M34 16.5h8M46 16.5h8M10 30.5h8M22 30.5h8M34 30.5h8M46 30.5h8M10 34.5h8M22 34.5h8M34 34.5h8M46 34.5h8" ${A} stroke-width="1.3"/>
      <path d="M9 39v4M17 39v4M25 39v4M39 39v4M47 39v4M55 39v4" ${A}/>`,
    /* ---------- messaging ---------- */
    queue: `<path d="M2 24h6M56 24h6M58 20l4 4-4 4" ${A}/><rect x="8" y="13" width="48" height="22" rx="11" ${T}/>
      <rect x="15" y="18" width="9" height="12" rx="1.5" ${S}/><rect x="27.5" y="18" width="9" height="12" rx="1.5" ${S}/><rect x="40" y="18" width="9" height="12" rx="1.5" ${S}/>
      <path d="M15 18l4.5 5 4.5-5M27.5 18l4.5 5 4.5-5M40 18l4.5 5 4.5-5" ${A} stroke-width="1.2"/>`,
    rabbitmq: `<path d="M2 24h8" ${A}/><rect x="10" y="15" width="16" height="18" rx="3" ${T}/><path d="M13 24h5l4-4M18 24l4 4" ${A}/>
      <path d="M26 24c6 0 6-12 12-12M26 24c6 0 6 12 12 12" ${A}/>
      <rect x="38" y="6" width="22" height="12" rx="6" ${T}/><rect x="38" y="30" width="22" height="12" rx="6" ${T}/>
      ${D(44, 12)}${D(49, 12)}${D(54, 12)}${D(44, 36)}${D(49, 36)}`,
    stream: `<rect x="4" y="7" width="52" height="9" rx="2" ${T}/><rect x="4" y="20" width="52" height="9" rx="2" ${T}/><rect x="4" y="33" width="52" height="9" rx="2" ${T}/>
      <path d="M12 7v9M20 7v9M28 7v9M36 7v9M44 7v9M12 20v9M20 20v9M28 20v9M36 20v9M12 33v9M20 33v9M28 33v9M36 33v9M44 33v9M52 33v9" ${A} stroke-width="1.2"/>
      <path d="M59 6v38" ${A} stroke-dasharray="2 3"/><path d="M40 3l2 3 2-3" ${A}/>`,
    /* ---------- storage ---------- */
    "object-storage": `<path d="M10 16l4 26h36l4-26" ${T}/><ellipse cx="32" cy="16" rx="22" ry="5" ${T}/>
      <path d="M22 16V7h9l3 3v6M36 16v-6h8v6" ${S}/><path d="M25 11h3" ${A}/><path d="M14 28h36" ${A} stroke-dasharray="2 3"/>`,
    /* ---------- external ---------- */
    "third-party": `<path d="M10 32a9 9 0 0 1 3-17 12 12 0 0 1 22-3 10 10 0 0 1 16 8 7 7 0 0 1 0 14H13a7 7 0 0 1-3-2z" ${T} stroke-dasharray="4 2.5"/>
      <path d="M28 19h-3v12h12v-3M32 16h8v8M40 16l-9 9" ${A}/><path d="M4 42h20M20 38l4 4-4 4" ${A}/>`,
  };
  const icon = {
    gauge: '<path d="M3 11a5 5 0 1 1 10 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 11l3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    alert: '<path d="M8 2.5l6 10.5H2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 7v2.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.3" r=".9" fill="currentColor"/>',
    power: '<path d="M8 2.5v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.6 4.6a5 5 0 1 0 6.8 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    check: '<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    clock: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3.2l2 1.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  };
  window.SDArt = {
    kinds: Object.keys(art),
    svg(kind, w = 64, h = 48) {
      return `<svg class="art-svg" viewBox="0 0 64 48" width="${w}" height="${h}" aria-hidden="true">${art[kind] || art.client}</svg>`;
    },
    icon(name, size = 14) {
      return `<svg class="ic" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true">${icon[name]}</svg>`;
    },
  };
})();
