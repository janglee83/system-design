/* Demo chrome: option / theme / mode switches, persisted per page; palette shared across demos.
   URL parameters override storage: ?opt=b&theme=dark&mode=running&palette=c */
(function () {
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private window */ } },
  };
  const q = new URLSearchParams(location.search);

  function seg(label, items, current, onPick) {
    const g = document.createElement("div");
    g.className = "db-group";
    g.innerHTML = `<span>${label}</span>`;
    const s = document.createElement("div");
    s.className = "db-seg";
    s.setAttribute("role", "group");
    s.setAttribute("aria-label", label);
    items.forEach((it) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.value = it.id;
      b.innerHTML = it.label;
      b.setAttribute("aria-pressed", String(it.id === current));
      b.addEventListener("click", () => {
        s.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        onPick(it.id);
      });
      s.appendChild(b);
    });
    g.appendChild(s);
    return g;
  }

  window.Demo = {
    init(cfg) {
      const key = "sd-demo-" + cfg.id;
      const sysDark = matchMedia("(prefers-color-scheme: dark)").matches;
      const state = {
        option: q.get("opt") || store.get(key + "-opt") || cfg.options[0].id,
        theme: q.get("theme") || store.get("sd-demo-theme") || (sysDark ? "dark" : "light"),
        mode: q.get("mode") || store.get(key + "-mode") || "editing",
        palette: q.get("palette") || store.get("sd-demo-palette") || "a",
      };
      if (!cfg.options.some((o) => o.id === state.option)) state.option = cfg.options[0].id;
      const root = document.documentElement;
      if (q.get("embed")) root.classList.add("embed");
      const apply = () => {
        root.dataset.theme = state.theme;
        root.dataset.palette = cfg.ownsPalette ? state.option : state.palette;
        root.dataset.option = state.option;
        root.dataset.mode = state.mode;
        renderNote();
        cfg.onChange && cfg.onChange({ ...state });
      };

      const bar = document.createElement("header");
      bar.className = "demo-bar";
      bar.innerHTML = `<a href="../index.html">← Bộ sưu tập</a><div class="db-title">${cfg.title}<small>${cfg.subtitle || ""}</small></div>`;
      bar.appendChild(
        seg("Phương án", cfg.options.map((o) => ({ id: o.id, label: `${o.id.toUpperCase()} · ${o.name}${o.recommended ? ' <span class="rec">Đề xuất</span>' : ""}` })), state.option, (v) => {
          state.option = v; store.set(key + "-opt", v);
          if (cfg.ownsPalette) { state.palette = v; store.set("sd-demo-palette", v); }
          apply();
        }),
      );
      bar.appendChild(seg("Giao diện", [{ id: "light", label: "Sáng" }, { id: "dark", label: "Tối" }], state.theme, (v) => { state.theme = v; store.set("sd-demo-theme", v); apply(); }));
      if (cfg.modes !== false) {
        bar.appendChild(seg("Trạng thái", [{ id: "editing", label: "Đang thiết kế" }, { id: "running", label: "Đang chạy" }], state.mode, (v) => { state.mode = v; store.set(key + "-mode", v); apply(); }));
      }
      document.body.prepend(bar);

      const note = document.createElement("section");
      note.className = "option-note";
      note.setAttribute("aria-live", "polite");
      bar.after(note);
      function renderNote() {
        const o = cfg.options.find((x) => x.id === state.option);
        note.innerHTML = `
          <div><h2>${o.id.toUpperCase()} · ${o.name}${o.recommended ? '<span class="badge-rec">Đề xuất</span>' : ""}</h2><p>${o.summary}</p></div>
          <div><h3>Điểm mạnh</h3><ul>${o.pros.map((p) => `<li>${p}</li>`).join("")}</ul></div>
          <div><h3>Đánh đổi</h3><ul>${o.cons.map((p) => `<li>${p}</li>`).join("")}</ul></div>`;
      }
      apply();
      return state;
    },
  };
})();
