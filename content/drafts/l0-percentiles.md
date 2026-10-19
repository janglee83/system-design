---
id: l0-percentiles
level: L0
format: experiment
minutes: 15
difficulty: 2
prerequisites: [l0-queueing-and-utilization]
research: [content/research/percentiles-and-tail-latency.md]
engine_readiness: ready-1a
engine_gaps: []
status: draft
---

# Experiment spec (shared)

In steady state the 1a model gives every request the same latency (p50 = p95 = p99), so a tail
needs time-varying load: a 400 ms burst at 2× traffic. The engine has no mean metric; the lesson
discusses averages in words. Expected values from our scratch 1a model.

```json
{
  "world": { "durationMs": 10000, "seed": 1 },
  "workload": { "profile": "mixed", "baseRps": 6000, "writeRatio": 0.2,
                "surge": { "factor": 2, "atMs": 4000, "durationMs": 400 } },
  "graph": { "nodes": [{"id":"users","kind":"client"},{"id":"web","kind":"web-server","config":{"cpu":1,"memoryGb":2}}],
             "edges": [{"id":"e1","from":"users","to":"web","kind":"http"}] },
  "controls": [
    { "id": "cpu", "type": "stepper", "maps": "nodes.web.config.cpu", "options": [1, 2], "default": 1 },
    { "id": "memoryGb", "type": "stepper", "maps": "nodes.web.config.memoryGb", "options": [2, 8], "default": 2 }
  ],
  "prediction": { "question": "Which number will move the most after the burst: p50, p95 or p99?", "answer": "p99" },
  "goals": [
    { "id": "typical", "metric": "p50", "op": "<=", "value": 10 },
    { "id": "unlucky", "metric": "p99", "op": "<=", "value": 50 }
  ],
  "choices": [
    { "id": "A", "correct": true, "set": {"cpu": 2, "memoryGb": 2}, "expect": {"p50": "≈3.5 ms", "p95": "≈6.5 ms", "p99": "≈6.5 ms"} },
    { "id": "B", "misconception": "M1", "set": {"cpu": 1, "memoryGb": 2}, "expect": {"p50": "≈6.5 ms", "p95": "≈104 ms", "p99": "≈157 ms"}, "failsGoals": ["unlucky"] },
    { "id": "C", "misconception": "M3", "set": {"cpu": 1, "memoryGb": 8}, "expect": {"p50": "≈6.5 ms", "p99": "≈157 ms"}, "failsGoals": ["unlucky"] }
  ]
}
```

---

# Tiếng Việt

## p50, p95, p99: đo độ chậm cho người kém may mắn

### Mục tiêu
Đọc được p50, p95, p99 của một lần chạy, chỉ ra khi nào "con số điển hình" che mất người dùng chậm,
và chọn cấu hình để 99% yêu cầu dưới 50 ms dù có một đợt dồn ngắn.

### Cần học trước
`l0-queueing-and-utilization`

### Hình dung trước
Tuyến xe buýt số 8 "trung bình trễ 3 phút". Nhưng sáng thứ Hai trời mưa, chuyến 7 giờ trễ 40 phút.
Người đi làm không nhớ con số trung bình; họ nhớ buổi sáng thứ Hai đó. Với một trang web có một
triệu lượt truy cập mỗi ngày, "1% chậm" là mười nghìn lượt.

### Thuật ngữ
- **Percentile** (bách phân vị): xếp mọi yêu cầu từ nhanh đến chậm. **p50** (trung vị): một nửa
  nhanh hơn số này. **p95**: 95% nhanh hơn, 5% chậm hơn. **p99**: chỉ 1 trên 100 yêu cầu chậm hơn.
- **Tail latency** (độ trễ phần đuôi): độ trễ của những yêu cầu chậm nhất (p95, p99 trở lên).
- **Average / mean** (trung bình cộng): tổng thời gian chia số yêu cầu. Nó bị kéo bởi số đông nên
  dễ che phần đuôi.
- **Burst** (đợt dồn): một khoảng ngắn lưu lượng tăng vọt.
- **SLI / SLO** (chỉ số / mục tiêu mức dịch vụ): SLI là thứ đo (ví dụ p99); SLO là mục tiêu
  (p99 ≤ 300 ms).

### Hiểu lầm thường gặp
- **M1.** "p50 tốt thì hệ thống tốt." p50 chỉ nói về người ở giữa.
- **M2.** "1% chậm là vài người xui, kệ họ." Ở quy mô lớn đó là rất nhiều người, và một trang gọi
  nhiều dịch vụ sẽ gặp phần đuôi thường xuyên (thảo luận bằng ví dụ số; không có lựa chọn riêng).
- **M3.** "Thêm RAM sẽ hấp thụ đợt dồn." RAM cho hàng chờ dài hơn, không làm hàng chạy nhanh hơn.

### Thí nghiệm
**Bối cảnh:** 6.000 yêu cầu/giây; ở giây thứ 4, lưu lượng gấp đôi trong 0,4 giây. Máy 1 vCPU, 2 GB.
Bạn chỉnh số vCPU (1, 2) và RAM (2, 8 GB).

**Dự đoán:** Sau đợt dồn, con số nào nhảy nhiều nhất: p50, p95 hay p99?

**Mục tiêu:** `p50 ≤ 10 ms` và `p99 ≤ 50 ms`.

| Lựa chọn | vCPU | RAM | p50 | p95 | p99 | Kết quả |
|---|---|---|---|---|---|---|
| A (đúng) | 2 | 2 GB | khoảng 3,5 ms | khoảng 6,5 ms | khoảng 6,5 ms | đạt |
| B | 1 | 2 GB | khoảng 6,5 ms ✓ | khoảng 104 ms | khoảng 157 ms ✗ | trượt p99 |
| C | 1 | 8 GB | khoảng 6,5 ms ✓ | — | khoảng 157 ms ✗ | trượt p99 |

Kéo thanh thời gian ở lựa chọn B đến giây 4–5: hàng đợi phình lên trong lúc dồn và cần gần nửa
giây nữa để xả hết. Những yêu cầu đến trong khoảng đó chính là phần đuôi.

### Phản hồi cho lựa chọn sai
- **B:** Nhìn p50 thì mọi thứ ổn, vì hơn 90% thời gian máy chạy êm. Nhưng trong đợt dồn, 1 vCPU
  nhận 12.000 yêu cầu/giây trong khi chỉ xử lý được 9.000; hàng đợi dài ra và vài phần trăm yêu cầu
  phải chờ hơn 100 ms. Nếu chỉ đặt mục tiêu theo p50, bạn sẽ không bao giờ thấy họ.
- **C:** RAM không phải chỗ nghẽn: hàng đợi chưa bao giờ đầy. Vấn đề là tốc độ xả hàng. Thêm vCPU
  mới làm hàng chạy nhanh hơn.

### Điều cần nhớ
- Đặt mục tiêu theo phần đuôi (p95, p99), không theo trung bình hay trung vị.
- Những đợt dồn ngắn tạo ra phần đuôi mà con số trung bình không thấy.
- Sửa phần đuôi thường là thêm tốc độ xử lý hoặc dự phòng, không phải thêm chỗ chờ.

### Câu hỏi ôn tập
1. p95 = 200 ms nghĩa là gì? *(95% yêu cầu nhanh hơn 200 ms; 5% chậm hơn.)*
2. Một trang gọi song song 100 dịch vụ, mỗi dịch vụ chậm 1% thời gian. Khoảng bao nhiêu lượt tải
   trang gặp ít nhất một dịch vụ chậm? *(1 − 0,99^100 ≈ 63%.)*
3. Vì sao trung bình có thể đẹp trong khi người dùng phàn nàn? *(Số đông nhanh kéo trung bình xuống,
   che những yêu cầu rất chậm.)*

---

# English

## p50, p95, p99: measuring slowness for the unlucky

### Outcome
Read p50, p95 and p99 from a run, show when the "typical" number hides slow users, and choose a
configuration that keeps 99% of requests under 50 ms through a short burst.

### Prerequisites
`l0-queueing-and-utilization`

### Picture it first
Bus line 8 is "3 minutes late on average". But on rainy Monday mornings the 7:00 bus is 40 minutes
late. Commuters do not remember the average; they remember that Monday. For a site with a million
visits a day, "1% slow" is ten thousand visits.

### Terms
- **Percentile**: sort all requests from fastest to slowest. **p50** (median): half are faster than
  this. **p95**: 95% faster, 5% slower. **p99**: only 1 in 100 is slower.
- **Tail latency**: the latency of the slowest requests (p95, p99 and beyond).
- **Average / mean**: total time divided by number of requests. The fast majority pulls it down,
  so it easily hides the tail.
- **Burst**: a short spike in traffic.
- **SLI / SLO** (service level indicator / objective): the SLI is what you measure (e.g. p99); the
  SLO is the target (p99 ≤ 300 ms).

### Misconceptions
- **M1.** "If p50 is good, the system is good." p50 only describes the middle user.
- **M2.** "The slowest 1% are a few unlucky people; ignore them." At scale that is many people, and a
  page calling many services hits the tail constantly (discussed with numbers; no separate choice).
- **M3.** "More memory will absorb the burst." Memory lengthens the line; it does not move it faster.

### Experiment
**Setup:** 6,000 requests/s; at 4 s traffic doubles for 0.4 s. One 1-vCPU, 2 GB server. Controls:
vCPUs (1, 2) and memory (2, 8 GB).

**Predict:** After the burst, which number jumps most: p50, p95 or p99?

**Goals:** `p50 ≤ 10 ms` and `p99 ≤ 50 ms`.

| Choice | vCPU | Memory | p50 | p95 | p99 | Result |
|---|---|---|---|---|---|---|
| A (correct) | 2 | 2 GB | about 3.5 ms | about 6.5 ms | about 6.5 ms | pass |
| B | 1 | 2 GB | about 6.5 ms ✓ | about 104 ms | about 157 ms ✗ | fails p99 |
| C | 1 | 8 GB | about 6.5 ms ✓ | — | about 157 ms ✗ | fails p99 |

Scrub choice B to 4–5 s: the queue swells during the burst and needs almost half a second more to
drain. Requests arriving in that window are the tail.

### Feedback for wrong choices
- **B:** p50 looks fine because for over 90% of the run the server is calm. During the burst, one
  vCPU receives 12,000 requests/s but finishes 9,000; the queue grows and a few percent of requests
  wait over 100 ms. With a goal on p50 only, you would never see them.
- **C:** Memory was not the bottleneck: the queue never filled. The problem is how fast it drains.
  Only more vCPU makes the line move faster.

### Takeaways
- Set goals on the tail (p95, p99), not on the average or median.
- Short bursts create tails that averages do not show.
- Fixing the tail usually means more processing speed or headroom, not more waiting room.

### Review questions
1. What does p95 = 200 ms mean? *(95% of requests are faster than 200 ms; 5% slower.)*
2. A page calls 100 services in parallel; each is slow 1% of the time. About what share of page
   loads hit at least one slow call? *(1 − 0.99^100 ≈ 63%.)*
3. Why can the average look good while users complain? *(The fast majority pulls the average down and
   hides very slow requests.)*
