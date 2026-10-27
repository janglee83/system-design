/* Demo 11 · Learn and challenge list/detail pages, from content/curriculum.json. */
(function () {
  const A = SDApp, ic = A.ic, C = SDContent;
  const L0 = C.levels[0];
  const diff = (n) => `<span class="diff" title="Độ khó ${n}/3">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;
  const kindIcon = (k) => `<span class="kicon ${k === "experiment" ? "exp" : ""}" title="${k === "experiment" ? "Thí nghiệm" : "Bài đọc"}">${ic(k === "experiment" ? "route" : "book", 15)}</span>`;
  const kindWord = (k) => (k === "experiment" ? "Thí nghiệm" : "Bài đọc");
  const readyPill = (r) => r === "ready" ? `<span class="pill ok">${ic("play", 10)} Chạy được trong Lab</span>` : r === "planned" ? `<span class="pill wait">Chờ bộ mô phỏng</span>` : `<span class="pill">Không cần Lab</span>`;
  const done = (i) => i < 3, cur = (i) => i === 3;
  const modeName = { standard: "Tiêu chuẩn", "tight-budget": "Ngân sách chặt", chaos: "Hỗn loạn" };
  const metricName = { p95: "Độ trễ p95", requestsRejected: "Yêu cầu bị từ chối", availability: "Tỉ lệ trả lời được", costPerMonth: "Chi phí", spofCount: "Điểm hỏng là sập", exposedBackends: "Máy chủ lộ ra ngoài", throughputRps: "Thông lượng" };
  const fmtGoal = (g) => { const v = g.metric === "availability" ? (g.value * 100).toLocaleString("vi-VN") + "%" : g.metric === "p95" ? g.value + " ms" : g.value; return `${metricName[g.metric] || g.metric} <b>${g.op === "<=" ? "≤" : g.op === ">=" ? "≥" : "="} ${v}</b>`; };
  const strip = (kinds) => kinds.slice(0, 4).map((k, i) => `${i ? "<i></i>" : ""}<span style="--k:${A.cat(k)}">${SDArt.svg(k, 32, 24)}</span>`).join("");

  function topbar(cur) {
    return `<header class="top">${A.brand}${A.nav(cur)}<div class="r"><span class="streak">${ic("flag", 13)} Cấp 0 · <b>18/100</b> điểm</span><button class="u-btn" aria-label="Tìm">${ic("search")}</button>${A.util}</div></header>`;
  }
  const levelsStrip = () => `<div class="levels">${C.levels.map((l, i) => `<div class="lv ${i === 0 ? "cur" : i > 1 ? "lvlock" : ""}"><small>${l.id} · ${l.score[0]}–${l.score[1]}</small><b>${l.title}</b><div class="pg"><span style="width:${i === 0 ? 23 : 0}%"></span></div></div>`).join("")}</div>`;

  /* ---------- learn lists ---------- */
  function learnA() {
    const items = L0.lessons.slice(0, 9);
    const steps = items.map((x, i) => {
      const st = done(i) ? "done" : cur(i) ? "cur" : "";
      return `<div class="step ${st}"><span class="dot">${done(i) ? ic("ok", 18) : ic(x.kind === "experiment" ? "route" : "book", 18)}</span>
        <div class="card"><b>${x.title}</b><div class="meta">${kindWord(x.kind)} · <span class="num">${x.minutes} phút</span> · ${diff(x.difficulty)}${st === "cur" ? ` · <span class="pill acc">Đang học · bước 2/5</span>` : ""}</div></div>
        <div>${st === "cur" ? `<button class="btn pri">Tiếp tục ${ic("chevr", 14)}</button>` : ""}</div></div>`;
    });
    const ch = L0.challenges[0];
    steps.splice(7, 0, `<div class="step mile"><span class="dot">${ic("flag", 18)}</span><div class="card"><b>Thử thách · ${ch.title}</b><div class="meta">${ch.modes.length} chế độ · <span class="num">${ch.rps.toLocaleString("vi-VN")} yêu cầu/giây</span> · ${readyPill(ch.ready)}</div></div><div></div></div>`);
    return `<div class="ph1"><div><h1>Học</h1><p>Lộ trình 0 → 100 điểm. Mỗi cấp kết thúc bằng một bài kiểm tra trong Lab.</p></div><div class="side"><button class="btn">${ic("list", 14)} Xem dạng danh sách</button></div></div>
      ${levelsStrip()}
      <div class="pathgrid"><div><div class="lvh" style="margin:0 0 6px"><span>Cấp 0 · Nền tảng · 13 bài, 4 thử thách</span><span>3/13 đã xong</span></div><div class="path">${steps.join("")}</div><div class="meta" style="padding:8px 0 0 70px">+ 4 bài và 3 thử thách nữa trong cấp này</div></div>
      <aside class="rail"><div class="box cont"><h4>Tiếp tục</h4><b>${L0.lessons[3].title}</b><div class="meta" style="margin-bottom:12px">Bước 2/5 · còn khoảng 8 phút</div><button class="btn pri">Học tiếp ${ic("chevr", 14)}</button></div>
        <div class="box"><h4>Xong cấp 0, bạn sẽ</h4><ul>${L0.outcomes.map((o) => `<li>${o}</li>`).join("")}</ul></div></aside></div>`;
  }
  function learnB() {
    const list = L0.lessons.map((x, i) => `<div class="li ${i === 3 ? "sel" : ""}">${kindIcon(x.kind)}<div><b>${x.title}</b><div class="meta">${done(i) ? `<span class="pill ok">${ic("ok", 10)} Xong</span>` : cur(i) ? `<span class="pill acc">Đang học</span>` : ""}<span class="num">${x.minutes} phút</span> · ${diff(x.difficulty)}</div></div></div>`).slice(0, 10).join("");
    const x = L0.lessons[3];
    return `<div class="ph1"><div><h1>Học</h1><p>136 bài trong 7 cấp. Chọn một bài để xem trước.</p></div></div>
      <div class="filters"><div class="search">${ic("search", 14)} Tìm bài, khái niệm…</div><span class="fchip on">Cấp 0</span><span class="fchip">Cấp 1</span><span class="fchip">Cấp 2</span><span class="fchip">Thí nghiệm</span><span class="fchip">Bài đọc</span><span class="count">13 bài</span></div>
      <div class="split"><div class="list"><div class="lvh"><span>Cấp 0 · Nền tảng</span><span>3/13</span></div>${list}</div>
      <section class="prev">${readyPill(x.ready)}<h2>${x.title}</h2><div class="meta">${kindWord(x.kind)} · <span class="num">${x.minutes} phút</span> · ${diff(x.difficulty)} · Cấp 0</div>
        <div class="cols"><div><h4 style="margin:0 0 6px;font-size:13px;color:var(--text-3)">Khái niệm</h4><div class="allowed">${x.concepts.map((c) => `<span style="padding:4px 10px">${({ latency: "độ trễ", "round-trip-time": "thời gian khứ hồi", "propagation-delay": "trễ lan truyền", throughput: "thông lượng" })[c] || c}</span>`).join("")}</div></div>
        <div><h4 style="margin:0 0 6px;font-size:13px;color:var(--text-3)">Dùng trong Lab</h4><div class="allowed">${(x.needs.length ? x.needs : ["client"]).map((k) => `<span style="--k:${A.cat(k)}"><i>${SDArt.svg(k, 20, 15)}</i>${SDData.kinds[k].label}</span>`).join("")}</div></div></div>
        <div class="meta" style="margin-bottom:14px">Bạn đang ở bước 2/5 của bài này.</div><button class="btn pri lg">Học tiếp ${ic("chevr", 14)}</button></section></div>`;
  }
  function learnC() {
    const cards = L0.lessons.slice(0, 9).map((x, i) => `<div class="cardc ${done(i) ? "done" : ""}"><div class="ill">${x.needs.length ? strip(x.needs) : strip(["client", "dns", "web-server"].filter((k) => SDData.kinds[k]))}${done(i) ? `<span class="pill ok">${ic("ok", 10)} Xong</span>` : cur(i) ? `<span class="pill acc">Đang học</span>` : ""}</div>
      <div class="bd"><b>${x.title}</b><div class="meta">${kindWord(x.kind)} · <span class="num">${x.minutes} phút</span> · ${diff(x.difficulty)}</div></div></div>`).join("");
    return `<div class="ph1"><div><h1>Học</h1><p>Bài học có hình minh hoạ các thành phần sẽ dùng.</p></div></div>
      <div class="filters"><div class="search">${ic("search", 14)} Tìm bài, khái niệm…</div><span class="fchip on">Cấp 0</span><span class="fchip">Cấp 1</span><span class="fchip">Cấp 2</span><span class="fchip">Chưa học</span><span class="count">13 bài</span></div>
      <div class="grid3">${cards}</div>`;
  }

  /* ---------- challenge lists ---------- */
  const allCh = C.levels.slice(0, 3).flatMap((l) => l.challenges.map((c) => Object.assign({ lvl: l.id, lvlTitle: l.title }, c)));
  const chMeta = (c) => `<span class="num">${(c.rps || 0).toLocaleString("vi-VN")} yêu cầu/giây</span> · ${c.modes.length} chế độ · từ <span class="num">${Math.min(...c.modes.map((m) => m.budget || 9999))} $</span>`;
  function chalA() {
    const rows = C.levels.slice(0, 3).map((l, li) => `<div class="lvh" style="margin:${li ? 18 : 0}px 0 6px"><span>${l.id} · ${l.title}</span><span>${l.challenges.length} thử thách</span></div><div class="path">${l.challenges.map((c, i) => {
      const st = li === 0 && i === 0 ? "done" : li === 0 && i === 1 ? "cur" : "";
      return `<div class="step mile ${st}"><span class="dot">${st === "done" ? ic("ok", 18) : ic("flag", 18)}</span><div class="card"><b>${c.title}</b><div class="meta">${chMeta(c)} · ${readyPill(c.ready)}</div></div><div>${st === "cur" ? `<button class="btn pri">Vào thử thách</button>` : ""}</div></div>`;
    }).join("")}</div>`).join("");
    return `<div class="ph1"><div><h1>Thử thách</h1><p>Đề bài thật, ngân sách thật. Mỗi thử thách có nhiều chế độ: tiêu chuẩn, ngân sách chặt, hỗn loạn.</p></div><div class="side"><button class="btn">Mở Lab trống</button></div></div>
      <div class="pathgrid"><div>${rows}</div><aside class="rail"><div class="box"><h4>Tiến độ</h4><div style="font:600 28px var(--font-mono)">1<span style="font-size:16px;color:var(--text-3)"> / 44</span></div><div class="meta">thử thách đã đạt ít nhất một chế độ</div></div>
      <div class="box"><h4>Cách chấm</h4><ul><li>Đạt mọi mục tiêu của chế độ, trong ngân sách.</li><li>Thiết kế rẻ hơn xếp cao hơn trên bảng xếp hạng.</li><li>Chạy bao nhiêu lần cũng được; mọi thứ chạy trên máy bạn.</li></ul></div></aside></div>`;
  }
  function chalB() {
    const list = allCh.slice(0, 9).map((c, i) => `<div class="li ${i === 0 ? "sel" : ""}"><span class="kicon" style="background:color-mix(in srgb, var(--busy-line) 14%, var(--surface));color:var(--busy)">${ic("flag", 14)}</span><div><b>${c.title}</b><div class="meta">${c.lvl} · ${chMeta(c)}</div></div></div>`).join("");
    const c = allCh[0];
    return `<div class="ph1"><div><h1>Thử thách</h1><p>44 thử thách trong 7 cấp.</p></div></div>
      <div class="filters"><div class="search">${ic("search", 14)} Tìm đề bài, công nghệ…</div><span class="fchip on">Tất cả</span><span class="fchip">Chạy được</span><span class="fchip">Chưa làm</span><span class="count">15 trong cấp 0–2</span></div>
      <div class="split"><div class="list">${list}</div><section class="prev">${readyPill(c.ready)}<h2>${c.title}</h2><p>Một tiệm bánh gia đình sắp mở cửa hàng trực tuyến: khoảng 3.000 yêu cầu mỗi giây vào giờ trưa.</p>
        <div class="goals2">${c.goals.map((g) => `<div>${fmtGoal(g)}</div>`).join("")}<div>Chi phí <b>trong ngân sách</b></div></div>
        <div class="modes">${c.modes.map((m, i) => `<div class="mode ${i ? "" : "sel"}"><b>${modeName[m.id]}</b><div class="bud">${m.budget} $</div><small>mỗi tháng</small></div>`).join("")}</div>
        <div style="margin-top:16px"><button class="btn pri lg">Vào thử thách ${ic("chevr", 14)}</button></div></section></div>`;
  }
  function chalC() {
    return `<div class="ph1"><div><h1>Thử thách</h1><p>Chọn một đề bài; hình vẽ là các thành phần được phép dùng.</p></div></div>
      <div class="filters"><div class="search">${ic("search", 14)} Tìm đề bài…</div><span class="fchip on">Cấp 0–2</span><span class="fchip">Chạy được</span><span class="count">15 thử thách</span></div>
      <div class="grid3">${allCh.slice(0, 9).map((c, i) => `<div class="cardc"><div class="ill">${strip(c.kinds.length ? c.kinds : ["client", "web-server"])}<span class="pill ${i === 0 ? "ok" : ""}">${i === 0 ? ic("ok", 10) + " Đã đạt" : c.lvl}</span></div><div class="bd"><b>${c.title}</b><div class="meta">${chMeta(c)}</div></div></div>`).join("")}</div>`;
  }

  /* ---------- details ---------- */
  function lessonDetail() {
    const toc = ["Mục tiêu", "Hình dung trước", "Thuật ngữ", "Bước 1 · quan sát", "Bước 2 · phân tích", "Bước 3 · áp dụng", "Câu hỏi"];
    const fig = `<div class="fig"><div class="cv2"><div class="n2" style="--k:var(--c-entry)"><span>${SDArt.svg("client", 54, 40)}</span>10.000 lượt đọc/giây</div><div class="ar">9.000/s</div>
      <div class="n2" style="--k:var(--c-cache)"><span>${SDArt.svg("redis", 54, 40)}</span>Bộ nhớ đệm · trúng 90%</div><div class="ar" style="color:var(--e-db)">1.000/s</div><div class="n2" style="--k:var(--c-data)"><span>${SDArt.svg("postgres", 54, 40)}</span>Cơ sở dữ liệu</div></div>
      <div class="cap">Tỉ lệ trúng <div class="slider"><span></span><i></i></div><b class="num">90%</b><span class="pill wait">Thử trong Lab khi có Redis</span></div></div>`;
    return `<div class="lesson"><nav class="toc" aria-label="Các bước"><a href="#" style="color:var(--text-3);font-size:12.5px">${ic("chevr", 12)} Học / Cấp 0</a><div class="prog"><span></span></div>${toc.map((t, i) => `<a href="#" class="${i < 4 ? "done" : i === 4 ? "cur" : ""}"><span class="n">${i < 4 ? ic("ok", 11) : i + 1}</span>${t}</a>`).join("")}</nav>
      <article class="reading"><div class="meta">Bài đọc · <span class="num">12 phút</span> · ${diff(1)} · Cấp 0</div><h1>Cache: giữ bản sao gần tay</h1>
        <h2>Bước 2: phân tích</h2><p>Đặt một cache trước cơ sở dữ liệu với tỉ lệ trúng 90%:</p><ul><li><strong>9.000</strong> lượt đọc mỗi giây được cache trả lời.</li><li>Chỉ <strong>1.000</strong> lượt mỗi giây (10%) đi xuống cơ sở dữ liệu.</li></ul>
        ${fig}
        <p>Tỉ lệ trúng 99% thì chỉ còn 100 lượt mỗi giây xuống cơ sở dữ liệu. Mỗi “số 9” thêm vào giảm tải cho cơ sở dữ liệu đi mười lần.</p>
        <div class="mis"><b>Hiểu lầm thường gặp (M3):</b> “Thêm cache thì chỉ có lợi.” Cache có thể trả dữ liệu cũ, và khi nó sập thì toàn bộ lượt đọc dội thẳng vào cơ sở dữ liệu cùng lúc.</div>
        <div class="nextbar"><button class="btn">${ic("undo", 14)} Bước 1 · quan sát</button><button class="btn pri lg">Bước 3 · áp dụng ${ic("chevr", 14)}</button></div></article>
      <aside class="aside"><div class="box"><h4>Thuật ngữ trong bước này</h4><ul><li><b>Cache hit</b>: dữ liệu có sẵn trong cache.</li><li><b>Cache miss</b>: không có, phải lấy từ nguồn.</li><li><b>Hit ratio</b>: số lần trúng ÷ tổng số lần tra.</li></ul></div></aside></div>`;
  }
  function challengeDetail() {
    const c = allCh[0];
    const start = { id: "users", kind: "client", label: "Người dùng", replicas: 1, cost: 0, sub: "3.000 yêu cầu/giây", run: { state: "normal", load: null, line: "" } };
    return `<div class="chal"><div><div class="meta"><a href="#" style="color:var(--text-3)">Thử thách</a> / Cấp 0 · ${readyPill(c.ready)}</div><h1>${c.title}</h1>
      <p class="lead">Một tiệm bánh gia đình sắp mở cửa hàng trực tuyến. Giờ trưa, mỗi giây có khoảng 3.000 yêu cầu: khách xem bánh và một số người đặt hàng. Đơn hàng phải được lưu lại.</p>
      <h3 style="margin:0;font-size:16px">Mục tiêu ở mọi chế độ</h3><div class="goals2">${c.goals.map((g) => `<div>${fmtGoal(g)}</div>`).join("")}<div>Chi phí <b>≤ ngân sách</b></div></div>
      <h3 style="margin:0 0 10px;font-size:16px">Chọn chế độ</h3><div class="modes">
        <div class="mode sel"><b>Tiêu chuẩn</b><div class="bud">300 $<span style="font-size:12px;color:var(--text-3)">/tháng</span></div><small>Một buổi trưa bình thường.</small></div>
        <div class="mode"><b>Ngân sách chặt</b><div class="bud">210 $<span style="font-size:12px;color:var(--text-3)">/tháng</span></div><small>Cùng buổi trưa, chủ tiệm chi ít hơn.</small></div>
        <div class="mode"><b>Hỗn loạn</b><div class="bud">500 $<span style="font-size:12px;color:var(--text-3)">/tháng</span></div><small>Máy web chết ở giây 3, primary CSDL chết ở giây 6.</small></div></div>
      <div class="hints" style="margin-top:20px"><h3 style="margin:0;font-size:16px">Gợi ý <span style="font-weight:400;color:var(--text-3);font-size:13px">· mở khi cần</span></h3>
        <details open><summary>Gợi ý 1</summary>Tính xem một máy web và một cơ sở dữ liệu mỗi thứ chịu được bao nhiêu yêu cầu mỗi giây, rồi so với 3.000.</details><details><summary>Gợi ý 2</summary></details><details><summary>Gợi ý 3</summary></details></div></div>
      <aside class="rail"><div class="startcv"><div class="cvz">${SDNodes.render("a", start, "editing", { locked: true })}</div><div class="ft"><div class="meta" style="margin-bottom:6px">Bắt đầu với: Người dùng (đã khoá) · tối đa 5 thành phần, 8 máy</div><b style="font-size:13px">Thành phần được dùng</b>
        <div class="allowed">${c.kinds.map((k) => `<span style="--k:${A.cat(k)}"><i>${SDArt.svg(k, 20, 15)}</i>${SDData.kinds[k].label}</span>`).join("")}</div></div></div>
        <button class="btn pri lg" style="width:100%;justify-content:center">${ic("play", 14)} Vào thử thách · Tiêu chuẩn</button><div class="meta" style="justify-content:center">Lần thử được lưu trên máy của bạn</div></aside></div>`;
  }

  function draw(s) {
    const site = document.getElementById("site");
    const m = s.mode;
    const navCur = m.startsWith("learn") ? "Học" : "Thử thách";
    let body;
    if (m === "learn") body = s.option === "a" ? learnA() : s.option === "b" ? learnB() : learnC();
    else if (m === "chal") body = s.option === "a" ? chalA() : s.option === "b" ? chalB() : chalC();
    else if (m === "learn-detail") body = lessonDetail();
    else body = challengeDetail();
    site.innerHTML = topbar(navCur) + `<div class="page"><div class="wrap">${body}</div></div>`;
  }
  Demo.init({
    id: "11", title: "11 · Trang Học và Thử thách", modeLabel: "Trang",
    modes: [{ id: "learn", label: "Học" }, { id: "learn-detail", label: "Một bài" }, { id: "chal", label: "Thử thách" }, { id: "chal-detail", label: "Một đề" }],
    options: [
      { id: "a", name: "Lộ trình", recommended: true,
        summary: "Bảy cấp 0→100 điểm xếp thành dải trên cùng; trong cấp hiện tại, bài học là các trạm trên một đường đi (xong / đang học / chưa), thử thách là cột mốc cờ chen giữa. Bên phải luôn có \"Tiếp tục\" và mục tiêu của cấp.",
        pros: ["Đúng với chương trình học 0→100 đã soạn: thấy mình đang ở đâu và còn bao xa", "Một nút \"Tiếp tục\" rõ ràng", "Thử thách gắn vào đúng chỗ trên lộ trình"],
        cons: ["Tìm một bài bất kỳ khó hơn (có nút xem dạng danh sách)", "Dài khi một cấp có 20+ bài"] },
      { id: "b", name: "Danh sách + xem trước",
        summary: "Bộ lọc ở trên, danh sách bài bên trái, bên phải xem trước bài đang chọn: khái niệm, thành phần dùng trong Lab, trạng thái. Cấu trúc quen thuộc như Syscraft nhưng gọn và không lặp nhãn.",
        pros: ["Tìm và lọc nhanh", "Xem trước đủ thông tin trước khi mở"],
        cons: ["Không cảm nhận được tiến trình 0→100", "Giống trang của đối thủ"] },
      { id: "c", name: "Lưới thẻ có minh hoạ",
        summary: "Mỗi bài/thử thách là một thẻ có dải hình vẽ các thành phần được dùng, cùng thời lượng và độ khó.",
        pros: ["Đẹp, tận dụng bộ hình vẽ riêng", "Nhìn là biết bài nói về thành phần gì"],
        cons: ["Bài đọc không dùng Lab thì không có gì để vẽ", "Thứ tự học kém rõ"] },
    ],
    onChange: draw,
  });
})();
