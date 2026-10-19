---
id: l0-single-point-of-failure
level: L0
format: experiment
minutes: 18
difficulty: 2
prerequisites: [l0-database-basics]
research: [content/research/availability-and-spof.md]
engine_readiness: ready-1a
engine_gaps: []
status: draft
---

# Experiment spec (shared)

Two copies of the web server are set with `replicas: 2` on the web node, reached directly by the
client. The lesson says plainly that "something splits traffic between the copies; L1 shows what".
Faults: `instance-down` on web at 3 s and `db-primary-down` on pg at 6 s. Promotion takes
`pgFailoverMs` (600 ms default). Expected values from our scratch 1a model.

```json
{
  "world": { "durationMs": 10000, "seed": 1 },
  "workload": { "profile": "mixed", "baseRps": 2000, "writeRatio": 0.2 },
  "graph": { "nodes": [{"id":"users","kind":"client"},
                       {"id":"web","kind":"web-server","replicas":1,"config":{"cpu":2}},
                       {"id":"pg","kind":"postgres","config":{"readReplicas":0}}],
             "edges": [{"id":"e1","from":"users","to":"web","kind":"http"},
                       {"id":"e2","from":"web","to":"pg","kind":"db"}] },
  "faults": [ {"kind":"instance-down","target":"web","atMs":3000}, {"kind":"db-primary-down","target":"pg","atMs":6000} ],
  "controls": [
    { "id": "webCopies", "type": "stepper", "maps": "nodes.web.replicas", "options": [1, 2], "default": 1 },
    { "id": "webCpu", "type": "select", "maps": "nodes.web.config.cpu", "options": [2, 8], "default": 2 },
    { "id": "dbReplicas", "type": "stepper", "maps": "nodes.pg.config.readReplicas", "options": [0, 1], "default": 0 }
  ],
  "goals": [
    { "id": "up", "metric": "availability", "op": ">=", "value": 0.95 },
    { "id": "no-spof", "metric": "spofCount", "op": "==", "value": 0 }
  ],
  "choices": [
    { "id": "A", "correct": true, "set": {"webCopies": 2, "webCpu": 2, "dbReplicas": 1}, "expect": {"availability": 0.988, "spofCount": 0, "events": ["instance.down", "db.primary-down", "db.promoted"]} },
    { "id": "B", "misconception": "M1", "set": {"webCopies": 1, "webCpu": 8, "dbReplicas": 0}, "expect": {"availability": 0.30, "spofCount": 2}, "failsGoals": ["up", "no-spof"] },
    { "id": "C", "misconception": "M2", "set": {"webCopies": 2, "webCpu": 2, "dbReplicas": 0}, "expect": {"availability": 0.60, "spofCount": 1, "events": ["db.no-replica"]}, "failsGoals": ["up", "no-spof"] },
    { "id": "D", "misconception": "M2", "set": {"webCopies": 1, "webCpu": 2, "dbReplicas": 1}, "expect": {"availability": 0.30, "spofCount": 1}, "failsGoals": ["up", "no-spof"] }
  ]
}
```

---

# Tiếng Việt

## Điểm lỗi đơn: khi một mắt xích đứt

### Mục tiêu
Tìm mọi điểm lỗi đơn trong một hệ thống nhỏ và loại bỏ chúng để hệ thống vẫn phục vụ được hơn 95%
yêu cầu khi một máy web và primary của cơ sở dữ liệu lần lượt hỏng.

### Cần học trước
`l0-database-basics`

### Hình dung trước
Một chiếc xe đạp có hai bánh, mỗi bánh chỉ có một. Thủng bất kỳ bánh nào là xe dừng. Mang theo một
săm dự phòng cho bánh trước mà không có cho bánh sau thì vẫn dừng nếu bánh sau thủng. Và một chiếc
xe đạp "xịn" hơn vẫn có thể thủng săm.

### Thuật ngữ
- **Single point of failure, SPOF** (điểm lỗi đơn): một thành phần mà chỉ riêng nó hỏng cũng đủ làm
  cả hệ thống ngừng.
- **Redundancy** (dự phòng): có hơn một bản của một thành phần, để bản này hỏng thì bản kia làm.
- **Replica** (bản sao): một bản giống hệt. Với máy chủ web, đó là một máy nữa chạy cùng chương
  trình. Với cơ sở dữ liệu, **read replica** (bản sao chỉ đọc) là một máy cơ sở dữ liệu nhận bản sao
  dữ liệu từ **primary** (bản chính, nơi nhận ghi).
- **Failover** (chuyển đổi dự phòng): khi primary hỏng, một bản sao được **promote** (nâng cấp) lên
  làm primary. Việc này mất một chút thời gian (ở đây khoảng 0,6 giây), trong lúc đó các thao tác
  ghi thất bại.
- **spofCount**: số thành phần chỉ có đúng một bản trong lần chạy.

### Hiểu lầm thường gặp
- **M1.** "Một máy thật mạnh thì không hỏng." Kích thước không chống được hỏng hóc.
- **M2.** "Thêm dự phòng ở một chỗ là cả hệ thống đã dự phòng." Chỉ cần còn một điểm lỗi đơn, nó vẫn
  kéo cả hệ thống xuống.
- **M3.** "Có bản sao lưu (backup) là đủ sẵn sàng." Backup giữ dữ liệu, không giữ dịch vụ chạy trong
  lúc khôi phục (thảo luận; không có lựa chọn riêng).

### Thí nghiệm
**Bối cảnh:** Người dùng → web → PostgreSQL, 2.000 yêu cầu/giây. Ở giây thứ 3, một máy web chết. Ở
giây thứ 6, primary của cơ sở dữ liệu chết. Bạn chỉnh: số bản máy web (1, 2), vCPU mỗi máy web (2, 8),
số bản sao cơ sở dữ liệu (0, 1). Tạm thời coi như có "ai đó" chia yêu cầu giữa hai máy web; bài L1
sẽ cho bạn thấy đó là bộ cân bằng tải.

**Dự đoán:** Nếu chỉ thêm bản sao cho máy web, tỉ lệ sẵn sàng sẽ khoảng bao nhiêu?

**Mục tiêu:** `availability ≥ 95%` và `spofCount = 0`.

| Lựa chọn | Máy web | vCPU | Bản sao CSDL | Sẵn sàng | spofCount |
|---|---|---|---|---|---|
| A (đúng) | 2 | 2 | 1 | khoảng 98,8% | 0 |
| B | 1 | 8 | 0 | khoảng 30% ✗ | 2 |
| C | 2 | 2 | 0 | khoảng 60% ✗ | 1 |
| D | 1 | 2 | 1 | khoảng 30% ✗ | 1 |

Ở lựa chọn A, mở tab **Events**: `instance.down` lúc 3 s, `db.primary-down` lúc 6 s, `db.promoted`
lúc 6,6 s. Khoảng 1,2% yêu cầu thất bại nằm gọn trong 0,6 giây chờ nâng cấp.

### Phản hồi cho lựa chọn sai
- **B:** 8 vCPU không ngăn máy chết. Khi máy web duy nhất tắt lúc 3 s, không còn ai trả lời; 70% thời
  gian còn lại là mất trắng. Và cơ sở dữ liệu vẫn chỉ có một bản.
- **C:** Tầng web đã an toàn: mất một máy, máy kia gánh tiếp. Nhưng lúc 6 s cơ sở dữ liệu duy nhất
  chết và không có bản nào thay (`db.no-replica`). Điểm lỗi đơn cuối cùng vẫn đánh sập hệ thống.
- **D:** Lần này cơ sở dữ liệu có bản sao, nhưng máy web duy nhất chết lúc 3 s nên chẳng yêu cầu nào
  tới được cơ sở dữ liệu nữa. Phải dự phòng ở **mọi** mắt xích.

### Điều cần nhớ
- Hệ thống chỉ khỏe bằng mắt xích yếu nhất không có dự phòng.
- Dự phòng cần hai thứ: bản thứ hai và cách chuyển sang nó.
- Chuyển đổi dự phòng không tức thời; luôn có một khoảng ngắn bị lỗi.

### Câu hỏi ôn tập
1. Định nghĩa điểm lỗi đơn bằng lời của bạn.
2. Vì sao trong lựa chọn C tỉ lệ sẵn sàng là khoảng 60%? *(Cơ sở dữ liệu chết lúc 6 s, không có bản
   thay, nên 4 giây cuối mất trắng.)*
3. Trong lúc chờ promote bản sao, loại yêu cầu nào thất bại? *(Các yêu cầu ghi.)*
4. Một hệ thống có LB, 3 máy web và 1 cơ sở dữ liệu không bản sao. spofCount ít nhất là bao nhiêu?
   *(Ít nhất 2 nếu LB chỉ có một bản: LB và cơ sở dữ liệu.)*

---

# English

## Single points of failure: when one link breaks

### Outcome
Find every single point of failure in a small system and remove them so it still serves more than
95% of requests while a web server and then the database primary fail.

### Prerequisites
`l0-database-basics`

### Picture it first
A bicycle has two wheels, one of each. A puncture in either stops the ride. Carrying a spare tube for
the front wheel only still leaves you stranded when the back wheel goes. And a fancier bicycle can
still get a puncture.

### Terms
- **Single point of failure (SPOF)**: a component whose failure alone stops the whole system.
- **Redundancy**: more than one copy of a component, so another takes over when one fails.
- **Replica**: an identical copy. For web servers, another machine running the same program. For
  databases, a **read replica** is a database machine that receives a copy of the data from the
  **primary** (the main copy that accepts writes).
- **Failover**: when the primary dies, a replica is **promoted** to primary. It takes a moment (about
  0.6 s here) during which writes fail.
- **spofCount**: how many components in the run have exactly one copy.

### Misconceptions
- **M1.** "A really powerful machine won't fail." Size does not prevent failure.
- **M2.** "Adding redundancy in one place makes the whole system redundant." Any remaining SPOF still
  takes everything down.
- **M3.** "Having backups means we are highly available." Backups keep data, not the service running
  while you restore (discussed; no separate choice).

### Experiment
**Setup:** users → web → PostgreSQL, 2,000 requests/s. At 3 s one web server dies. At 6 s the
database primary dies. Controls: web copies (1, 2), vCPUs per web server (2, 8), database replicas
(0, 1). For now, assume "something" splits requests between two web copies; L1 shows it is a load
balancer.

**Predict:** If you only add a second web copy, roughly what availability will you get?

**Goals:** `availability ≥ 95%` and `spofCount = 0`.

| Choice | Web copies | vCPU | DB replicas | Availability | spofCount |
|---|---|---|---|---|---|
| A (correct) | 2 | 2 | 1 | about 98.8% | 0 |
| B | 1 | 8 | 0 | about 30% ✗ | 2 |
| C | 2 | 2 | 0 | about 60% ✗ | 1 |
| D | 1 | 2 | 1 | about 30% ✗ | 1 |

On choice A, open **Events**: `instance.down` at 3 s, `db.primary-down` at 6 s, `db.promoted` at
6.6 s. The roughly 1.2% of failed requests fit inside the 0.6 s promotion window.

### Feedback for wrong choices
- **B:** 8 vCPUs do not stop a machine from dying. When the only web server goes at 3 s, nobody
  answers; the remaining 70% of the run is lost. And the database still has one copy.
- **C:** The web tier is safe: lose one, the other carries on. But at 6 s the only database dies with
  no replacement (`db.no-replica`). The last single point of failure still brings the system down.
- **D:** This time the database has a replica, but the only web server dies at 3 s, so no request
  reaches the database any more. Every link needs redundancy.

### Takeaways
- A system is only as strong as its weakest link without a spare.
- Redundancy needs two things: a second copy and a way to switch to it.
- Failover is not instant; expect a short window of errors.

### Review questions
1. Define a single point of failure in your own words.
2. Why is choice C about 60% available? *(The database dies at 6 s with no replacement, so the last
   4 seconds are lost.)*
3. While a replica is being promoted, which requests fail? *(Writes.)*
4. A system has one LB, 3 web servers and 1 database with no replica. What is the smallest possible
   spofCount? *(At least 2 if the LB has one copy: the LB and the database.)*
