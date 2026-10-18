---
id: l0-database-basics
level: L0
format: experiment
minutes: 18
difficulty: 2
prerequisites: [l0-throughput-and-capacity]
research: [content/research/databases-basics.md]
engine_readiness: ready-1a
engine_gaps: []
status: draft
---

# Experiment spec (shared)

PostgreSQL has no size setting in 1a, so "database size" uses the per-node overrides
`rpsPerInstance` and `costPerMonth` (spec §6.7). In 1a every request entering a web server with a
`db` edge also queries the database once. Expected values from our scratch 1a model.

```json
{
  "world": { "durationMs": 10000, "seed": 1 },
  "workload": { "profile": "mixed", "baseRps": 6000, "writeRatio": 0.2 },
  "graph": { "nodes": [{"id":"users","kind":"client"},
                       {"id":"web","kind":"web-server","config":{"cpu":2}},
                       {"id":"pg","kind":"postgres","config":{"readReplicas":0}}],
             "edges": [{"id":"e1","from":"users","to":"web","kind":"http"},
                       {"id":"e2","from":"web","to":"pg","kind":"db"}] },
  "locked": ["users", "web", "pg", "e1", "e2"],
  "controls": [
    { "id": "webCpu", "type": "stepper", "maps": "nodes.web.config.cpu", "options": [2, 4], "default": 2 },
    { "id": "dbSize", "type": "select", "maps": "nodes.pg.config",
      "options": { "standard": {}, "large": { "rpsPerInstance": 10000, "costPerMonth": 360 } }, "default": "standard" },
    { "id": "timeout", "type": "select", "maps": "workload.clientTimeoutMs", "options": [1000, 5000], "default": 1000 }
  ],
  "prediction": { "question": "Which box turns red first as traffic rises: web or pg?", "answer": "pg" },
  "goals": [
    { "id": "fast", "metric": "p95", "op": "<=", "value": 50 },
    { "id": "no-drops", "metric": "requestsRejected", "op": "<=", "value": 0 }
  ],
  "choices": [
    { "id": "A", "correct": true, "set": {"webCpu": 2, "dbSize": "large", "timeout": 1000}, "expect": {"p95": "≈12 ms", "costPerMonth": 405} },
    { "id": "B", "misconception": "M2", "set": {"webCpu": 4, "dbSize": "standard", "timeout": 1000}, "expect": {"p95": "≈564 ms", "requestsRejected": ">0", "event": "node.overloaded on pg"}, "failsGoals": ["fast", "no-drops"] },
    { "id": "C", "misconception": "M3", "set": {"webCpu": 2, "dbSize": "standard", "timeout": 5000}, "expect": {"p95": "≈564 ms", "requestsRejected": ">0"}, "failsGoals": ["fast", "no-drops"] }
  ]
}
```

---

# Tiếng Việt

## Cơ sở dữ liệu: nơi dữ liệu sống lâu

### Mục tiêu
Giải thích vì sao dữ liệu được giữ trong một cơ sở dữ liệu riêng thay vì trong máy chủ web, và khi
trang web chậm, chỉ ra được cơ sở dữ liệu là nút thắt rồi sửa đúng chỗ.

### Cần học trước
`l0-throughput-and-capacity`

### Hình dung trước
Một thư viện có nhiều nhân viên đứng quầy đón độc giả (máy chủ web) nhưng chỉ có một thủ thư được
vào kho sách (cơ sở dữ liệu). Mỗi yêu cầu mượn sách đều phải qua thủ thư. Thuê thêm nhân viên quầy
chỉ làm hàng trước cửa kho dài hơn. Và nếu nhân viên quầy ghi sổ mượn trên giấy nháp của riêng mình,
họ nghỉ việc là sổ mất.

### Thuật ngữ
- **Database** (cơ sở dữ liệu): một máy chủ chuyên giữ dữ liệu an toàn và tìm lại nhanh. Ở đây dùng
  **PostgreSQL** (một cơ sở dữ liệu quan hệ phổ biến).
- **Table** (bảng), **row** (dòng), **column** (cột): dữ liệu được xếp thành bảng; mỗi dòng là một
  bản ghi, mỗi cột có tên và kiểu dữ liệu.
- **Query** (truy vấn): một câu hỏi gửi tới cơ sở dữ liệu, thường viết bằng **SQL**.
- **Transaction** (giao dịch): nhóm nhiều bước thay đổi thành "tất cả hoặc không gì cả". Chuyển tiền
  thì trừ tài khoản A và cộng tài khoản B cùng thành công hoặc cùng không xảy ra.
- **Stateless web server** (máy chủ web không giữ trạng thái): máy chủ web có thể bị tắt, khởi động
  lại hoặc nhân bản bất cứ lúc nào, nên không phải nơi cất dữ liệu cần giữ lâu.
- **Bottleneck** (nút thắt cổ chai): thành phần chậm nhất quyết định tốc độ cả hệ thống.

### Hiểu lầm thường gặp
- **M1.** "Dữ liệu an toàn miễn là máy chủ web còn chạy." Máy chủ web là thứ dùng xong bỏ được; dữ
  liệu cần nơi bền vững (thảo luận; trong thí nghiệm khối cơ sở dữ liệu bị khóa cố định).
- **M2.** "Trang chậm thì mua máy chủ web mạnh hơn." Nếu cơ sở dữ liệu là nút thắt, không có gì thay
  đổi.
- **M3.** "Chờ lâu hơn một chút thì cơ sở dữ liệu sẽ kịp." Lượng đến vẫn vượt sức chứa; hàng đợi vẫn
  đầy.

### Thí nghiệm
**Bối cảnh:** Người dùng → máy chủ web (2 vCPU) → PostgreSQL. 6.000 yêu cầu/giây, mỗi yêu cầu cần một
truy vấn. Cơ sở dữ liệu cỡ "tiêu chuẩn" chịu khoảng 5.000 truy vấn/giây ($180/tháng); cỡ "lớn" chịu
khoảng 10.000 ($360/tháng). Bạn chỉnh: vCPU của máy web (2, 4), cỡ cơ sở dữ liệu, thời gian chờ của
client (1 s, 5 s).

**Dự đoán:** Khối nào chuyển đỏ trước: `web` hay `pg`?

**Mục tiêu:** `p95 ≤ 50 ms` và `requestsRejected = 0`.

| Lựa chọn | vCPU web | Cỡ CSDL | Timeout | Kết quả dự kiến |
|---|---|---|---|---|
| A (đúng) | 2 | lớn | 1 s | p95 khoảng 12 ms, không bị từ chối, $405/tháng |
| B | 4 | tiêu chuẩn | 1 s | p95 khoảng 564 ms, `pg` quá tải ✗ |
| C | 2 | tiêu chuẩn | 5 s | p95 khoảng 564 ms, vẫn bị từ chối ✗ |

Bấm vào khối `pg` ở lựa chọn B: độ bận 100%, hàng đợi đầy. Khối `web` chỉ bận khoảng 17%.

### Phản hồi cho lựa chọn sai
- **B:** Máy web vốn đã rảnh; tăng gấp đôi CPU của nó không giúp được gì vì mọi yêu cầu vẫn phải qua
  cơ sở dữ liệu, nơi chỉ xử lý được khoảng 5.000 truy vấn mỗi giây. Hãy tìm khối bận nhất trước khi
  nâng cấp bất cứ thứ gì.
- **C:** Thời gian chờ dài hơn không làm thủ thư làm nhanh hơn. Mỗi giây vẫn dư khoảng 1.000 truy vấn;
  hàng đợi vẫn đầy và vẫn từ chối.

### Điều cần nhớ
- Dữ liệu cần giữ lâu sống trong cơ sở dữ liệu, không trong máy chủ web.
- Mọi máy chủ web dùng chung một cơ sở dữ liệu, nên nó thường là nút thắt đầu tiên.
- Trước khi nâng cấp, tìm khối bận nhất; nâng cấp chỗ khác là tiêu tiền vô ích.
- Ở cấp L2 bạn sẽ có thêm công cụ: chỉ mục, bản sao chỉ đọc, cache, phân mảnh.

### Câu hỏi ôn tập
1. Giao dịch đảm bảo điều gì khi chuyển tiền? *(Trừ và cộng cùng xảy ra hoặc cùng không xảy ra.)*
2. Vì sao không nên giữ giỏ hàng trong bộ nhớ của một máy chủ web? *(Máy đó có thể bị tắt hoặc thay;
   dữ liệu sẽ mất, và máy khác không thấy.)*
3. Trong một lần chạy, `web` bận 20%, `pg` bận 100%. Nên nâng cấp gì? *(Cơ sở dữ liệu hoặc giảm tải
   cho nó.)*
4. Stack Overflow năm 2016 chạy khoảng 505 triệu truy vấn SQL cho khoảng 209 triệu yêu cầu HTTP mỗi
   ngày. Trung bình mỗi yêu cầu bao nhiêu truy vấn? *(Khoảng 2,4.)*

---

# English

## Databases: where data lives on

### Outcome
Explain why data lives in a separate database rather than in the web server, and when a site is
slow, show that the database is the bottleneck and fix the right part.

### Prerequisites
`l0-throughput-and-capacity`

### Picture it first
A library has several desk clerks greeting readers (web servers) but only one librarian allowed
into the stacks (the database). Every loan goes through the librarian. Hiring more clerks just makes
the line at the stacks longer. And if a clerk writes loans on a personal notepad, the records vanish
when that clerk quits.

### Terms
- **Database**: a server whose job is to keep data safe and find it quickly. We use **PostgreSQL**
  (a popular relational database).
- **Table**, **row**, **column**: data is arranged in tables; each row is a record, each column has a
  name and a type.
- **Query**: a question sent to the database, usually written in **SQL**.
- **Transaction**: groups several changes into "all or nothing". A transfer debits A and credits B
  together, or neither happens.
- **Stateless web server**: a web server can be stopped, restarted or copied at any time, so it is
  not the place to keep data that must last.
- **Bottleneck**: the slowest component, which sets the pace for the whole system.

### Misconceptions
- **M1.** "Data is safe as long as the web server is running." Web servers are disposable; data needs
  a durable home (discussed; the database block is locked in this experiment).
- **M2.** "If the site is slow, buy a faster web server." If the database is the bottleneck, nothing
  changes.
- **M3.** "If we wait a bit longer, the database will catch up." Arrivals still exceed capacity; the
  queue still fills.

### Experiment
**Setup:** users → web server (2 vCPU) → PostgreSQL. 6,000 requests/s, each needing one query. A
"standard" database handles about 5,000 queries/s ($180/month); "large" about 10,000 ($360/month).
Controls: web vCPUs (2, 4), database size, client timeout (1 s, 5 s).

**Predict:** Which block turns red first: `web` or `pg`?

**Goals:** `p95 ≤ 50 ms` and `requestsRejected = 0`.

| Choice | Web vCPU | DB size | Timeout | What you should see |
|---|---|---|---|---|
| A (correct) | 2 | large | 1 s | p95 about 12 ms, nothing rejected, $405/month |
| B | 4 | standard | 1 s | p95 about 564 ms, `pg` overloaded ✗ |
| C | 2 | standard | 5 s | p95 about 564 ms, still rejecting ✗ |

Click the `pg` block on choice B: 100% busy, queue full. The `web` block is only about 17% busy.

### Feedback for wrong choices
- **B:** The web server was already mostly idle; doubling its CPU changes nothing because every
  request still goes through a database that handles about 5,000 queries a second. Find the busiest
  block before upgrading anything.
- **C:** A longer wait does not make the librarian faster. About 1,000 extra queries arrive every
  second; the queue still fills and still rejects.

### Takeaways
- Data that must last lives in a database, not in the web server.
- All web servers share the database, so it is often the first bottleneck.
- Before upgrading, find the busiest block; upgrading anything else wastes money.
- L2 adds more tools: indexes, read replicas, caches, sharding.

### Review questions
1. What does a transaction guarantee in a money transfer? *(The debit and the credit both happen or
   neither does.)*
2. Why not keep a shopping cart in one web server's memory? *(That server may be stopped or
   replaced; the data is lost and other servers cannot see it.)*
3. In a run, `web` is 20% busy and `pg` is 100% busy. What do you upgrade? *(The database, or reduce
   its load.)*
4. In 2016 Stack Overflow ran about 505 million SQL queries for about 209 million HTTP requests a
   day. About how many queries per request? *(About 2.4.)*
