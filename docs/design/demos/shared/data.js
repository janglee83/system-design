/* Demo data. Kinds, labels and prices come from the engine (crates/sim-core) and messages/vi.json:
   web server $22.5 first vCPU + $27.5 each extra, 9,000 rps per vCPU; load balancer $25 per node,
   60,000 rps per node; PostgreSQL $180 per instance, 5,000 qps each. Run numbers are a worked
   example for a 12,000 rps mixed workload, rounded for display. */
window.SDData = {
  // status: ready = engine supports it today; planned = engine plan 1b; later = curriculum / parity backlog.
  // price: engine calibration for ready kinds only; planned/later kinds have no price yet.
  categories: [
    { id: "entry", label: "Lối vào", desc: "Nơi yêu cầu đến và được dẫn đường" },
    { id: "compute", label: "Tính toán", desc: "Chạy mã ứng dụng" },
    { id: "data", label: "Dữ liệu", desc: "Lưu giữ lâu dài" },
    { id: "cache", label: "Bộ nhớ đệm", desc: "Trả lời nhanh từ bộ nhớ" },
    { id: "msg", label: "Tin nhắn", desc: "Chuyển việc đi bất đồng bộ" },
    { id: "storage", label: "Lưu trữ tệp", desc: "Ảnh, video, tệp lớn" },
    { id: "external", label: "Bên ngoài", desc: "Dịch vụ không thuộc hệ thống của bạn" },
  ],
  kinds: {
    client: { label: "Người dùng", cat: "entry", status: "ready", price: 0, desc: "Nơi yêu cầu xuất phát." },
    mobile: { label: "Ứng dụng di động", cat: "entry", status: "later", desc: "Người dùng trên điện thoại, mạng chập chờn." },
    dns: { label: "DNS", cat: "entry", status: "later", desc: "Đổi tên miền thành địa chỉ máy." },
    cdn: { label: "CDN", cat: "entry", status: "planned", desc: "Phục vụ nội dung tĩnh gần người dùng." },
    "api-gateway": { label: "Cổng API", cat: "entry", status: "planned", desc: "Một cửa vào chung: xác thực, định tuyến." },
    lb: { label: "Cân bằng tải", cat: "entry", status: "ready", price: 25, desc: "Chia đều yêu cầu cho các máy phía sau." },
    "rate-limiter": { label: "Giới hạn tốc độ", cat: "entry", status: "later", desc: "Chặn bớt khi một người gửi quá nhiều." },
    "web-server": { label: "Máy chủ web", cat: "compute", status: "ready", price: 22.5, desc: "Chạy mã ứng dụng, trả lời HTTP." },
    worker: { label: "Worker nền", cat: "compute", status: "planned", desc: "Lấy việc từ hàng đợi và xử lý." },
    scheduler: { label: "Lịch chạy (cron)", cat: "compute", status: "later", desc: "Khởi động việc theo giờ đã hẹn." },
    postgres: { label: "PostgreSQL", cat: "data", status: "ready", price: 180, desc: "Cơ sở dữ liệu quan hệ." },
    "read-replica": { label: "Bản sao đọc", cat: "data", status: "later", variantOf: "postgres", desc: "Bản sao PostgreSQL gánh phần đọc." },
    "kv-store": { label: "Kho khoá–giá trị", cat: "data", status: "planned", desc: "Đọc ghi theo khoá, chia nhiều nút." },
    search: { label: "Chỉ mục tìm kiếm", cat: "data", status: "later", desc: "Tìm theo chữ, gợi ý khi gõ." },
    redis: { label: "Redis (bộ nhớ đệm)", cat: "cache", status: "planned", desc: "Bộ nhớ đệm có nhiều kiểu dữ liệu." },
    memcached: { label: "Memcached (bộ nhớ đệm)", cat: "cache", status: "planned", desc: "Bộ nhớ đệm khoá–giá trị đơn giản." },
    queue: { label: "Hàng đợi", cat: "msg", status: "planned", desc: "Giữ việc lại để worker làm dần." },
    rabbitmq: { label: "Hàng đợi kiểu RabbitMQ", cat: "msg", status: "later", desc: "Bộ định tuyến tin nhắn tới nhiều hàng." },
    stream: { label: "Luồng sự kiện kiểu Kafka", cat: "msg", status: "later", desc: "Nhật ký sự kiện chia phân vùng, đọc lại được." },
    "object-storage": { label: "Kho tệp (object storage)", cat: "storage", status: "planned", desc: "Lưu ảnh, video, bản sao lưu." },
    "third-party": { label: "API bên ngoài", cat: "external", status: "later", desc: "Thanh toán, gửi SMS… có thể chậm hoặc sập." },
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
