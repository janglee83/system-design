/* Original line illustrations for each component kind (front view, 64×48, 1.6 px stroke).
   Colour comes from the CSS custom property --k (set per node). */
(function () {
  const A = 'fill="none" stroke="var(--k)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const T = 'fill="color-mix(in srgb, var(--k) 16%, var(--surface))" stroke="var(--k)" stroke-width="1.6" stroke-linejoin="round"';
  const art = {
    client: `
      <rect x="7" y="9" width="36" height="24" rx="2.5" ${T}/>
      <path d="M12 16h14M12 21h20M12 26h10" ${A}/>
      <path d="M3 36h44l-3 4H6z" ${T}/>
      <rect x="46" y="15" width="14" height="25" rx="3" ${T}/>
      <path d="M51 36h4" ${A}/>`,
    lb: `
      <path d="M2 34h8" ${A}/>
      <rect x="10" y="27" width="44" height="14" rx="3" ${T}/>
      <circle cx="17" cy="34" r="1.6" fill="var(--k)"/><circle cx="23" cy="34" r="1.6" fill="var(--k)"/>
      <path d="M30 34h18" ${A} stroke-dasharray="2 3"/>
      <path d="M32 27V20M32 20L14 8M32 20V7M32 20l18-12" ${A}/>
      <path d="M11 10l3-2 1 3.4M29 9.6l3-2.6 3 2.6M47.4 11.2l2.6-3.2 0.4 3.8" ${A}/>`,
    "web-server": `
      <rect x="8" y="6" width="48" height="15" rx="2.5" ${T}/>
      <rect x="8" y="25" width="48" height="15" rx="2.5" ${T}/>
      <circle cx="15" cy="13.5" r="1.7" fill="var(--k)"/><circle cx="21" cy="13.5" r="1.7" fill="var(--k)"/>
      <circle cx="15" cy="32.5" r="1.7" fill="var(--k)"/><circle cx="21" cy="32.5" r="1.7" fill="var(--k)"/>
      <path d="M36 10v7M40 10v7M44 10v7M48 10v7M36 29v7M40 29v7M44 29v7M48 29v7" ${A}/>
      <path d="M13 40v3M51 40v3" ${A}/>`,
    postgres: `
      <path d="M13 9v28c0 3 8.5 5.5 19 5.5S51 40 51 37V9" ${T}/>
      <ellipse cx="32" cy="9" rx="19" ry="5" ${T}/>
      <path d="M13 18.5c0 3 8.5 5.5 19 5.5s19-2.5 19-5.5M13 28c0 3 8.5 5.5 19 5.5S51 31 51 28" ${A}/>
      <circle cx="44" cy="22" r="1.4" fill="var(--k)"/><circle cx="44" cy="31.5" r="1.4" fill="var(--k)"/>`,
  };
  const icon = {
    gauge: '<path d="M3 11a5 5 0 1 1 10 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 11l3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    alert: '<path d="M8 2.5l6 10.5H2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 7v2.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.3" r=".9" fill="currentColor"/>',
    power: '<path d="M8 2.5v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.6 4.6a5 5 0 1 0 6.8 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    check: '<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  };
  window.SDArt = {
    svg(kind, w = 64, h = 48) {
      return `<svg class="art-svg" viewBox="0 0 64 48" width="${w}" height="${h}" aria-hidden="true">${art[kind]}</svg>`;
    },
    icon(name, size = 14) {
      return `<svg class="ic" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true">${icon[name]}</svg>`;
    },
  };
})();
