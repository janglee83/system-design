/* Demo data. Kinds, labels and prices come from the engine (crates/sim-core) and messages/vi.json:
   web server $22.5 first vCPU + $27.5 each extra, 9,000 rps per vCPU; load balancer $25 per node,
   60,000 rps per node; PostgreSQL $180 per instance, 5,000 qps each. Run numbers are a worked
   example for a 12,000 rps mixed workload, rounded for display. */
window.SDData = {
  kinds: {
    client: { label: "Người dùng", cat: "Chung", desc: "Nơi yêu cầu xuất phát." },
    lb: { label: "Cân bằng tải", cat: "Chung", desc: "Chia yêu cầu cho các máy phía sau." },
    "web-server": { label: "Máy chủ web", cat: "Tính toán", desc: "Chạy mã ứng dụng, trả lời HTTP." },
    postgres: { label: "PostgreSQL", cat: "Dữ liệu", desc: "Cơ sở dữ liệu quan hệ." },
  },
  // col/row place nodes; run = what the engine reports in the running view.
  design: {
    name: "Cửa hàng trực tuyến",
    nodes: [
      { id: "client-1", kind: "client", label: "Người dùng 1", col: 0, row: 1, replicas: 1, cost: 0, sub: "12.000 yêu cầu/giây",
        run: { state: "normal", load: null, line: "Gửi 12.000/giây" } },
      { id: "lb-1", kind: "lb", label: "Cân bằng tải 1", col: 1, row: 1, replicas: 1, cost: 25, sub: "Lần lượt từng máy",
        run: { state: "normal", load: 20, line: "12.000/giây" } },
      { id: "web-1", kind: "web-server", label: "Máy chủ web 1", col: 2, row: 0, replicas: 2, cost: 45, sub: "1 vCPU · 2 GB",
        run: { state: "busy", load: 67, line: "12.000/giây" } },
      { id: "web-2", kind: "web-server", label: "Máy chủ web 2", col: 2, row: 2, replicas: 1, cost: 50, sub: "2 vCPU · 4 GB",
        run: { state: "down", load: 0, line: "Ngừng từ giây 3" } },
      { id: "pg-1", kind: "postgres", label: "PostgreSQL 1", col: 3, row: 1, replicas: 2, cost: 360, sub: "1 chính · 1 bản sao đọc",
        run: { state: "over", load: 120, line: "Từ chối 2.000/giây" } },
    ],
    edges: [
      { from: "client-1", to: "lb-1", kind: "http", rate: "12.000/s" },
      { from: "lb-1", to: "web-1", kind: "http", rate: "12.000/s" },
      { from: "lb-1", to: "web-2", kind: "http", rate: "0/s" },
      { from: "web-1", to: "pg-1", kind: "db", rate: "12.000/s" },
      { from: "web-2", to: "pg-1", kind: "db", rate: "0/s" },
    ],
  },
  stateWords: { normal: "Ổn định", busy: "Bận", over: "Quá tải", down: "Ngừng chạy" },
};
