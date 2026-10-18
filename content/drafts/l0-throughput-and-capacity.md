---
id: l0-throughput-and-capacity
level: L0
format: experiment
minutes: 15
difficulty: 1
prerequisites: [l0-client-server]
research: [content/research/throughput-and-capacity.md]
engine_readiness: ready-1a
engine_gaps: []
status: draft
---

# Experiment spec (shared)

Engine default: one web vCPU handles about 9,000 simple requests/s; each GB of memory holds 2,000
queued requests. These are game-world numbers; the lesson says so. Note for authors: in the 1a
formula an overloaded server can still show availability above 0.99, so this lesson grades on
`p95` and `requestsRejected`, not availability. Expected values are from our scratch 1a model.

```json
{
  "world": { "durationMs": 10000, "seed": 1 },
  "workload": { "profile": "mixed", "baseRps": 12000, "writeRatio": 0.2 },
  "graph": { "nodes": [{"id":"users","kind":"client"},{"id":"web","kind":"web-server","config":{"cpu":1,"memoryGb":2}}],
             "edges": [{"id":"e1","from":"users","to":"web","kind":"http"}] },
  "controls": [
    { "id": "cpu", "type": "stepper", "maps": "nodes.web.config.cpu", "options": [1, 2, 4], "default": 1 },
    { "id": "memoryGb", "type": "stepper", "maps": "nodes.web.config.memoryGb", "options": [2, 8], "default": 2 },
    { "id": "timeout", "type": "select", "maps": "workload.clientTimeoutMs", "options": [1000, 5000], "default": 1000 }
  ],
  "goals": [
    { "id": "fast", "metric": "p95", "op": "<=", "value": 50 },
    { "id": "no-drops", "metric": "requestsRejected", "op": "<=", "value": 0 }
  ],
  "choices": [
    { "id": "A", "correct": true, "set": {"cpu": 2, "memoryGb": 2, "timeout": 1000}, "expect": {"p95": "≈6.5 ms", "peakBusy": 0.67, "requestsRejected": 0} },
    { "id": "B", "misconception": "M1", "set": {"cpu": 1, "memoryGb": 8, "timeout": 1000}, "expect": {"p95": "1000 ms (timeouts)", "requestsTimedOut": ">0"}, "failsGoals": ["fast", "no-drops"] },
    { "id": "C", "misconception": "M2", "set": {"cpu": 1, "memoryGb": 2, "timeout": 5000}, "expect": {"p95": "≈485 ms", "requestsRejected": ">0"}, "failsGoals": ["fast", "no-drops"] },
    { "id": "D", "misconception": "M3", "set": {"cpu": 1, "memoryGb": 2, "timeout": 1000}, "expect": {"p95": "≈485 ms", "requestsRejected": ">0", "event": "node.overloaded"}, "failsGoals": ["fast", "no-drops"] }
  ]
}
```

---

# Tiếng Việt

## Thông lượng và sức chứa của một máy chủ

### Mục tiêu
Nhìn số yêu cầu mỗi giây và sức chứa của máy chủ, chọn được cấu hình để không yêu cầu nào bị từ
chối và p95 dưới 50 ms; giải thích vì sao thêm bộ nhớ hay chờ lâu hơn không giải quyết quá tải.

### Cần học trước
`l0-client-server`

### Hình dung trước
Một quán phở có một đầu bếp nấu được 90 tô mỗi phút. Giờ trưa có 120 khách mỗi phút. Kê thêm ghế
chờ (bộ nhớ) chỉ làm hàng chờ dài hơn; dặn khách "cứ chờ thêm" (timeout dài) cũng vậy. Chỉ có thêm
một đầu bếp, hay một đầu bếp nhanh hơn, mới ra nhiều tô hơn mỗi phút.

### Thuật ngữ
- **Throughput** (thông lượng): số việc hoàn thành mỗi giây, đo bằng **rps** (requests per second,
  số yêu cầu mỗi giây).
- **Capacity** (sức chứa): thông lượng tối đa một thành phần chịu được lâu dài.
- **vCPU** (CPU ảo): đơn vị sức xử lý thuê trên đám mây. Trong phòng thí nghiệm, 1 vCPU xử lý
  khoảng 9.000 yêu cầu đơn giản mỗi giây (con số của thế giới mô phỏng).
- **Queue** (hàng đợi): nơi yêu cầu xếp hàng khi máy chủ chưa kịp xử lý. Bộ nhớ quyết định hàng
  dài tối đa bao nhiêu.
- **Rejected** (bị từ chối): yêu cầu bị bỏ vì hàng đợi đã đầy.
- **Timeout** (hết giờ chờ): client bỏ cuộc sau một khoảng thời gian.
- **peakBusy**: lúc bận nhất, máy chủ dùng bao nhiêu phần sức (0 đến 1).

### Hiểu lầm thường gặp
- **M1.** "Thêm RAM thì máy chủ xử lý được nhiều yêu cầu hơn mỗi giây." RAM chỉ làm hàng chờ dài
  hơn.
- **M2.** "Yêu cầu chậm thì tăng thời gian chờ của client lên là xong." Không thêm chút sức xử lý
  nào.
- **M3.** "Vượt sức chứa một chút cũng không sao." Phần dư cộng dồn từng giây; hàng đợi đầy rất
  nhanh.

### Thí nghiệm
**Bối cảnh:** 12.000 yêu cầu/giây đến một máy chủ 1 vCPU, 2 GB RAM (sức chứa khoảng 9.000 rps).
Bạn chỉnh được: số vCPU (1, 2, 4), RAM (2 hoặc 8 GB), thời gian chờ của client (1 s hoặc 5 s).

**Dự đoán:** Với 1 vCPU, mỗi giây dư bao nhiêu yêu cầu? Hàng đợi 4.000 chỗ đầy sau bao lâu?
*(Dư khoảng 3.000/giây; đầy sau khoảng 1,3 giây.)*

**Mục tiêu:** `p95 ≤ 50 ms` và `requestsRejected = 0`.

| Lựa chọn | vCPU | RAM | Timeout | Kết quả dự kiến |
|---|---|---|---|---|
| A (đúng) | 2 | 2 GB | 1 s | p95 khoảng 6,5 ms, bận 67%, không bị từ chối |
| B | 1 | 8 GB | 1 s | yêu cầu chờ đến 1 s rồi hết giờ ✗ |
| C | 1 | 2 GB | 5 s | p95 khoảng 485 ms, vẫn bị từ chối ✗ |
| D | 1 | 2 GB | 1 s | p95 khoảng 485 ms, có sự kiện `node.overloaded` ✗ |

Xem dòng thời gian ở lựa chọn D: cột "queued" leo lên rồi nằm sát trần; cột "rejected" bắt đầu
xuất hiện khoảng giây thứ 1,3.

### Phản hồi cho lựa chọn sai
- **B:** RAM gấp bốn cho hàng chờ dài gấp bốn (16.000 chỗ). Máy vẫn chỉ xử lý 9.000 yêu cầu/giây,
  nên người đứng cuối hàng phải chờ hơn một giây và client bỏ cuộc. Bạn đã đổi "bị từ chối nhanh"
  thành "chờ lâu rồi thất bại".
- **C:** Chờ lâu hơn không làm bếp nấu nhanh hơn. Hàng đợi vẫn đầy và vẫn từ chối; thời gian chờ
  dài hơn chỉ giữ người dùng lâu hơn trước khi họ thất bại.
- **D:** Dư 3.000 yêu cầu mỗi giây nghe có vẻ ít, nhưng sau chưa đến hai giây hàng đợi đã đầy. Quá
  tải không "hơi chậm một chút"; nó tích lũy.

### Điều cần nhớ
- Sức chứa đến từ thứ thật sự làm việc (ở đây là CPU), không phải từ chỗ ngồi chờ (RAM).
- Khi lượng đến lớn hơn sức chứa, hàng đợi lớn dần cho đến khi đầy; sau đó là từ chối hoặc hết giờ.
- Tăng timeout che giấu vấn đề chứ không sửa vấn đề.

### Câu hỏi ôn tập
1. Thông lượng khác độ trễ thế nào? *(Bao nhiêu việc mỗi giây vs. mỗi việc chờ bao lâu.)*
2. Máy 2 vCPU trong phòng thí nghiệm chịu khoảng bao nhiêu rps? *(Khoảng 18.000.)*
3. Vì sao thêm RAM lại làm p95 tệ hơn trong lựa chọn B? *(Hàng chờ dài hơn nên mỗi người chờ lâu
   hơn.)*
4. Khi lượng đến vượt sức chứa 3.000 rps và hàng chờ có 6.000 chỗ, bao lâu thì đầy? *(Khoảng 2
   giây.)*

---

# English

## Throughput and the capacity of one server

### Outcome
Given the request rate and a server's capacity, pick a configuration with no rejected requests and
p95 under 50 ms, and explain why more memory or longer waiting does not fix overload.

### Prerequisites
`l0-client-server`

### Picture it first
A noodle shop has one cook who makes 90 bowls a minute. At lunch, 120 customers arrive a minute.
More stools for waiting (memory) only make the queue longer; telling customers "just wait longer"
(a long timeout) does the same. Only another cook, or a faster one, makes more bowls a minute.

### Terms
- **Throughput**: work finished per second, measured in **rps** (requests per second).
- **Capacity**: the most throughput a component can sustain.
- **vCPU**: a rented unit of processing power in the cloud. In the lab, 1 vCPU handles about 9,000
  simple requests per second (a game-world number).
- **Queue**: where requests wait when the server is busy. Memory decides how long the queue can get.
- **Rejected**: requests dropped because the queue is full.
- **Timeout**: the client gives up after a set time.
- **peakBusy**: at its busiest moment, the share of capacity the server used (0 to 1).

### Misconceptions
- **M1.** "More RAM lets a server handle more requests per second." It only makes the queue longer.
- **M2.** "If requests are slow, raise the client timeout." That adds no processing power.
- **M3.** "Going a little over capacity is fine." The excess adds up every second; the queue fills
  fast.

### Experiment
**Setup:** 12,000 requests per second hit one 1-vCPU, 2 GB server (capacity about 9,000 rps).
Controls: vCPUs (1, 2, 4), memory (2 or 8 GB), client timeout (1 s or 5 s).

**Predict:** With 1 vCPU, how many extra requests arrive each second, and how fast does a
4,000-slot queue fill? *(About 3,000 extra per second; full after about 1.3 s.)*

**Goals:** `p95 ≤ 50 ms` and `requestsRejected = 0`.

| Choice | vCPU | Memory | Timeout | What you should see |
|---|---|---|---|---|
| A (correct) | 2 | 2 GB | 1 s | p95 about 6.5 ms, 67% busy, nothing rejected |
| B | 1 | 8 GB | 1 s | requests wait up to 1 s and time out ✗ |
| C | 1 | 2 GB | 5 s | p95 about 485 ms, still rejecting ✗ |
| D | 1 | 2 GB | 1 s | p95 about 485 ms, a `node.overloaded` event ✗ |

Watch the timeline on choice D: "queued" climbs and sticks to the ceiling; "rejected" appears at
about 1.3 s.

### Feedback for wrong choices
- **B:** Four times the memory gives a queue four times as long (16,000 slots). The server still
  finishes only 9,000 requests a second, so people at the back wait more than a second and the client
  gives up. You traded "rejected quickly" for "waited long, then failed".
- **C:** Waiting longer does not make the kitchen faster. The queue still fills and still rejects;
  the longer timeout just keeps users hanging before they fail.
- **D:** 3,000 extra requests a second sounds small, but the queue is full in under two seconds.
  Overload is not "slightly slow"; it accumulates.

### Takeaways
- Capacity comes from what does the work (CPU here), not from waiting room (memory).
- When arrivals exceed capacity, the queue grows until full; then come rejections or timeouts.
- A longer timeout hides the problem; it does not fix it.

### Review questions
1. How do throughput and latency differ? *(How much work per second vs how long each piece waits.)*
2. About how many rps does a 2-vCPU lab server handle? *(About 18,000.)*
3. Why did extra memory make p95 worse in choice B? *(A longer queue means longer waits.)*
4. Arrivals exceed capacity by 3,000 rps and the queue has 6,000 slots. How long until it is full?
   *(About 2 seconds.)*
